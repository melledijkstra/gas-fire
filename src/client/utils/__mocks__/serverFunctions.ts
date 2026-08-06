import type { FireTable } from '@/common/table/FireTable'
import type {
  AccountOptions,
  ImportPreviewResult,
  RawTable,
  ServerResponse,
  TransactionAction,
} from '@/common/types'
import type { Aspsp, EnableBankingConnection } from '@/server/enable-banking/types'
import type * as publicServerFunctions from '@/server/index'
import type { PackedRuleEngineResult } from '@/server/rule-engine/types'

type ServerFunctionsInterface = typeof publicServerFunctions

type Promisified<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : Promise<T[K]>;
}

type PromisifiedServerFunctionsInterface = Promisified<ServerFunctionsInterface>

const StrategyOptions = {
  aurora_financial_group: 'Aurora Financial Group',
  cerulean_trust_bank: 'Cerulean Trust Bank',
  emerald_capital_partners: 'Emerald Capital Partners',
}

class ServerFunctions implements PromisifiedServerFunctionsInterface {
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async onInstall(_e: GoogleAppsScript.Events.AddonOnInstall): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async resolveContraIban(): Promise<string | null> {
    throw new Error('Mock not implemented')
  }

  async validateSpreadsheetTemplate() {
    throw new Error('Mock not implemented')
  }

  async importPipeline(
    _rawTable: RawTable,
    _bankAccount: string,
    _userDecisions?: Record<string, TransactionAction>,
  ): Promise<ServerResponse<{
    message: string
    ruleEngine?: PackedRuleEngineResult
  }>> {
    return { success: true, message: 'ok', data: { message: 'ok' } }
  }

  async previewPipeline(
    _table: RawTable,
    _strategy: string,
  ): Promise<ServerResponse<ImportPreviewResult>> {
    await this.delay(1000)
    console.log('previewPipeline mock called')
    return {
      success: true,
      data: {
        duplicateHashes: [],
        table: {
          headers: ['date', 'amount', 'description'],
          data: [
            ['2023-01-01', '100', 'Grocery'],
          ],
        },
        newBalance: 0,
      },
    }
  }

  async enableBankingPipeline(
    _fireTable: FireTable,
    _bankAccount: string,
  ): Promise<ServerResponse<{
    ruleEngine?: PackedRuleEngineResult
  }>> {
    await this.delay(1000)
    return { success: true, data: {} }
  }

  async executeAutomaticCategorization(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async mailNetWorth(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async onOpen(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async openFileUploadDialog(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async openAboutDialog(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async openSettingsDialog(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async executeFindDuplicates(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async getAccountOptions(): Promise<ServerResponse<AccountOptions>> {
    return { success: true, data: StrategyOptions }
  }

  async setupEnableBankingConnection(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async toggleEnableBankingDailySync(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async syncEnableBankingTransactions(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async openEnableBankingDialog(): Promise<void> {
    throw new Error('Mock not implemented')
  }

  async fetchEnableBankingConnections(): Promise<ServerResponse<EnableBankingConnection[]>> {
    await this.delay(1000)
    const mockConnections: EnableBankingConnection[] = [
      {
        sessionId: 'mock-session-id-1',
        aspsp: { name: 'Nordea', country: 'FI' },
        accounts: [
          { accountId: 'account-1', slug: 'checking' },
          { accountId: 'account-2', slug: 'savings' },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        sessionId: 'mock-session-id-2',
        aspsp: { name: 'N26', country: 'ES' },
        accounts: [
          { accountId: 'account-3', slug: 'main' },
        ],
        createdAt: new Date().toISOString(),
      },
    ]

    return { success: true, data: mockConnections }
  }

  async removeEnableBankingConnection(_sessionId: string): Promise<ServerResponse<void>> {
    await this.delay(1000)
    return { success: true }
  }

  async getEnableBankingAspsps(): Promise<ServerResponse<Aspsp[]>> {
    await this.delay(1000)
    const mockAspsps: Aspsp[] = [
      { name: 'Nordea', country: 'FI', logo: 'https://enablebanking.com/brands/FI/Nordea', connected: true },
      { name: 'N26', country: 'ES', logo: 'https://enablebanking.com/brands/ES/N26', connected: true },
      { name: 'N26', country: 'PT', logo: 'https://enablebanking.com/brands/PT/N26' },
      { name: 'N26', country: 'FI', logo: 'https://enablebanking.com/brands/FI/N26' },
      { name: 'N26', country: 'NL', logo: 'https://enablebanking.com/brands/NL/N26' },
      { name: 'ING', country: 'NL', logo: 'https://enablebanking.com/brands/NL/ING' },
      { name: 'BNP Paribas', country: 'FR' },
    ]
    return { success: true, data: mockAspsps }
  }

  async startEnableBankingAuthorization(_aspsp: Aspsp): Promise<ServerResponse<string>> {
    await this.delay(1000)
    return { success: true, data: '' }
  }

  async completeEnableBankingAuthorization(_code: string, _aspsp: Aspsp): Promise<ServerResponse<number>> {
    await this.delay(1000)
    return { success: true, data: 1 }
  }

  async triggerEnableBankingSync(): Promise<ServerResponse<void>> {
    await this.delay(1000)
    return { success: true }
  }

  async getEnableBankingTriggerStatus(): Promise<ServerResponse<{ enabled: boolean, frequencyType: 'hours' | 'days', frequencyValue: number }>> {
    await this.delay(1000)
    return { success: true, data: { enabled: false, frequencyType: 'days', frequencyValue: 1 } }
  }

  async setEnableBankingTrigger(_enabled: boolean, _frequencyType: 'hours' | 'days', _frequencyValue: number): Promise<ServerResponse<{
    enabled: boolean
    frequencyType: 'hours' | 'days'
    frequencyValue: number
  }>> {
    await this.delay(1000)
    return {
      success: true,
      data: {
        enabled: _enabled,
        frequencyType: _frequencyType,
        frequencyValue: _frequencyValue,
      },
    }
  }
}

export const serverFunctions = new ServerFunctions()
