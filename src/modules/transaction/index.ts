import { APIService } from 'src/api'
import config from 'src/config'
import {
  IAccount,
  IEnvironment,
  IMessageResponse,
  ISponsor,
  TransactionType,
} from 'src/typings/types'

class Transaction {
  send = async (
    account: IAccount,
    type: TransactionType,
    trasactionData: any,
    sponsor?: ISponsor
  ): Promise<IMessageResponse> => {
    const env = config[account.network] as IEnvironment

    const host = sponsor?.apiHost ?? env.account_host
    const csrfToken = await this._getCSRFToken(host)

    if (csrfToken.error) {
      return {
        status: 'failed',
        error: csrfToken.error.toString().includes('Network Error')
          ? 'Please check your internet connection and try again'
          : 'Sponsor service temporary not available, please try again later',
      }
    }

    try {
      const { success, error }: any = await this._sendTransaction(
        {
          transaction_name: type,
          csrf_token: csrfToken.token,
          transactions_sponsor_api_host: sponsor?.apiHost,
          transactions_sponsor_auth_params: sponsor?.authParams,
          transactions_sponsor_pub_key: sponsor?.apiPublicKey || env.account_payer_address,
          ...trasactionData,
        },
        env
      )

      if (error || !success) return { status: 'failed', error: error || 'Something went wrong' }

      return { status: 'success' }
    } catch (_) {
      return { status: 'failed', error: _ }
    }
  }

  private _sendTransaction = async (transactionData: any, env: IEnvironment) =>
    new Promise((resolve) => {
      env.agent.provider.client.sendMessage({
        ...transactionData,
        cb: (error: any, success: any) => {
          resolve({ error, success })
        },
      })
    })

  private _getCSRFToken = async (requestUrl: string) => {
    try {
      const api = new APIService(requestUrl)

      const { token } = <{ token: string }>await api.getCSRF()

      return { token }
    } catch (error) {
      return { error }
    }
  }
}

export default new Transaction()
