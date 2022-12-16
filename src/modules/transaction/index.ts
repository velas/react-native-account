import config from '../../config'
import { getCSRFToken } from '../../helpers'
import {
  IAccount,
  IEnvironment,
  IMessageResponse,
  ISponsor,
  TransactionType,
} from '../../typings/types'

class Transaction {
  send = async (
    account: IAccount,
    type: TransactionType,
    trasactionData: any,
    sponsor?: ISponsor
  ): Promise<IMessageResponse> => {
    const env = config.get(account.network) as IEnvironment
    const host = sponsor?.apiHost ?? env.account_host
    const csrfToken = await getCSRFToken(host)

    if (csrfToken.error)
      return {
        status: 'failed',
        error: csrfToken.error,
      }

    try {
      const { success, error }: any = await this._sendTransaction(
        {
          params: {
            ...trasactionData,
            transactions_sponsor_pub_key: sponsor?.apiPublicKey || env.account_payer_address,
          },
          transaction_name: type,
          csrf_token: csrfToken.token,
          transactions_sponsor_api_host: host,
          transactions_sponsor_auth_params: sponsor?.authParams,
        },
        env
      )

      if (error || !success) return { status: 'failed', error: error || 'Something went wrong' }

      return { status: 'success' }
    } catch (_) {
      return { status: 'failed', error: _ }
    }
  }

  private _sendTransaction = async (transactionData: any, env: IEnvironment) => {
    return new Promise((resolve) => {
      env.agent.provider.client.sendMessage({
        ...transactionData,
        cb: (error: any, success: any) => {
          resolve({ error, success })
        },
      })
    })
  }
}

export default new Transaction()
