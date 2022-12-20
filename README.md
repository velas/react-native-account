## Introduction
Welcome to the Velas Account React Native SDK! This SDK allows you to easily integrate Velas Account features into your React Native app.
## Installation
To install the Velas Account React Native SDK, you will need to have a crypto modules. If you do not have a crypto modules working in React Native, follow the installation workflow in [react-native-crypto](https://github.com/tradle/react-native-crypto).


Once you have a React Native project set up with crypto modules, you can install the Velas Account React Native SDK using npm or yarn:

```sh
# using npm
npm install --save @velas/react-native-account

# using yarn
yarn add @velas/react-native-account
```

## Usage
To use the Velas Account React Native SDK in your app, you will need to import it.

```js
import * as VAcount from '@velas/react-native-account'

const config = {
    NODE_HOST: 'https://api.mainnet.velas.com',
    BACKEND_HOST: 'https://api-sponsor.mainnet.velas.com',
    ACCOUNT_CONTRACT: 'VAcccHVjpknkW5N5R9sfRppQxYJrJYVV7QJGKchkQj5',
    BACKEND_ACCOUNT: 'EgJX7GpswpA8z3qRNuzNTgKKjPmw1UMfh5xQjFeVBqAK',
    RATES: 'https://evmexplorer.testnet.velas.com/ticker',
    EVM_EXPLORER: 'https://evmexplorer.velas.com',
    ACCOUNT_HISTORY: 'https://api-history.velas.com',
}

VAcount.initialize({
    network: 'mainnet',
    velas_rates: config.RATES,
    node_host: config.NODE_HOST,
    evm_explorer: config.EVM_EXPLORER,
    account_host: config.BACKEND_HOST,
    history_host: config.ACCOUNT_HISTORY,
    account_contract: config.ACCOUNT_CONTRACT,
    account_payer_address: config.BACKEND_ACCOUNT,
})
```


## Example

see https://github.com/velas/velas-account-mobile-demo


## Usage

```js
import * as VAcount from '@velas/react-native-account'

// ...

createAccount = async (network = 'mainnet') => {
    const { error, data } = await VAcount.account.new.create(network)

    if (error) return console.log(error)

    console.log(`Velas Account created: ${JSON.stringify(data)}`)
}
```

Check the [API documentation]() to learn more about the available methods.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
