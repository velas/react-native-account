import latinize from 'latinize'
import DeviceInfo from 'react-native-device-info'
import config from 'src/config'
import transaction from 'src/modules/transaction'
import {
  IAccount,
  IEnvironment,
  IKeypair,
  ISponsor,
  NetworkType,
  OwnerType,
} from 'src/typings/types'

import { keys, storage } from 'src/helpers'
import { getAccountInfo, getVAccount } from './accounts'

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

      const env = config[network] as IEnvironment
      const address = await env.agent.provider.client.findAccountAddressWithPublicKey(
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
    data: {
      scopes?: []
      address: string
      agentType?: string
      account?: IAccount
      accountSecretKey?: string
      operationalKey: string
    },
    sponsor?: ISponsor
  ) => {
    let vAccount = data.account
    let secretKey = data.accountSecretKey

    if (secretKey) {
    } else {
      vAccount = data.account ?? (await getVAccount(data.address))
      if (!vAccount) return { status: 'failed', error: 'Account not found' }

      const vAccountData = await getAccountInfo(data.address)

      const vAccountHasKeys = vAccountData.data?.owner_keys?.length > 0
      if (!vAccountHasKeys) await this._initialize({ address: data.address }, sponsor)

      const vAccountOpKey = (await storage.get(
        vAccount.opKeyPublicKey,
        '-op-key'
      )) as unknown as IKeypair

      secretKey = vAccountOpKey.secretKey
    }

    const response = await transaction.send(
      vAccount as unknown as IAccount,
      'addOperationalAddressTransaction',
      {
        scopes: data.scopes,
        velas_account: data.address,
        transaction_signer: secretKey,
        agent_type: data.agentType ?? this._deviceName,
        new_operational_public_key: data.operationalKey,
      },
      sponsor
    )

    return response
  }

  private _extendScopes = async (
    data: {
      scopes: []
      opKey: string
      address: string
      agentType: string
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(data.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const vAccountOpKey = (await storage.get(
      vAccount.opKeyPublicKey,
      '-op-key'
    )) as unknown as IKeypair

    const response = await transaction.send(
      vAccount,
      'extendOperationalScopesTransaction',
      {
        op_key: data.opKey,
        scopes: data.scopes,
        account: vAccount.address,
        agent_type: data.agentType ?? this._deviceName,
        secretOperationalOrOwner: vAccountOpKey.secretKey,
      },
      sponsor
    )

    return response
  }

  private _removeAddress = async (
    data: {
      address: string
      operationalKey: string
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(data.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const vAccountData = await getAccountInfo(data.address)
    const vAccountHasKeys = vAccountData.data?.owner_keys?.length > 0
    const vAccountOpKeys = vAccountData?.data?.operational_keys || []

    const vAccountOpKey = (await storage.get(
      vAccount.opKeyPublicKey,
      '-op-key'
    )) as unknown as IKeypair

    if (!vAccountHasKeys || !vAccountOpKeys[data.operationalKey]) {
      return { status: 'success' }
    }

    const response = await transaction.send(
      vAccount,
      'removeOperationalAddressTransaction',
      {
        publicKeyOperationalToRemove: data.operationalKey,
        ownerOrOperationalToSignTx: vAccountOpKey.publicKey,
      },
      sponsor
    )

    return response
  }

  // TODO: validate params
  private _replaceMnemonic = async (
    data: {
      address: string
      old?: { mnemonic: string }
      new: { mnemonic: string; owner: OwnerType }
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(data.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const vAccountOwner = data.old?.mnemonic
      ? await keys.generate.keysFromMnemonic(data.old.mnemonic)
      : ((await storage.get(vAccount.ownerPublicKey, '-master-key')) as unknown as IKeypair)

    if (!data.old && !vAccountOwner?.secretKey)
      return { status: 'failed', error: "Can't find private key in keychain" }

    const vAccountNewOwner = await keys.generate.keysFromMnemonic(data.new.mnemonic)

    if (data.new.owner === 'keychain') {
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
      vAccount.owner = data.new.owner
      vAccount.ownerPublicKey = vAccountNewOwner.publicKey

      storage.set(vAccount.address, vAccount) // save vAccount

      if (data.new.owner === 'keychain') {
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
  }

  operational = {
    addAddress: this._addAddress,
    extendScopes: this._extendScopes,
    removeAddress: this._removeAddress,
  }

  mnemonic = {
    replace: this._replaceMnemonic,
  }
}

export default new Account()
