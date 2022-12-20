import latinize from 'latinize'
import DeviceInfo from 'react-native-device-info'
import { getAgent } from '../../config'
import { keys, storage } from '../../helpers'
import transaction from '../../modules/transaction'
import { IAccount, IKeypair, ISponsor, NetworkType, OwnerType } from '../../typings/types'
import {
  getAccountInfo,
  getAccountTransactions,
  getAccountsByMnemonic,
  getAllAccounts,
  getKeychainAccounts,
  getVAccount,
} from './accounts'

class Account {
  private _deviceName: string = ''

  constructor() {
    DeviceInfo.getDeviceName().then((deviceName) => (this._deviceName = latinize(deviceName)))
  }

  private _save = (account: IAccount, opKey: IKeypair) => {
    storage.set(opKey.publicKey, opKey, '-op-key') // save op key
    storage.set(account.address, account) // save account to storage

    if (account.owner === 'keychain') {
      storage.set(
        account.address,
        {
          address: account.address,
          network: account.network,
          ownerPublicKey: account.ownerPublicKey,
        },
        '-keychain'
      ) // save account to keychain
    }
  }

  private _create = async (network: NetworkType = 'mainnet') => {
    try {
      const [masterKey, opKey] = await Promise.all([keys.generate.keys(), keys.generate.keys()])

      storage.set(masterKey.publicKey, masterKey, '-master-key') // save master keys

      const agent = getAgent(network)
      const address = await agent.provider.client.findAccountAddressWithPublicKey(
        masterKey.publicKey
      )

      const account: IAccount = {
        address,
        network,
        owner: 'keychain',
        opKeyPublicKey: opKey.publicKey,
        opKeySecretKey: opKey.secretKey,
        ownerPublicKey: masterKey.publicKey,
      }

      this._import(account)

      return { status: 'success', data: account }
    } catch (_) {
      return { status: 'failed', error: _ }
    }
  }

  private _import = async (account: IAccount) => {
    this._save(account, {
      publicKey: account.opKeyPublicKey,
      secretKey: account.opKeySecretKey,
    })

    return { status: 'success', data: account }
  }

  private _initialize = async (params: { address: string }, sponsor?: ISponsor) => {
    const vAccount = await getVAccount(params.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const ownerKeys = (await storage.get(
      vAccount.ownerPublicKey,
      '-master-key'
    )) as unknown as IKeypair

    if (!ownerKeys?.secretKey)
      return { status: 'failed', error: "Can't find private key in keychain" }

    const response = await transaction.send(
      vAccount,
      'initializeTransaction',
      {
        scopes: [],
        secret: ownerKeys.secretKey,
        agent_type: this._deviceName,
        op_key: vAccount.opKeyPublicKey,
      },
      sponsor
    )

    return response
  }

  private _addAddress = async (
    params: {
      scopes?: []
      address: string
      agentType?: string
      account?: IAccount
      accountSecretKey?: string
      operationalKey: string
    },
    sponsor?: ISponsor
  ) => {
    let vAccount = params.account
    let secretKey = params.accountSecretKey

    if (secretKey) {
    } else {
      vAccount = params.account ?? (await getVAccount(params.address))
      if (!vAccount) return { status: 'failed', error: 'Account not found' }

      const vAccountData = await getAccountInfo({ address: params.address })

      const vAccountHasKeys = vAccountData.data?.owner_keys?.length > 0
      if (!vAccountHasKeys) await this._initialize({ address: params.address }, sponsor)

      secretKey = vAccount.opKeySecretKey
    }

    const response = await transaction.send(
      vAccount as unknown as IAccount,
      'addOperationalAddressTransaction',
      {
        scopes: params.scopes,
        velas_account: params.address,
        transaction_signer: secretKey,
        agent_type: params.agentType ?? this._deviceName,
        new_operational_public_key: params.operationalKey,
      },
      sponsor
    )

    return response
  }

  private _extendScopes = async (
    params: {
      scopes: []
      opKey: string
      address: string
      agentType: string
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(params.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const response = await transaction.send(
      vAccount,
      'extendOperationalScopesTransaction',
      {
        op_key: params.opKey,
        scopes: params.scopes,
        account: vAccount.address,
        agent_type: params.agentType ?? this._deviceName,
        secretOperationalOrOwner: vAccount.opKeySecretKey,
      },
      sponsor
    )

    return response
  }

  private _removeAddress = async (
    params: {
      address: string
      operationalKey: string
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(params.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const vAccountData = await getAccountInfo({ address: params.address })
    const vAccountHasKeys = vAccountData.data?.owner_keys?.length > 0
    const vAccountOpKeys = vAccountData?.data?.operational_keys || []

    if (!vAccountHasKeys || !vAccountOpKeys[params.operationalKey]) {
      return { status: 'success' }
    }

    const response = await transaction.send(
      vAccount,
      'removeOperationalAddressTransaction',
      {
        account: vAccount.address,
        publicKeyOperationalToRemove: params.operationalKey,
        ownerOrOperationalToSignTx: vAccount.opKeyPublicKey,
      },
      sponsor
    )

    return response
  }

  // TODO: validate params
  private _replaceMnemonic = async (
    params: {
      address: string
      old?: { mnemonic: string }
      new: { mnemonic: string; owner: OwnerType }
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(params.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const vAccountOwner = params.old?.mnemonic
      ? await keys.generate.keysFromMnemonic(params.old.mnemonic)
      : ((await storage.get(vAccount.ownerPublicKey, '-master-key')) as unknown as IKeypair)

    if (!params.old && !vAccountOwner?.secretKey)
      return { status: 'failed', error: "Can't find private key in keychain" }

    const vAccountNewOwner = await keys.generate.keysFromMnemonic(params.new.mnemonic)

    if (params.new.owner === 'keychain') {
      storage.set(vAccountNewOwner.publicKey, vAccountNewOwner, '-master-key') // save master key
    }

    const response = await transaction.send(
      vAccount,
      'replaceOwnerTransaction',
      {
        velas_account: vAccount.address,
        current_owner_public_key: vAccountOwner.publicKey,
        current_owner_transaction_signer: vAccountOwner.secretKey,
        new_owner_public_key: vAccountNewOwner.publicKey,
        new_owner_transaction_signer: vAccountNewOwner.secretKey,
      },
      sponsor
    )

    if (response.status === 'success') {
      vAccount.owner = params.new.owner
      vAccount.ownerPublicKey = vAccountNewOwner.publicKey

      storage.set(vAccount.address, vAccount) // save vAccount

      if (params.new.owner === 'keychain') {
        storage.set(
          vAccount.address,
          {
            address: vAccount.address,
            network: vAccount.network,
            ownerPublicKey: vAccount.ownerPublicKey,
          },
          '-keychain'
        ) // save vAccount to keychain
      }
    }

    return response
  }
  new = {
    create: this._create,
    import: this._import,
    initialize: this._initialize,
  }

  operational = {
    addAddress: this._addAddress,
    extendScopes: this._extendScopes,
    removeAddress: this._removeAddress,
  }

  mnemonic = {
    replace: this._replaceMnemonic,
  }

  get = {
    info: getAccountInfo,
    transactions: getAccountTransactions,
    accountsByMnemonic: getAccountsByMnemonic,
    accounts: (type: 'all' | 'keychain', network?: NetworkType) =>
      type === 'all' ? getAllAccounts() : getKeychainAccounts(network),
  }
}

export default new Account()
