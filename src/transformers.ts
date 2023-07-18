class Transformers {
  static transformMoney = (value: string, decimalSeparator: string = ',') =>
    parseFloat(value.replace(/\./g, '').replace(decimalSeparator, '.'));

  static transformDate = (value: string, separator: string = '/'): Date => {
    const [day, month, year] = value.split(separator);
    return new Date(+year, +month - 1, +day);
  };

  static transformCategory = (value: string): string | undefined =>
    detectCategoryByTextAnalysis(value);
}
