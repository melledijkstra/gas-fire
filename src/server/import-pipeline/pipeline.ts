import { Config } from '../config'
import { Table } from '../table/Table'
import { FireTable } from '../table/FireTable'

export interface PipelineContext {
  config: Config
}

export type PipelineStage<I, O> = (input: I, context: PipelineContext) => O

/**
 * A generic Pipeline pattern implementation that chains together multiple stages.
 * Each stage transforms an input into an output, passing it to the next stage.
 * It uses a functional approach to build up a single composed action that is only
 * evaluated when `execute` is called.
 */
export class Pipeline<I, O> {
  /**
   * @param action The composed function representing all pipeline stages up to this point.
   */
  constructor(private readonly action: (input: I, context: PipelineContext) => O) {}

  /** Initializes a new, empty pipeline that simply returns its input. */
  static create<T>(): Pipeline<T, T> {
    return new Pipeline((input: T) => input)
  }

  /**
   * Appends a new stage to the pipeline.
   * Creates a new Pipeline instance representing the composed transformation.
   *
   * @param stage The next stage to execute in the sequence.
   * @returns A new Pipeline with the added stage.
   */
  addStage<TNext>(stage: PipelineStage<O, TNext>): Pipeline<I, TNext> {
    return new Pipeline<I, TNext>((input, context) => {
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
  execute(input: I, context: PipelineContext): O {
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
export function sortByDateStage(input: FireTable, _context: PipelineContext): FireTable {
  return input.sortByDate()
}
