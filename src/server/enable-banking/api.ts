import { Logger } from '@/common/logger'

// URLFetchApp doesn't provide us with a type for options
// so we define our own with the properties we use.
type FetchOptions = {
  method?: string
  contentType?: string
  payload?: string
  headers?: Record<string, string>
  muteHttpExceptions?: boolean
}

const ENABLE_BANKING_API_URL = 'https://api.enablebanking.com'
// Use script properties since the private key is application-wide

export class EnableBankingApi {
  private static getAppId(): string {
    const props = PropertiesService.getScriptProperties()
    // Fallback to the default application ID if not provided in script properties
    const appId = props.getProperty('ENABLE_BANKING_APP_ID') || '77422cf6-6543-43c9-ba14-e16722d44a51'
    if (!appId) {
      throw new Error('ENABLE_BANKING_APP_ID is not set in Script Properties.')
    }
    return appId
  }

  private static getPrivateKey(): string {
    const props = PropertiesService.getScriptProperties()
    const key = props.getProperty('ENABLE_BANKING_PRIVATE_KEY')
    if (!key) {
      throw new Error('ENABLE_BANKING_PRIVATE_KEY is not set in Script Properties. Please add your .pem private key.')
    }
    return key
  }

  /**
   * Generates a JWT token required for Enable Banking API authentication.
   */
  private static generateJWT(): string {
    const header = {
      typ: 'JWT',
      alg: 'RS256',
      kid: this.getAppId(),
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp: now + 3600, // 1 hour expiration
    }

    const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header)).replace(/=+$/, '')
    const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '')
    const toSign = `${encodedHeader}.${encodedPayload}`

    const privateKey = this.getPrivateKey()
    const signature = Utilities.computeRsaSha256Signature(toSign, privateKey)
    const encodedSignature = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '')

    return `${toSign}.${encodedSignature}`
  }

  private static fetchApi<T>(endpoint: string, options: FetchOptions = {}): T {
    const jwt = this.generateJWT()
    const url = `${ENABLE_BANKING_API_URL}${endpoint}`

    const headers = {
      ...options?.headers,
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    }

    const fetchOptions = {
      ...options,
      headers,
      muteHttpExceptions: true,
    }

    Logger.log(`Enable Banking API Request: ${options.method || 'GET'} ${url}`)
    const response = UrlFetchApp.fetch(url, fetchOptions)
    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    if (responseCode >= 400) {
      Logger.error(`Enable Banking API Error: ${responseCode} - ${responseText}`)
      throw new Error(`Enable Banking API Error: ${responseCode} - ${responseText}`)
    }

    return JSON.parse(responseText)
  }

  static getAspsps() {
    return this.fetchApi<{ aspsps: { name: string, country: string }[] }>('/aspsps')
  }

  static startAuthorization(aspsp: { name: string, country: string }, redirectUrl: string, state: string) {
    const payload = {
      access: {
        // Valid for max 180 days (or ASPSP max)
        valid_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      },
      aspsp,
      state,
      redirect_url: redirectUrl,
    }

    return this.fetchApi<{ url: string }>('/auth', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
    })
  }

  static authorizeSession(code: string) {
    return this.fetchApi<{ session_id: string, accounts: { uid: string, account_id?: { iban?: string } }[] }>('/sessions', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ code }),
    })
  }

  static getAccountTransactions(accountId: string, dateFrom?: string) {
    let endpoint = `/accounts/${accountId}/transactions`
    if (dateFrom) {
      endpoint += `?date_from=${encodeURIComponent(dateFrom)}`
    }
    return this.fetchApi<{ transactions: Record<string, unknown>[] }>(endpoint)
  }
}
