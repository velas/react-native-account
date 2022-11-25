import config from 'src/config'
import { storage } from 'src/helpers'
import { IAccount, IEnvironment, IKeypair, NetworkType } from 'src/typings/types'

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

export const getAccountInfo = async (address: string) => {
  try {
    const vAccount = await getVAccount(address)
    const env = config[vAccount.network] as unknown as IEnvironment
    const vAccountData = await env.agent.provider.client.getAccountData(address)

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

//TODO login by seed to diff accounts
export const getAccountsByMnemonic = async (seed: string, network: NetworkType) => {
  try {
    console.log(seed, network)
    // const { publicKey } = await generateKeysFromMnemonic(seed)

    // const accounts = await backend
    //   .accounts(publicKey, network)
    //   .then(data => data?.result?.value || [])

    // return { status: 'success', data: accounts }
    return { status: 'success' }
  } catch (_) {
    return { status: 'failed', error: _ }
  }
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
  // console.log(params, ' = params')
  console.log(account, params, ' = address')
  // const api = APIService()
  // const params: any = { page_number: pageNumber }
  // if (type) params.type = type
  // if (contract) params.contract = contract
  // if (pageSize) params.page_size = pageSize
  // if (onlyNative) params.only_native_transfers = true
  // return backend.fetchTransactions(address, params, network)
}
