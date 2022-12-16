import * as bip39 from 'bip39'
import bs58 from 'bs58'
import * as ed25519 from 'ed25519-hd-key'
import { randomBytes } from 'react-native-randombytes'
import nacl from 'tweetnacl'
import { IKeypair } from '../typings/types'

class Keys {
  private _getDeriveSeed = (seed: string) => {
    const path44Change = `m/44'/5655640'/0'/0'`

    return ed25519.derivePath(path44Change, seed).key
  }

  private _getRandomBytes = (count: number): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      return randomBytes(count, (error: string, bytes: Buffer) => {
        if (error) reject(error)
        else resolve(bytes)
      })
    })
  }

  private _generateMnemonic = async () => {
    const entropy = await this._getRandomBytes(16)
    return bip39.entropyToMnemonic(entropy)
  }

  private _generateMnemonicWithKeys = async () => {
    const mnemonic = await this._generateMnemonic()
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const seedHex = await seed.slice(0, 32).toString('hex')
    const derivedSeed = this._getDeriveSeed(seedHex)

    const keyPair = nacl.sign.keyPair.fromSeed(derivedSeed)
    const publicKey = bs58.encode(keyPair.publicKey)
    const secretKey = bs58.encode(keyPair.secretKey)

    return {
      mnemonic,
      secretKey,
      publicKey,
    }
  }

  private _generateKeysFromMnemonic = async (mnemonic: string): Promise<IKeypair> => {
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const seedHex = await seed.slice(0, 32).toString('hex')
    const derivedSeed = this._getDeriveSeed(seedHex)

    const keyPair = nacl.sign.keyPair.fromSeed(derivedSeed)
    const publicKey = bs58.encode(keyPair.publicKey)
    const secretKey = bs58.encode(keyPair.secretKey)

    return {
      secretKey,
      publicKey,
    }
  }

  private _generateEphemeralKeys = (): IKeypair => {
    const pair = nacl.sign.keyPair()

    return {
      secretKey: bs58.encode(pair.secretKey),
      publicKey: bs58.encode(pair.publicKey),
    }
  }

  generate = {
    mnemonic: this._generateMnemonic,
    mnemonicWithKeys: this._generateMnemonicWithKeys,
    keys: this._generateEphemeralKeys,
    keysFromMnemonic: this._generateKeysFromMnemonic,
  }
}

export default new Keys()
