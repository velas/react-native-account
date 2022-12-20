import { decode, encode } from 'base-64'

if (!global.btoa) {
  global.btoa = encode
}

if (!global.atob) {
  global.atob = decode
}

export { getAgent, getConfig, initialize } from './config'
export { keys, storage, validator, web3Instanse } from './helpers'
export { account, auth, balance, transfer } from './modules'
