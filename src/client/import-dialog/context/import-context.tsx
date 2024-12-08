import { createContext, ReactNode, useContext, useState } from 'react';
import { Table } from '@/common/types';

type ImportContextProps = {
  statusText?: string;
  setStatusText: (value: string) => void;
  importData?: Table;
  setImportData: (table?: Table) => void;
  accountOptions: Record<string, string>;
  selectedAccount?: string;
  setSelectedAccount: (selectedBank: string) => void;
  selectedRows: Set<number>;
  addSelectedRow: (index: number) => void;
  removeSelectedRow: (index: number) => void;
  setSelectedRows: (rows: Set<number>) => void;
};

const ImportContext = createContext<ImportContextProps | undefined>(undefined);

type ProviderProps = {
  accountOptions: Record<string, string>;
  statusText?: string;
  setStatusText: (value: string) => void;
  children: ReactNode;
};

export const ImportContextProvider = ({
  children,
  accountOptions,
  statusText,
  setStatusText,
}: ProviderProps) => {
  const [importData, _setImportData] = useState<Table | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<string>();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const setImportData = (table?: Table) => {
    _setImportData(table);
    setSelectedRows(new Set());
  };

  const addSelectedRow = (index: number) => {
    setSelectedRows((prevSelectedRows) => {
      const newSelectedRows = new Set(prevSelectedRows);
      newSelectedRows.add(index);
      return newSelectedRows;
    });
  };

  const removeSelectedRow = (index: number) => {
    setSelectedRows((prevSelectedRows) => {
      const newSelectedRows = new Set(prevSelectedRows);
      newSelectedRows.delete(index);
      return newSelectedRows;
    });
  };

  return (
    <ImportContext.Provider
      value={{
        importData,
        setImportData,
        accountOptions,
        statusText,
        setStatusText,
        selectedAccount,
        setSelectedAccount,
        selectedRows,
        addSelectedRow,
        removeSelectedRow,
        setSelectedRows,
      }}
    >
      {children}
    </ImportContext.Provider>
  );
};

export const useImportContext = (): ImportContextProps => {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImportContext must be used within an ImportProvider');
  }
  return context;
};
