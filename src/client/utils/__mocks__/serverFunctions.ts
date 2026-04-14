import type {
  ServerResponse,
  AccountOptions,
  RawTable,
  ImportPreviewResult,
  TransactionAction,
} from '@/common/types'
import type * as publicServerFunctions from '@/server/index'
import { fireTableMock } from '@/fixtures/fire-table'
import { getRowHash } from '@/common/helpers'
import type { ImportRule, RuleEngineResult } from '@/server/rule-engine'

////////////////////////////////////////////////////////////////
// This mock is used by storybook, to mimic server functions
////////////////////////////////////////////////////////////////

type ServerFunctionsInterface = typeof publicServerFunctions

type Promisified<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : Promise<T[K]>;
}

type PromisifiedServerFunctionsInterface = Promisified<ServerFunctionsInterface>

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
    rawTable: RawTable,
    bankAccount: string,
    _userDecisions?: Record<string, TransactionAction>,
  ): Promise<ServerResponse<{
    message: string
    ruleEngine?: RuleEngineResult
  }>> {
    console.log('importPipeline mock called with data:', rawTable, 'and selectedAccount:', bankAccount)
    await sleep(2000)
    const msg = `Successfully imported ${rawTable.length} rows!`
    return {
      success: true,
      message: msg,
      data: {
        message: msg,
      },
    }
  };

  async previewPipeline(
    _table: RawTable,
    _strategy: string,
  ): Promise<ServerResponse<ImportPreviewResult>> {
    console.log('previewPipeline mock called')
    await sleep(2000)

    const appliedRules: ImportRule[] = [
      {
        action: 'EXCLUDE',
        ruleName: 'Test Rule',
        banks: ['All'],
        conditionColumn: 'test_column',
        condition: 'REGEX',
        actionTarget: 'action_column',
        stopProcessing: false,
        rulePhase: 'POST_TRANSFORM',
      },
      {
        action: 'EXCLUDE',
        ruleName: 'Another Rule',
        banks: ['All'],
        conditionColumn: 'test_column',
        condition: 'REGEX',
        actionTarget: 'action_column',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      },
    ]

    const rows = fireTableMock.map(row => row.map(String))
    const hashes = rows.map(getRowHash)

    const duplicateHashes = [hashes[3], hashes[5]]
    const removedHashes = [hashes[2], hashes[4]]

    return {
      success: true,
      data: {
        duplicateHashes,
        removedHashes,
        rows,
        newBalance: 1234.56,
        ruleEngine: {
          appliedRules,
          warnings: [],
          rowExcludedRule: {
            [hashes[2]]: appliedRules[0].ruleName,
            [hashes[4]]: appliedRules[1].ruleName,
          },
        },
      },
    }
  };

  async executeAutomaticCategorization(): Promise<void> {
    console.log('executeAutomaticCategorization mock called')
  };

  async mailNetWorth(): Promise<void> {
    console.log('mailNetWorth mock called')
  };

  async onOpen(): Promise<void> {
    console.log('onOpen mock called')
  };

  async openFileUploadDialog(): Promise<void> {
    console.log('openFileUploadDialog mock called')
  };

  async openAboutDialog(): Promise<void> {
    console.log('openAboutDialog mock called')
  };

  async openSettingsDialog(): Promise<void> {
    console.log('openSettingsDialog mock called')
  };

  async MD5(_value: string): Promise<string> {
    console.log('MD5 mock called')
    return 'mocked-md5'
  };

  async GET_PROJECT_VERSION(): Promise<string> {
    console.log('GET_PROJECT_VERSION mock called')
    return 'mocked-version'
  };

  async executeFindDuplicates(): Promise<void> {
    console.log('executeFindDuplicates mock called')
  };

  async getAccountOptions(): Promise<ServerResponse<AccountOptions>> {
    console.log('getAccountOptions mock called')
    return { success: true, data: StrategyOptions }
  }
}

export const serverFunctions = new ServerFunctions()
