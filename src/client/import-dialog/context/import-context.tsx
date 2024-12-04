import { createContext, ReactNode, useContext, useState } from 'react';
import { Table } from '@/common/types';

type ImportContextProps = {
  statusText?: string;
  setStatusText: (value: string) => void;
  importData?: Table;
  setImportData: (table?: Table) => void;
  selectedBank?: string;
  setSelectedBank: (selectedBank: string) => void;
  selectedRows: Set<number>;
  addSelectedRow: (index: number) => void;
  removeSelectedRow: (index: number) => void;
  setSelectedRows: (rows: Set<number>) => void;
};

const ImportContext = createContext<ImportContextProps | undefined>(undefined);

type ProviderProps = {
  statusText?: string;
  setStatusText: (value: string) => void;
  children: ReactNode;
};

export const ImportContextProvider = ({
  children,
  statusText,
  setStatusText,
}: ProviderProps) => {
  const [importData, _setImportData] = useState<Table | undefined>();
  const [selectedBank, setSelectedBank] = useState<string>();
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
        statusText,
        setStatusText,
        selectedBank,
        setSelectedBank,
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
