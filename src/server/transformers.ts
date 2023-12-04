import { detectCategoryByTextAnalysis } from './category-detection';

export class Transformers {
  static transformMoney(
    value: string,
    decimalSeparator: string = '.',
    thousandSeparator: string = ','
  ): number {
    const thousandReplace = value.replace(
      new RegExp(`\\${thousandSeparator}`, 'g'),
      ''
    );
    const decimalReplace = thousandReplace.replace(decimalSeparator, '.');
    const parsed = parseFloat(decimalReplace);

    return parsed;
  }

  static transformDate(value: string, separator: string = '/'): Date {
    const [day, month, year] = value.split(separator);
    return new Date(+year, +month - 1, +day);
  }

  static transformCategory(value: string): string | null {
    return detectCategoryByTextAnalysis(value) ?? null;
  }
}
