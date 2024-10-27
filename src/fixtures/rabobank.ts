import { Table } from '../common/types';

// Iban, Munt, BIC, Volgnr, Datum, RenteDatum, Bedrag, Saldo, Tegenrekening, NaamTegenpartij, NaamUiteindelijkePartij, NaamInitierendePartij, BICTegenpartij, Code, BatchID, TransactieReferentie, MachtigingsKenmerk, IncassantID, BetalingsKenmerk, Omschrijving1, Omschrijving2, Omschrijving3
// prettier-ignore
export const raboImportMock: Table = [
  ['IBAN/BBAN','Munt','BIC','Volgnr','Datum','Rentedatum','Bedrag','Saldo na trn','Tegenrekening IBAN/BBAN','Naam tegenpartij','Naam uiteindelijke partij','Naam initi�rende partij','BIC tegenpartij','Code','Batch ID','Transactiereferentie','Machtigingskenmerk','Incassant ID','Betalingskenmerk','Omschrijving-1','Omschrijving-2','Omschrijving-3','Reden retour','Oorspr bedrag','Oorspr munt','Koers'],
  ['NL12RABO34567890','EUR','RABONL2U','000000000000003088','2024-07-17','2024-07-17','-77,77','+289,53','NL45RAB1234567890','NS GROEP IZ NS REIZIGERS','','','ABNANL2A','ei','','240033842228','200001030142','NL0987654321','','Factuur: 413000204242',' ','','','','',''],
  [''],
];
