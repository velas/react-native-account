import { PublicKey } from '@velas/web3'
import fromExponential from 'from-exponential'
import config from '../../config'
import { getCSRFToken, web3Instanse } from '../../helpers'
import { account, balance } from '../../modules'
import { getVAccount } from '../../modules/account/accounts'
import { IAccount, IEnvironment, ISponsor } from '../../typings/types'

class Transfer {
  private _native = async (
    params: {
      amount: number
      toAddress: string
      vAccountInfo: any
      csrfToken: string
      vAccount: IAccount
      network: IEnvironment
    },
    sponsor?: ISponsor
  ) => {
    const feePayer = new PublicKey(params.network.account_payer_address)
    const vAccountIsInited = params.vAccountInfo.data?.owner_keys?.length > 0

    try {
      const transaction = params.network.agent.client.transfer({
        account: params.vAccount.address,
        fromAccountPubKey: params.vAccount.address,
        toPubKey: params.toAddress,
        ownerOrOprationalPubKey: vAccountIsInited
          ? params.vAccount.ownerPublicKey
          : params.vAccount.opKeySecretKey,
        lamports: params.amount,
        transactions_sponsor_pub_key: sponsor?.apiPublicKey || params.network.account_payer_address,
      })

      const connection = web3Instanse.getNativeConnection(params.vAccount.network)
      const { blockhash } = await connection.getRecentBlockhash()

      transaction.recentBlockhash = blockhash
      transaction.feePayer = feePayer

      const response = params.network.agent.provider.client.signAndBroadcastWithKey({
        csrf_token: params.csrfToken,
        account: params.vAccount.address,
        host: params.network.account_host,
        message: transaction.serializeMessage(),
        op_key: params.vAccount.opKeyPublicKey || params.vAccount.ownerPublicKey,
      })

      return { status: 'success', data: response }
    } catch (e) {
      return { status: 'error', message: e }
    }
  }

  private _evm = async (
    params: {
      address: string
      toAddress: string
      amount: number
      contract?: string
      vAccountInfo: any
      csrfToken: string
      vAccount: IAccount
      network: IEnvironment
    },
    sponsor?: ISponsor
  ) => {
    const web3 = web3Instanse.getEVMInstanse(params.vAccount.network)
    const accInfo = await params.network.agent.provider.client.getAccountData(params.address)
    const nonce = await web3.eth.getTransactionCount(accInfo?.account_key_evm)

    const transactionData: any = {
      nonce,
      broadcast: true,
      account: params.address,
      csrf_token: params.csrfToken,
      gas: web3.utils.toHex(50000),
      gasPrice: web3.utils.toHex(2000000001),
      from: accInfo?.account_key_evm,
      op_key: params.vAccount.opKeyPublicKey || params.vAccount.ownerPublicKey,
      host: params.network.account_host,
      transactions_sponsor_pub_key: sponsor?.apiPublicKey || params.network.account_payer_address,
    }

    const accountEVMbalance = await balance.get.evm({
      address: accInfo.account_key_evm,
      network: params.vAccount.network,
    })

    const fees =
      Math.ceil(((transactionData.gas * transactionData.gasPrice) / Math.pow(10, 18)) * 100000) /
      100000

    if (params.contract) {
      // @ts-ignore
      const contractWeb3 = new web3.eth.Contract(abi, contractAddress)

      const decimals = await contractWeb3.methods.decimals().call()
      const amount = fromExponential(Number(params.amount) * Math.pow(10, decimals))

      const evmBalance = await contractWeb3.methods.balanceOf(accInfo?.account_key_evm).call()

      if (Number(accountEVMbalance) < Number(fees))
        return { status: 'error', message: 'Not enough VLX funds for fee' }

      if (Number(amount) > Number(evmBalance))
        return {
          status: 'error',
          message: 'Account has no funds for the transaction',
        }

      transactionData.to = params.contract

      return contractWeb3.methods
        .transfer(params.toAddress, amount)
        .send(transactionData)
        .then((result: any) => {
          console.log(result, '= success')
          return { status: 'success', data: result }
        })
        .catch((error: any) => {
          console.log(error, ' = error!')
          return {
            status: 'error',
            message: error?.toString ? error?.toString() : error,
          }
        })
    } else {
      if (Number(params.amount) + Number(fees) > Number(accountEVMbalance))
        return {
          status: 'error',
          message: 'Account has no funds for the transaction',
        }

      transactionData.to = params.toAddress
      transactionData.value = web3.utils.toWei(params.amount + '', 'ether')
    }

    return web3.eth
      .sendTransaction(transactionData)
      .then((a) => {
        console.log(a, '= success')
        return { status: 'success', data: a }
      })
      .catch((error) => {
        console.log(error, ' = error!')
        return {
          status: 'error',
          message: error?.toString ? error?.toString() : error,
        }
      })
  }

  private _send = async (
    params: {
      amount: number
      address: string
      toAddress: string
      contract?: string
      type: 'native' | 'evm'
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(params.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const networkConfig = config.get(vAccount.network) as IEnvironment

    const csrfToken = await getCSRFToken(sponsor?.apiHost ?? networkConfig.account_host)

    const vAccountInfo = await account.get.info({
      address: params.address,
      network: vAccount.network,
    })

    if (csrfToken.error)
      return {
        status: 'error',
        error: csrfToken.error,
      }

    return params.type === 'native'
      ? this._native(
          {
            vAccount,
            vAccountInfo,
            amount: params.amount,
            network: networkConfig,
            toAddress: params.toAddress,
            csrfToken: csrfToken.token || '',
          },
          sponsor
        )
      : this._evm(
          {
            vAccount,
            vAccountInfo,
            amount: params.amount,
            network: networkConfig,
            address: params.address,
            contract: params.contract,
            toAddress: params.toAddress,
            csrfToken: csrfToken.token || '',
          },
          sponsor
        )
  }

  send = this._send
}

export default new Transfer()
