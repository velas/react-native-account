import { Connection, PublicKey } from '@velas/web3'
import { getAddressBalances } from 'eth-balance-checker/lib/web3'
import config from 'src/config'
import { web3Instanse } from 'src/helpers'
import { NetworkType } from 'src/typings/types'

class Balance {
  private _getNativeBalance = async (address: string, network: NetworkType = 'mainnet') => {
    const connection = new Connection(config[network]?.node_host || '', 'singleGossip')
    const balance = await connection.getBalance(new PublicKey(address))

    return balance / 1000000000
  }

  private _getEVMTokensBalances = async (
    address: string,
    tokens: string[],
    network: NetworkType = 'mainnet'
  ) => {
    const web3 = web3Instanse.getInstanse(network)

    return getAddressBalances(web3, address, tokens, {
      contractAddress: '0x243FfE78D39375A29024EE2470968dE52016e6f4',
    })
  }

  private _getEVMBalance = async (address: string, network: NetworkType = 'mainnet') => {
    const web3 = web3Instanse.getInstanse(network)

    const balance = await web3.eth.getBalance(address)
    return web3.utils.fromWei(balance, 'ether')
  }

  get = {
    evm: this._getEVMBalance,
    native: this._getNativeBalance,
    tokens: this._getEVMTokensBalances,
  }
}

export default new Balance()
