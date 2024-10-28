import { Config } from './config';

function createRowWithAmount(amount: string) {
  const arr = [];
  arr[6] = amount;
  return arr;
}

describe('Configuration Tests', () => {
  describe('rabobank amount issue', () => {
    const config = Config.getConfig().rabobank;

    test('is able to handle amount correctly', () => {
      const amountRule = config.columnImportRules.amount;
      expect(amountRule?.([createRowWithAmount('20,20')])).toStrictEqual([
        20.2,
      ]);
      expect(amountRule?.([createRowWithAmount('-20,20')])).toStrictEqual([
        -20.2,
      ]);
      expect(amountRule?.([createRowWithAmount('-20')])).toStrictEqual([-20]);
    });
  });
});
