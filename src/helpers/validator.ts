import * as solanaWeb3 from '@velas/web3'
import * as bip39 from 'bip39'
import Web3 from 'web3'

type ValidatorTypes = 'mnemonic' | 'addressNative' | 'addressEVM'

class Validator {
  private _isValidNativeAddress = (address: string) => {
    try {
      const key = new solanaWeb3.PublicKey(address)
      return !!key
    } catch (_) {}

    return false
  }

  private _isValidEVMAddress = (address: string) => {
    try {
      return Web3.utils.isAddress(address)
    } catch (_) {}

    return false
  }

  private _isValidMnemonic = (mnemonic: string) => {
    return /^[a-zA-Z ]*$/.test(mnemonic) && bip39.validateMnemonic(mnemonic)
  }

  validate = (type: ValidatorTypes, data: string) =>
    ({
      mnemonic: () => this._isValidMnemonic(data),
      addressEVM: () => this._isValidEVMAddress(data),
      addressNative: () => this._isValidNativeAddress(data),
    }[type] || false)
}

export default new Validator()
