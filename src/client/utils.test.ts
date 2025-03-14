import { csvToJson } from './utils';
import type { Table } from '@/common/types';

describe('Utility Functions', () => {
  it('csvToJson', () => {
    const table: Table = [
      ['heading1', 'heading2', 'heading3'],
      ['row1col1', 'row1col2', 'row1col3'],
      ['row2col1', 'row2col2', 'row2col3'],
    ];

    expect(csvToJson(table)).toStrictEqual([
      {
        heading1: 'row1col1',
        heading2: 'row1col2',
        heading3: 'row1col3',
      },
      {
        heading1: 'row2col1',
        heading2: 'row2col2',
        heading3: 'row2col3',
      },
    ]);
  });
});
