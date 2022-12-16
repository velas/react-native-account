import { APIService } from '../../api'
import config from '../../config'
import { keys, storage, web3Instanse } from '../../helpers'
import { IAccount, IEnvironment, IKeypair, NetworkType } from '../../typings/types'

export const getAllAccounts = async (): Promise<IAccount[]> => {
  const accounts: Array<IAccount> = (await storage.getAll()) || []

  return accounts.filter((a) => a?.address).filter((a) => !a.logouted)
}

export const getKeychainAccounts = async (
  network: NetworkType = 'mainnet'
): Promise<IAccount[]> => {
  const accounts: Array<IAccount> = (await storage.getAll('-keychain')) || []

  return accounts.filter((a) => a?.network === network)
}

export const getVAccount = async (address: string): Promise<IAccount> => {
  return (await storage.get(address)) as unknown as IAccount
}

export const getAccountInfo = async (params: { address: string; network?: NetworkType }) => {
  try {
    const vAccount = await getVAccount(params.address)
    const env = config.get(params.network || vAccount.network) as unknown as IEnvironment
    const vAccountData = await env.agent.provider.client.getAccountData(params.address)

    const owKeys = vAccountData?.owner_keys
    if (vAccount && owKeys) {
      if (!owKeys.includes(vAccount.ownerPublicKey)) {
        const owner: any = (await storage.get(
          vAccount.ownerPublicKey,
          '-master-key'
        )) as unknown as IKeypair

        vAccount.owner = owner ? 'keychain' : 'mnemonic'
        vAccount.ownerPublicKey = owKeys[0]

        await storage.set(vAccount.address, vAccount) // save account
        if (vAccount.owner === 'keychain') {
          await storage.set(
            vAccount.address,
            {
              address: vAccount.address,
              network: vAccount.network,
              ownerPublicKey: vAccount.ownerPublicKey,
            },
            '-keychain'
          )
        }
      }
    }
    return {
      status: 'success',
      data: vAccountData?.account_key ? vAccountData : null,
    }
  } catch (_) {
    return { status: 'failed', error: _ }
  }
}

export const getAccountsByMnemonic = async (params: { mnemonic: string; network: NetworkType }) => {
  const connection = web3Instanse.getNativeConnection(params.network)

  const { publicKey } = await keys.generate.keysFromMnemonic(params.mnemonic)

  const data = await connection.getVelasAccountsByOwnerKey(publicKey)

  return { status: 'success', data }
}

export const getAccountTransactions = (
  account: {
    address: string
    network: NetworkType
  },
  params: {
    type: string
    contract: string
    pageSize: string
    pageNumber: number
    onlyNative: boolean
  }
) => {
  const api = new APIService(config.get(account.network)?.history_host || '')

  const requestParams = {
    type: params.type,
    contract: params.contract,
    page_size: params.pageSize,
    page_number: params.pageNumber,
    only_native_transfers: params.onlyNative,
  }

  return api.getTransactions(account.address, requestParams)
}
