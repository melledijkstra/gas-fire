import type {
  AccountOptions,
  ImportPreviewResult,
  RawTable,
  ServerResponse,
  TransactionAction,
} from '@/common/types'
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
  async debugImportSettings() {
    console.log('debugImportSettings mock called')
  }

  async importPipeline(
    _rawTable: RawTable,
    _bankAccount: string,
    _userDecisions?: Record<string, TransactionAction>,
  ): Promise<ServerResponse<{
    message: string
    ruleEngine?: PackedRuleEngineResult
  }>> {
    console.log('importPipeline mock called')
    return { success: true, message: 'ok', data: { message: 'ok' } }
  }

  async previewPipeline(
    _table: RawTable,
    _strategy: string,
  ): Promise<ServerResponse<ImportPreviewResult>> {
    console.log('previewPipeline mock called')
    return { success: true, data: { duplicateHashes: [], table: [], newBalance: 0 } as unknown as ImportPreviewResult }
  }

  async executeAutomaticCategorization(): Promise<void> {}
  async mailNetWorth(): Promise<void> {}
  async onOpen(): Promise<void> {}
  async openFileUploadDialog(): Promise<void> {}
  async openAboutDialog(): Promise<void> {}
  async openSettingsDialog(): Promise<void> {}
  async MD5(_value: string): Promise<string> { return 'md5' }
  async GET_PROJECT_VERSION(): Promise<string> { return 'version' }
  async executeFindDuplicates(): Promise<void> {}

  async getAccountOptions(): Promise<ServerResponse<AccountOptions>> {
    return { success: true, data: StrategyOptions }
  }

  async setupEnableBankingConnection(): Promise<void> {}
  async toggleEnableBankingDailySync(): Promise<void> {}
  async syncEnableBankingTransactions(): Promise<void> {}

  async openEnableBankingDialog(): Promise<void> {}

  async getEnableBankingConnections(): Promise<ServerResponse<{ sessionId: string, bankName: string, accounts: { accountId: string, slug: string }[], createdAt: string }[]>> {
    return { success: true, data: [] }
  }

  async removeEnableBankingConnection(_sessionId: string): Promise<ServerResponse<void>> {
    return { success: true }
  }

  async getEnableBankingAspsps(): Promise<ServerResponse<{ name: string, country: string }[]>> {
    return { success: true, data: [] }
  }

  async startEnableBankingAuthorization(_aspsp: unknown): Promise<ServerResponse<string>> {
    return { success: true, data: '' }
  }

  async completeEnableBankingAuthorization(_code: string, _bankName: string): Promise<ServerResponse<number>> {
    return { success: true, data: 1 }
  }

  async triggerEnableBankingSync(): Promise<ServerResponse<void>> {
    return { success: true }
  }

  async getEnableBankingTriggerStatus(): Promise<ServerResponse<{ enabled: boolean, frequencyType: 'hours' | 'days', frequencyValue: number }>> {
    return { success: true, data: { enabled: false, frequencyType: 'days', frequencyValue: 1 } }
  }

  async setEnableBankingTrigger(_enabled: boolean, _frequencyType: string, _frequencyValue: number): Promise<ServerResponse<void>> {
    return { success: true }
  }
}

export const serverFunctions = new ServerFunctions()
