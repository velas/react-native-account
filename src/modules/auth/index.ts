import { keys, storage } from 'src/helpers'
import account from 'src/modules/account'
import { getAccountInfo, getVAccount } from 'src/modules/account/accounts'
import { IAccount, IKeypair, ISponsor, NetworkType } from 'src/typings/types'

class Auth {
  private _loginKeychain = async (
    data: {
      address: string
      network: NetworkType
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = (await storage.get(data.address, '-keychain')) as unknown as IAccount

    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const vAccountOwner = (await storage.get(
      vAccount.ownerPublicKey,
      '-master-key'
    )) as unknown as IKeypair

    if (!vAccountOwner?.secretKey)
      return { status: 'failed', error: "Can't find private key in keychain" }

    try {
      const opKey = keys.generate.keys()
      storage.set(opKey.publicKey, opKey, '-op-key')

      const vAccountData = await getAccountInfo(data.address)

      if (vAccountData.data) {
        const response = await account.operational.addAddress(
          {
            scopes: [],
            account: vAccount,
            accountSecretKey: vAccountOwner.secretKey,
            address: data.address,
            operationalKey: opKey.publicKey,
          },
          sponsor
        )

        if (response.status === 'failed') return response
      }

      delete vAccount.logouted
      vAccount.opKeyPublicKey = opKey.publicKey
      vAccount.opKeySecretKey = opKey.secretKey

      account.new.import(vAccount)

      return { status: 'success', data: vAccount }
    } catch (error) {
      return { status: 'failed', error }
    }
  }

  private _loginByMnemonic = async (
    data: {
      address: string
      mnemonic: string
      network: NetworkType
    },
    sponsor?: ISponsor
  ) => {
    try {
      const { secretKey, publicKey } = (await keys.generate.keysFromMnemonic(
        data.mnemonic
      )) as IKeypair
      const opKey = keys.generate.keys()

      const vAccount: IAccount = {
        address: data.address,
        network: data.network,
        owner: 'mnemonic',
        ownerPublicKey: publicKey,
        opKeyPublicKey: opKey.publicKey,
        opKeySecretKey: opKey.secretKey,
      }

      storage.set(opKey.publicKey, opKey, '-op-key')

      const response = await account.operational.addAddress(
        {
          scopes: [],
          account: vAccount,
          accountSecretKey: secretKey,
          address: data.address,
          operationalKey: opKey.publicKey,
        },
        sponsor
      )

      if (response.status === 'failed') return response

      account.new.import(vAccount)

      return { status: 'success', data: vAccount }
    } catch (error) {
      return { status: 'failed', error }
    }
  }

  private _login = async (
    data: {
      address: string
      mnemonic?: string
      keychain?: boolean
      network: NetworkType
    },
    sponsor?: ISponsor
  ) => {
    const acc = (await storage.get(data.address)) as unknown as IAccount
    if (acc) {
      return { status: 'failed', error: 'You are already logged in' }
    }

    return data.keychain
      ? this._loginKeychain({ address: data.address, network: data.network }, sponsor)
      : this._loginByMnemonic(
          {
            address: data.address,
            mnemonic: data.mnemonic || '',
            network: data.network,
          },
          sponsor
        )
  }
  private _logout = async (
    data: {
      address: string
      removeFromKeychain?: boolean
    },
    sponsor?: ISponsor
  ) => {
    const vAccount = await getVAccount(data.address)
    if (!vAccount) return { status: 'failed', error: 'Account not found' }

    const response = await account.operational.removeAddress(
      {
        address: data.address,
        operationalKey: vAccount.opKeyPublicKey,
      },
      sponsor
    )

    if (response.status !== 'success') return response

    if (vAccount.owner === 'keychain') {
      if (data.removeFromKeychain) {
        storage.remove(vAccount.address)
        storage.remove(vAccount.address, '-keychain')
      } else {
        vAccount.logouted = true

        storage.set(vAccount.address, account) // save account to storage
      }
    } else {
      await storage.remove(vAccount.address)
    }

    return { status: 'success' }
  }

  login = this._login
  logout = this._logout
}

export default new Auth()
