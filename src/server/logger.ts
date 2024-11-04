export class Logger {
  private static isEnabled: boolean = process.env.APP_ENV === 'development';

  static log(message?: any, ...optionalParams: any[]): void {
    if (this.isEnabled) {
      console.log(`[FIRE]:`, message, ...optionalParams);
    }
  }

  static enable(): void {
    this.isEnabled = true;
  }

  static disable(): void {
    this.isEnabled = false;
  }

  static reset(): void {
    this.isEnabled = process.env.APP_ENV === 'development';
  }
}
