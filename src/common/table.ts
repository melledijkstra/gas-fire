import type { TableData, TableCell } from './types';

const EMPTY = '';

export class Table {
  protected data: TableData;

  constructor(data: TableData = []) {
    this.data = data;
  }

  public getData(): TableData {
    return this.data;
  }

  public get length(): number {
    return this.data.length;
  }

  /**
   * @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
   */
  public transpose(): this {
    let i = 0;
    const result: TableData = [];
    while (i < this.data.length) {
      const innerlist = this.data[i];
      let j = 0;
      while (j < innerlist.length) {
        if (typeof result[j] === 'undefined') {
          result[j] = [];
        }
        result[j].push(innerlist[j]);
        j += 1;
      }
      i += 1;
    }
    this.data = result;
    return this;
  }

  public retrieveColumn(columnIndex: number): TableCell[] {
    return this.data?.map((row) => row?.[columnIndex] ?? EMPTY) ?? [];
  }

  public deleteFirstRow(): this {
    this.data.shift();
    return this;
  }

  public removeEmptyRows(): this {
    this.data = this.data.filter((row) => {
      return row.some((cell) => cell !== EMPTY && cell !== null && cell !== undefined);
    });
    return this;
  }

  public deleteLastRow(): this {
    this.data.pop();
    return this;
  }

  public sortByDate(dateColumnIndex: number): this {
    this.data = this.data.toSorted(
      (row1, row2) => {
        const d1 = new Date(row1[dateColumnIndex] as string | number | Date).getTime();
        const d2 = new Date(row2[dateColumnIndex] as string | number | Date).getTime();
        return d1 - d2;
      }
    ).reverse();
    return this;
  }

  public deleteColumns(colIndices: number[]): this {
    const sortedIndices = colIndices.sort().reverse();
    this.transpose();
    for (const delIndex of sortedIndices) {
      if (typeof this.data[delIndex] !== 'undefined') {
        this.data.splice(delIndex, 1);
      }
    }
    this.transpose();
    return this;
  }

  public ensureLength(length: number): this {
    this.data = this.data.map(row => {
      if (row.length < length) {
        return [
          ...row,
          ...new Array(length - row.length).fill(null),
        ];
      }
      return row.slice(0, length);
    });
    return this;
  }
}
