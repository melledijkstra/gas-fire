import { bench, describe, vi } from 'vitest';
import { Transformers } from './transformers';

vi.mock('./utils/spreadsheet', () => ({
  getSpreadsheetLocale: vi.fn().mockReturnValue('en-GB'),
}));

describe('Transformers.transformDate', () => {
  const dates = ['2023-10-01', '01/10/2023', '01.10.2023', '2023.10.01', '20/6/24', '1/6/24'];

  bench('transformDate', () => {
    for (const date of dates) {
      Transformers.transformDate(date);
    }
  });
});
