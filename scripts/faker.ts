import type { Accounts, FireTransaction } from '../src/common/types';
import { faker } from '@faker-js/faker';
import fs from 'fs';

const fakeBankAccounts: Accounts = {
  'Bank of America': 'US1234567890',
  Commerzbank: 'DE89370400440532013000',
  ING: 'NL01INGB1234567890',
};

const categories = [
  '',
  'Income',
  'Salary',
  'Food & Groceries',
  'Bars, Restaurants & Clubs',
  'Household & Utilities',
  'Debt',
  'Subscriptions',
  'Education',
  'Leisure & Entertainment',
  'Personal Care',
  'Healthcare & Drug Stores',
  'Insurances & Finances',
  'Family, Friends & Donations',
  'Media & Electronics',
  'Transport & Car',
  'Travel & Holidays',
  'Savings & Investments',
  'Business expenses',
  'Miscellaneous ',
];

function createBankAccounts(amount = 3): Record<string, string> {
  const accounts = {};
  for (let i = 0; i < amount; i++) {
    accounts[faker.company.name()] = faker.finance.iban();
  }
  return accounts;
}

function createTransaction(
  overrides?: Partial<FireTransaction>
): FireTransaction {
  const date = faker.date.between({ from: '2010-01-01', to: '2024-10-30' });
  const amountRange = faker.helpers.weightedArrayElement([
    { value: 10, weight: 5 },
    { value: 100, weight: 4 },
    { value: 1000, weight: 1 },
  ]);
  const multiplier = faker.helpers.weightedArrayElement([
    { value: 1, weight: 1 },
    { value: -1, weight: 9 }, // more often we have expenses than income
  ]);
  const amount =
    parseFloat(
      faker.finance.amount({
        min: multiplier === 1 ? 100 : 0,
        max: multiplier === 1 ? 3000 : amountRange,
        autoFormat: false,
      })
    ) * multiplier;
  const label =
    multiplier === -1
      ? `Trip${faker.location.city()}${date.getFullYear()}`
      : '';
  return {
    ref: faker.string.uuid(),
    iban: faker.finance.iban(),
    date: date.toISOString().split('T')[0],
    amount,
    balance: '',
    contra_account: faker.person.fullName(),
    description: faker.finance.transactionDescription(),
    comments: faker.lorem.sentence(),
    icon: '',
    category: faker.helpers.arrayElement(categories),
    label,
    import_date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
    hours: '',
    disabled: '',
    contra_iban: faker.finance.iban(),
    currency: faker.finance.currencyCode(),
    ...overrides,
  };
}

function transactionsToCsv(
  transactions: FireTransaction[],
  delimiter = ';'
): string {
  const header = Object.keys(transactions[0]).join(delimiter);
  const rows = transactions.map((transaction) =>
    Object.values(transaction).join(delimiter)
  );
  return [header, ...rows].join('\n');
}

if (import.meta.url.endsWith(process.argv[1])) {
  console.log('RUNNING FAKER SCRIPT 🥸');

  const transactions: FireTransaction[] = [];

  for (const [_name, iban] of Object.entries(fakeBankAccounts)) {
    for (let i = 0; i < 10; i++) {
      transactions.push(createTransaction({ iban }));
    }
  }

  const csv = transactionsToCsv(transactions);

  console.log('Writing transactions to file 📝');

  fs.writeFileSync('transactions.csv', csv);

  console.log('Done 🎉');
}
