import config from 'src/config'
import { NetworkType } from 'src/typings/types'
import Web3js from 'web3'

class Web3 {
  getInstanse = (network: NetworkType = 'mainnet'): Web3js => {
    return new Web3js(config[network]?.agent.provider)
  }
}

export default new Web3()
