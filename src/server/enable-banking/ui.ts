import { AccountUtils } from '../accounts/account-utils'
import { EnableBankingApi } from './api'

const SYNC_TRIGGER_HANDLER = 'syncEnableBankingTransactions'

function getPrivateKeyOrAlert(ui: GoogleAppsScript.Base.Ui): string | null {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('ENABLE_BANKING_PRIVATE_KEY')
    if (key) return key
  }
  catch {
    // ignore
  }
  ui.alert('Configuration Error', 'Please add your .pem private key to the Script Properties as ENABLE_BANKING_PRIVATE_KEY before continuing.', ui.ButtonSet.OK)
  return null
}

function fetchAspspsOrAlert(ui: GoogleAppsScript.Base.Ui): { name: string, country: string }[] | null {
  try {
    const aspspsResponse = EnableBankingApi.getAspsps()
    const aspsps = aspspsResponse.aspsps
    if (aspsps && aspsps.length > 0) return aspsps
    ui.alert('Error', 'No banks available from Enable Banking API.', ui.ButtonSet.OK)
  }
  catch {
    ui.alert('API Error', 'Failed to fetch available banks. Ensure your private key is correct.', ui.ButtonSet.OK)
  }
  return null
}

function selectAspspOrAlert(ui: GoogleAppsScript.Base.Ui, aspsps: { name: string, country: string }[]) {
  const bankPrompt = ui.prompt(
    'Select Bank',
    `Available banks (first 10): ${aspsps.slice(0, 10).map((a: { name: string }) => a.name).join(', ')}...\n\nPlease type the EXACT name of the bank you want to connect to:`,
    ui.ButtonSet.OK_CANCEL,
  )

  if (bankPrompt.getSelectedButton() !== ui.Button.OK) return null

  const selectedBankName = bankPrompt.getResponseText().trim()
  const selectedAspsp = aspsps.find((a: { name: string, country: string }) => a.name.toLowerCase() === selectedBankName.toLowerCase())

  if (!selectedAspsp) {
    ui.alert('Error', `Bank "${selectedBankName}" not found.`, ui.ButtonSet.OK)
    return null
  }
  return selectedAspsp
}

function mapAccounts(sessionAccounts: { uid: string, account_id?: { iban?: string } }[]) {
  const configuredAccounts = AccountUtils.getBankAccounts()
  const mappedAccounts: { accountId: string, slug: string }[] = []

  for (const acc of sessionAccounts) {
    const iban = acc.account_id?.iban
    if (iban) {
      const match = Object.entries(configuredAccounts).find(([_slug, configuredIban]) => configuredIban === iban)
      if (match) {
        mappedAccounts.push({ accountId: acc.uid, slug: match[0] })
      }
    }
  }
  return mappedAccounts
}

function saveConnection(sessionId: string, bankName: string, mappedAccounts: { accountId: string, slug: string }[]) {
  const props = PropertiesService.getUserProperties()
  let connections: { sessionId: string, bankName: string, accounts: { accountId: string, slug: string }[], createdAt: string }[] = []
  const existingStr = props.getProperty('ENABLE_BANKING_CONNECTIONS')
  if (existingStr) {
    try {
      connections = JSON.parse(existingStr)
    }
    catch {
      // Ignored
    }
  }

  connections.push({
    sessionId: sessionId,
    bankName: bankName,
    accounts: mappedAccounts,
    createdAt: new Date().toISOString(),
  })

  props.setProperty('ENABLE_BANKING_CONNECTIONS', JSON.stringify(connections))
}

export function setupEnableBankingConnection() {
  const ui = SpreadsheetApp.getUi()

  if (!getPrivateKeyOrAlert(ui)) return

  const aspsps = fetchAspspsOrAlert(ui)
  if (!aspsps) return

  const selectedAspsp = selectAspspOrAlert(ui, aspsps)
  if (!selectedAspsp) return

  const dummyRedirectUrl = 'https://enablebanking.com/callback'
  const state = Utilities.getUuid()

  let authResponse
  try {
    authResponse = EnableBankingApi.startAuthorization(
      { name: selectedAspsp.name, country: selectedAspsp.country },
      dummyRedirectUrl,
      state,
    )
  }
  catch {
    ui.alert('API Error', 'Failed to start authorization.', ui.ButtonSet.OK)
    return
  }

  ui.alert(
    'Authorization Required',
    `Please open the following URL in your browser to authorize access to your account:\n\n${authResponse.url}\n\nAfter authorizing, you will be redirected to an error page or a blank page. Look at the URL in your browser's address bar. It will look like: ${dummyRedirectUrl}?code=YOUR_CODE_HERE&state=...\n\nCopy the value of the "code" parameter.`,
    ui.ButtonSet.OK,
  )

  const codePrompt = ui.prompt('Enter Authorization Code', 'Paste the code from the URL here:', ui.ButtonSet.OK_CANCEL)

  if (codePrompt.getSelectedButton() !== ui.Button.OK) return
  const code = codePrompt.getResponseText().trim()

  let sessionResponse
  try {
    sessionResponse = EnableBankingApi.authorizeSession(code)
  }
  catch {
    ui.alert('API Error', 'Failed to authorize session with the provided code.', ui.ButtonSet.OK)
    return
  }

  const mappedAccounts = mapAccounts(sessionResponse.accounts || [])

  if (mappedAccounts.length === 0) {
    ui.alert('Warning', 'Session authorized, but none of the bank accounts matched the IBANs configured in your spreadsheet. Transactions cannot be synced.', ui.ButtonSet.OK)
    return
  }

  saveConnection(sessionResponse.session_id, selectedAspsp.name, mappedAccounts)

  ui.alert('Success', `Successfully connected to ${selectedAspsp.name} and mapped ${mappedAccounts.length} accounts.`, ui.ButtonSet.OK)
}

export function toggleEnableBankingDailySync() {
  const ui = SpreadsheetApp.getUi()
  const triggers = ScriptApp.getProjectTriggers()

  const existingTrigger = triggers.find(t => t.getHandlerFunction() === SYNC_TRIGGER_HANDLER)

  if (existingTrigger) {
    const response = ui.alert('Disable Sync?', 'Daily sync is currently ENABLED. Do you want to disable it?', ui.ButtonSet.YES_NO)
    if (response === ui.Button.YES) {
      ScriptApp.deleteTrigger(existingTrigger)
      ui.alert('Sync Disabled', 'Daily background sync has been disabled.', ui.ButtonSet.OK)
    }
  }
  else {
    const response = ui.alert('Enable Sync?', 'Daily sync is currently DISABLED. Do you want to enable it? It will run automatically once a day.', ui.ButtonSet.YES_NO)
    if (response === ui.Button.YES) {
      ScriptApp.newTrigger(SYNC_TRIGGER_HANDLER)
        .timeBased()
        .everyDays(1)
        .atHour(2) // Run at 2 AM
        .create()
      ui.alert('Sync Enabled', 'Daily background sync has been enabled and will run at 2 AM.', ui.ButtonSet.OK)
    }
  }
}
