import { Connection } from '@velas/web3'

export interface IConfig {
  node_host: string
  velas_rates: string
  evm_explorer: string
  account_host: string
  history_host: string
  account_contract: string
  account_payer_address: string
}

export interface IAccount {
  address: string
  owner: OwnerType
  logouted?: boolean
  network: NetworkType
  opKeyPublicKey: string
  opKeySecretKey: string
  ownerPublicKey: string
}

export interface IEnvironment extends IConfig {
  agent: any
  web3Connection: Connection
}

export interface IMessageResponse {
  status: 'success' | 'failed'
  error?: any
}

export interface IKeypair {
  publicKey: string
  secretKey: string
}

export interface ISponsor {
  authParams?: any
  apiHost?: string
  apiPublicKey?: string
}

// interface IKeypair extends Keypair

export type TransactionType =
  | 'initializeTransaction'
  | 'addOperationalAddressTransaction'
  | 'extendOperationalScopesTransaction'
  | 'removeOperationalAddressTransaction'
  | 'replaceOwnerTransaction'

export type NetworkType = 'mainnet' | 'testnet' | 'devnet'
export type OwnerType = 'keychain' | 'mnemonic' | 'google' | 'apple' | 'other'
