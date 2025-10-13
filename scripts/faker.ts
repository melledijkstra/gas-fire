import type { Accounts, FireTransaction } from '../src/common/types';
import { faker } from '@faker-js/faker';
import fs from 'fs';

const outDir = 'transactions/'

const fakeBankAccounts: Accounts = {
  'Bank of America': 'US1234567890',
  Commerzbank: 'DE89370400440532013000',
  ING: 'NL01INGB1234567890',
} as const;

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
  'Miscellaneous',
] as const;

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function getDaysInMonth(monthIndex: number, year: number = new Date().getFullYear()): number {
  return new Date(year, monthIndex, 0).getDate();
}

function formatDate(date: Date, divider = '/') {
  // Get the day and pad it with a leading zero if necessary
  const day = String(date.getDate()).padStart(2, '0');

  // Get the month (which is 0-indexed), add 1, and pad it
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Get the full year
  const year = date.getFullYear();

  // Combine the parts into the desired format
  return `${day}${divider}${month}${divider}${year}`;
}

function generateAmount(): number {
  const expenseAmountRange = faker.helpers.weightedArrayElement([
    { value: 10, weight: 5 },
    { value: 100, weight: 4 },
    { value: 1000, weight: 1 },
  ]);
  // this multiplier makes transactions either an income or an expense
  const multiplier = faker.helpers.weightedArrayElement([
    { value: 1, weight: 5 },
    { value: -1, weight: 95 }, // more often we have expenses than income
  ]);
  const isExpense = multiplier === -1
  const isIncome = !isExpense;
  return Number.parseFloat(
    faker.finance.amount({
      min: isIncome ? 100 : 0,
      max: isIncome ? 3000 : expenseAmountRange,
      autoFormat: false,
    })
  ) * multiplier;
}

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

  return {
    ref: faker.string.uuid(),
    iban: faker.finance.iban(),
    date: date.toISOString().split('T')[0],
    amount: generateAmount(),
    balance: '',
    contra_account: faker.person.fullName(),
    description: faker.finance.transactionDescription(),
    comments: faker.lorem.sentence(),
    icon: '',
    category: faker.helpers.arrayElement(categories),
    label: '',
    import_date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
    hours: '',
    disabled: '',
    contra_iban: faker.finance.iban(),
    currency: faker.finance.currencyCode(),
    ...overrides,
  };
}

type GenerateOptions = {
  years: number
  overrides: Partial<FireTransaction>
  generateIncome?: boolean
}

function generateYearlyTransactions({
  years = 1,
  overrides,
  generateIncome = true,
}: GenerateOptions): Array<FireTransaction> {
  const transactions: Array<FireTransaction> = [];

  const thisYear = new Date().getFullYear()
  // we start with the past years
  const startYear = new Date().getFullYear() - years

  // loop through the years until we hit current this year
  // this generates transactions for the amount of years indicated up until current year
  for (let loopYear = startYear; loopYear <= thisYear; loopYear++) {
    // keep count of how many transactions we generate for each year
    let yearlyTransactionCount = 0;

    // loop over 12 months (starting at 0 until 11)
    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(month, loopYear)

      // generate random amount of transaction for each month
      const transactionsAmount = randomNumber(5, 40);

      if (generateIncome) {
        // simulate an income transaction every month
        transactions.push(createTransaction({
          ...overrides,
          date: formatDate(new Date(loopYear, month, 25)),
          amount: 2320,
          category: categories[2]
        }))
        yearlyTransactionCount++;
      }

      // amount of transactions per month
      for (let i = 0; i <= transactionsAmount; i++) {
        const randomDay = randomNumber(1, daysInMonth);
        transactions.push(createTransaction({
          ...overrides,
          date: formatDate(new Date(loopYear, month, randomDay)),
        }))
      }
      yearlyTransactionCount += transactionsAmount;
    }

    console.log(`generated ${yearlyTransactionCount} transactions in year ${loopYear}`)
  }

  return transactions;
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

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const transactions: Array<FireTransaction> = [];

  for (const [name, iban] of Object.entries(fakeBankAccounts)) {
    console.log(`generating transactions for "${name}" (${iban})`)
    const bankTransactions = generateYearlyTransactions({
      years: 5,
      overrides: { iban },
      // receive income on the ING bank account only
      generateIncome: name === 'ING'
    })
    transactions.push(...bankTransactions)
    // const csvData = transactionsToCsv(bankTransactions)
    // const fileName = `${name.toLowerCase().replaceAll(' ', '_')}.csv`
    // const filePath = `${outDir}/${fileName}`
    // console.log(`Writing transactions to file 📝 (${fileName})`);
  }

  const csvData = transactionsToCsv(transactions)
  fs.writeFileSync('transactions.csv', csvData)

  console.log('Done 🎉');
}
