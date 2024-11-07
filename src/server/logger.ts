export class Logger {
  private static isEnabled: boolean = import.meta.env.DEV;

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
    this.isEnabled = import.meta.env.DEV;
  }
}
