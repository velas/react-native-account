import { Platform } from 'react-native'
import SInfo from 'react-native-sensitive-info'

const keychainService = 'velas-account'
const sharedPreferencesName = 'velas-account'

class Storage {
  private _getSharedOptions = (alias: string = '') => {
    return {
      keychainService: keychainService + alias,
      sharedPreferencesName: sharedPreferencesName + alias,
      kSecAttrSynchronizable: ['-keychain', '-master-key'].includes(alias),
    }
  }

  set = async (key: string, value: any, alias?: string) => {
    return await SInfo.setItem(key, JSON.stringify(value), this._getSharedOptions(alias))
  }

  get = async (key: string, alias?: string) => {
    return await SInfo.getItem(key, this._getSharedOptions(alias)).then((result) => {
      if (result) {
        try {
          result = JSON.parse(result)
        } catch (e) {
          return undefined
        }
      }
      return result
    })
  }

  getAll = (alias?: string) => {
    return SInfo.getAllItems(this._getSharedOptions(alias)).then((items: any) => {
      if (Platform.OS === 'android') {
        const keys = Object.keys(items)

        return keys.map((key: string) => JSON.parse(items[key]))
      }

      return items[0] ? items[0].map((a: any) => (a?.value ? JSON.parse(a.value) : {})) : []
    })
  }

  remove = async (key: string, alias?: string) => {
    return await SInfo.deleteItem(key, this._getSharedOptions(alias))
  }
}

export default new Storage()
