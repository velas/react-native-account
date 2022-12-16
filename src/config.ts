import Agent from '@velas/account-agent'
import * as vWeb3 from '@velas/web3'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { APIService } from './api'
import { storage } from './helpers'
import { IConfig, IEnvironment, NetworkType } from './typings/types'

class Config {
  devnet?: IEnvironment
  testnet?: IEnvironment
  mainnet?: IEnvironment

  get = (network: NetworkType) => {
    return this[network]
  }

  init = (config: IConfig, network: NetworkType = 'mainnet') => {
    this[network] = {
      ...config,
      web3Connection: new vWeb3.Connection(`${config.node_host}/rpc`),
      agent: new Agent({
        client_host: config.node_host,
        client_account_contract: config.account_contract,
        transactions_sponsor_pub_key: config.account_payer_address,
        client_provider: vWeb3,
        broadcastTransactionHendler: (host: string, data: any) => {
          const api = new APIService(host)
          return api.request('post', '/broadcast', data)
        },
        StorageHandler: () => {},
        KeyStorageHandler: () => ({
          signWithKey: async (id: string, payload: any) => {
            const opKey: any = await storage.get(id, '-op-key')
            if (!opKey) throw Error('Cant find op key')

            try {
              const data = nacl.sign.detached(payload, new Uint8Array(bs58.decode(opKey.secretKey)))

              return data
            } catch (e) {
              console.log(e, ' - KeyStorageHandler')

              return null
            }
          },
        }),
      }),
    }
  }
}

const config = new Config()

export const init = config.init
export const getConfig = config.get

export const getAgent = (network: NetworkType = 'mainnet') => {
  return config.get(network)?.agent
}

export default {
  get: config.get,
  init: config.init,
}
