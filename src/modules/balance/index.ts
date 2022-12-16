import { Connection, PublicKey } from '@velas/web3'
import { getAddressBalances } from 'eth-balance-checker/lib/web3'
import config from '../../config'
import { web3Instanse } from '../../helpers'
import { NetworkType } from '../../typings/types'

class Balance {
  private _getNativeBalance = async (params: { address: string; network: NetworkType }) => {
    const connection = new Connection(config.get(params.network)?.node_host || '', 'singleGossip')
    const balance = await connection.getBalance(new PublicKey(params.address))

    return balance / 1000000000
  }

  private _getEVMTokensBalances = async (params: {
    address: string
    tokens: string[]
    network: NetworkType
  }) => {
    const web3 = web3Instanse.getEVMInstanse(params.network)

    return getAddressBalances(web3, params.address, params.tokens, {
      contractAddress: '0x243FfE78D39375A29024EE2470968dE52016e6f4',
    })
  }

  private _getEVMBalance = async (params: { address: string; network: NetworkType }) => {
    const web3 = web3Instanse.getEVMInstanse(params.network)

    const balance = await web3.eth.getBalance(params.address)
    return web3.utils.fromWei(balance, 'ether')
  }

  get = {
    evm: this._getEVMBalance,
    native: this._getNativeBalance,
    tokens: this._getEVMTokensBalances,
  }
}

export default new Balance()
