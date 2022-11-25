import axios from 'axios'

class APIService {
  private _requestUrl: string

  constructor(requestUrl: string) {
    this._requestUrl = requestUrl
  }

  request = async (method: 'get' | 'post', url: string, data?: any) => {
    if (method === 'post')
      return await axios
        .post(this._requestUrl + url, data, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })
        .then((response) => response.data)

    return await axios
      .get(this._requestUrl + url, data ? { params: data } : undefined)
      .then((response) => response.data)
  }

  getCSRF = async () => this.request('get', '/csrf')

  getTransactions = async (address: string, data: any) =>
    this.request('get', `transactions/${address}`, data)
}

export default APIService
