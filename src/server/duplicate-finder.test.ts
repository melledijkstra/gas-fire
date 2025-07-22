import { describe, expect } from 'vitest';
import { findDuplicates, generateDuplicateHash } from './duplicate-finder';
import type { FireColumn } from '@/common/constants';
import type { Table } from '@/common/types';

const days = (days: number) => days * 24 * 60 * 60 * 1000;

describe('generateDuplicateHash', () => {
    test('should generate a hash based on specified columns', () => {
        const headers: FireColumn[] = ['ref', 'contra_account', 'date'];
        const row = ['1', 'Alice', '2023-01-01T00:00:00Z'];
        const columns: FireColumn[] = ['ref', 'contra_account'];
        const hash = generateDuplicateHash(headers, row, columns);
        expect(hash).toBe('1|Alice');
    });
});

describe('findDuplicates', () => {
    test('should find duplicates within the specified timespan', () => {
        const table = [
            ['ref', 'contra_account', 'amount', 'date'],
            ['1', 'Alice', '-1.25', '2023-01-01'],
            ['2', 'Alice', '23', '2023-01-01'],
            ['3', 'Bob', '-30', '2023-01-01']
        ];
        const compareCols: FireColumn[] = ['contra_account'];
        const timespan = days(2); // 2 days
        const duplicates = findDuplicates(table, compareCols, timespan);
        expect(duplicates).toEqual([
            ['1', 'Alice', '-1.25', '2023-01-01'],
            ['2', 'Alice', '23', '2023-01-01']
        ]);
    });

    test('should not find duplicates if timespan is exceeded', () => {
        const table = [
            ['ref', 'contra_account', 'date'],
            ['1', 'Alice', '2023-01-01'],
            ['2', 'Alice', '2023-01-03'],
            ['3', 'Bob', '2023-01-01']
        ];
        const columns: FireColumn[] = ['contra_account'];
        const timespan = days(1);
        const duplicates = findDuplicates(table, columns, timespan);
        expect(duplicates).toEqual([]);
    });

    test('should handle an empty table', () => {
        const table: Table = [];
        const columns: FireColumn[] = ['contra_account'];
        const timespan = days(1);
        const duplicates = findDuplicates(table, columns, timespan);
        expect(duplicates).toEqual([]);
    });

    test('should handle a table with only headers', () => {
        const table = [
            ['ref', 'contra_account', 'date']
        ];
        const columns: FireColumn[] = ['contra_account'];
        const timespan = days(1);
        const duplicates = findDuplicates(table, columns, timespan);
        expect(duplicates).toEqual([]);
    });

    test('should find multiple sets of duplicates', () => {
        const table = [
            ['ref', 'contra_account', 'date'],
            ['1', 'Alice', '2023-01-01'],
            ['2', 'Alice', '2023-01-01'],
            ['3', 'John', '2023-01-01'],
            ['4', 'Bob', '2023-01-01'],
            ['5', 'Bob', '2023-01-02'],
            ['6', 'John', '2023-01-05'],
            ['7', 'Bob', '2023-01-07'],
        ];
        const columns: FireColumn[] = ['contra_account'];
        const timespan = days(1);
        const duplicates = findDuplicates(table, columns, timespan);
        expect(duplicates).toEqual([
            ['1', 'Alice', '2023-01-01'],
            ["2", "Alice", "2023-01-01"],
            ['4', 'Bob', '2023-01-01'],
            ["5", "Bob", "2023-01-02"]
        ]);
    });
});