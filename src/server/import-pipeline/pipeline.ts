import type { UserDecisions, TransactionAction } from '@/common/types'
import { Logger } from '@/common/logger'
import { Config } from '../config'
import { Table } from '../table/Table'
import { FireTable } from '../table/FireTable'
import { FireSheet } from '../spreadsheet/FireSheet'
import type { CellValue } from '@/common/types'
import { getRowHash } from '@/common/helpers'

export interface PipelineContext {
  config: Config
}

export interface ImportPipelineContext extends PipelineContext {
  userDecisions?: UserDecisions
}

export interface PreviewPipelineContext extends PipelineContext {
  duplicateHashes: Set<string>
  removedHashes: Set<string>
}

export type PipelineStage<I, O, C> = (input: I, context: C) => O

/**
 * A generic Pipeline pattern implementation that chains together multiple stages.
 * Each stage transforms an input into an output, passing it to the next stage.
 * It uses a functional approach to build up a single composed action that is only
 * evaluated when `execute` is called.
 */
export class Pipeline<I, O, C> {
  /**
   * @param action The composed function representing all pipeline stages up to this point.
   */
  constructor(private readonly action: (input: I, context: C) => O) {}

  /** Initializes a new, empty pipeline that simply returns its input. */
  static create<T, C = PipelineContext>(): Pipeline<T, T, C> {
    return new Pipeline((input: T) => input)
  }

  /**
   * Appends a new stage to the pipeline.
   * Creates a new Pipeline instance representing the composed transformation.
   *
   * @param stage The next stage to execute in the sequence.
   * @returns A new Pipeline with the added stage.
   */
  addStage<TNext>(stage: PipelineStage<O, TNext, C>): Pipeline<I, TNext, C> {
    return new Pipeline<I, TNext, C>((input, context) => {
      // Execute all previous stages to get the intermediate output
      const currentOut = this.action(input, context)
      // Execute the newly added stage with the intermediate output
      return stage(currentOut, context)
    })
  }

  /**
   * Executes the entire composed pipeline sequence.
   *
   * @param input The initial input to the pipeline.
   * @param context Shared context passed to every stage.
   * @returns The final output after all stages have been executed.
   */
  execute(input: I, context: C): O {
    return this.action(input, context)
  }
}

// ------------------------------------------
// Concrete Stages
// ------------------------------------------

/**
 * Removes empty rows from the input Table.
 */
export function removeEmptyRowsStage(input: Table, _context: PipelineContext): Table {
  input.removeEmptyRows()
  return input
}

/**
 * Transforms a Table into a FireTable using the headers in the first row.
 * The input table is expected to have headers as its first row (using Table.from).
 */
export function transformToFireTableStage(input: Table, context: PipelineContext): FireTable {
  if (!input.headers || input.headers.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  return FireTable.fromAccountSpecification({
    headers: input.headers,
    rows: input.data,
    config: context.config,
  })
}

/** Sorts the FireTable by date. */
export function sortByDateStage<T extends FireTable>(input: T, _context: PipelineContext): T {
  return input.sortByDate()
}

/**
 * Detects duplicates by comparing row hashes against existing hashes in the context.
 * Populates the context metadata with status, hashes, and counts.
 */
export function duplicateDetectionStage(input: FireTable, context: PreviewPipelineContext): FireTable {
  const fireSheet = new FireSheet()
  const existingHashes = fireSheet.loadExistingHashes()
  Logger.log(`Loaded ${existingHashes.size} existing transaction hashes for duplicate detection`)

  for (const row of input.data) {
    const hash = getRowHash(row)

    if (existingHashes.has(hash)) {
      context.duplicateHashes?.add(hash)
    }
  }

  return input
}

/**
 * Formats a single cell value to a display string.
 * Dates are formatted as 'yyyy-MM-dd' using the spreadsheet's timezone.
 */
export function formatCellValue(cell: CellValue): string {
  if (cell instanceof Date) {
    try {
      const timeZone = FireSheet.getTimeZone()
      return Utilities.formatDate(cell, timeZone, 'yyyy-MM-dd')
    }
    catch {
      return cell.toISOString().split('T')[0]
    }
  }
  return String(cell ?? '')
}

/**
 * Replaces empty cells in auto-fill columns with a placeholder for preview purposes.
 * This stage modifies the table data in-place.
 */
export function autoFillPreviewStage<T extends FireTable>(input: T, context: PipelineContext): T {
  const config = context.config
  const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : []

  if (autoFillColumns.length === 0) return input

  input.map((row) => {
    for (const colIndex of autoFillColumns) {
      const arrayIndex = colIndex - 1
      if (arrayIndex >= 0 && arrayIndex < row.length) {
        if (!row[arrayIndex] || row[arrayIndex] === '') {
          row[arrayIndex] = '(auto-filled)'
        }
      }
    }
    return row
  })

  return input
}

/**
 * Filters rows based on explicit user decisions stored in the context.
 * Rows default to 'import' unless the user has explicitly decided otherwise.
 */
export function applyUserDecisionsStage(input: FireTable, context: ImportPipelineContext): FireTable {
  const decisions = context.userDecisions
  if (!decisions || decisions.size === 0) return input

  input.filter((row) => {
    const hash = getRowHash(row)
    const action: TransactionAction = decisions.get(hash) ?? 'import'
    return action === 'import'
  })

  return input
}
