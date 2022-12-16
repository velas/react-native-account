import { Connection } from '@velas/web3'
import Web3js from 'web3'
import config from '../config'
import { NetworkType } from '../typings/types'

class Web3 {
  getEVMInstanse = (network: NetworkType = 'mainnet'): Web3js => {
    return new Web3js(config.get(network)?.agent.provider)
  }

  getNativeConnection = (network: NetworkType = 'mainnet') => {
    return new Connection(`${config.get(network)?.node_host}/rpc`)
  }
}

export default new Web3()
