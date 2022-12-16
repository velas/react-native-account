import { APIService } from '../api'

const getCSRFToken = async (requestUrl: string) => {
  try {
    const api = new APIService(requestUrl)

    const { token } = <{ token: string }>await api.getCSRF()

    return { token }
  } catch (error: any) {
    return {
      error: error.toString().includes('Network Error')
        ? 'Please check your internet connection and try again'
        : 'Sponsor service temporary not available, please try again later',
    }
  }
}

export default getCSRFToken
