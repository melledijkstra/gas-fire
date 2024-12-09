import { Table } from '@/common/types';

// prettier-ignore
export const fakeN26ImportWithBalance: Table = [
  ['', '', '', '', '', '', '', '20', ''],
  ['', '', '', '', '', '', '', '-25.6'],
  ['', '', '', '', '', '', '', '+58.30', '', '', ''],
  [],
];

// prettier-ignore
export const N26ImportMock: Table = [
  ['Date','Payee','Account number','Transaction type','Payment reference','Amount (EUR)','Amount (Foreign Currency)','Type Foreign Currency','Exchange Rate'],
  ['2023-11-26','Supermarket X','','MasterCard Payment','-','-11.63','-11.63','EUR','1.0'],
  ['2023-11-26','Restaurant X','','MasterCard Payment','','-13.08','-13.08','EUR','1.0'],
  ['2023-11-26','Restaurant XXI','','MasterCard Payment','-','-26.5','-26.5','EUR','1.0'],
  ['2023-11-26','Supermarket Y','','MasterCard Payment','','-9.3','-9.3','EUR','1.0'],
];
