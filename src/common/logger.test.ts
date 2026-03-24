import { Logger } from './logger';

describe('Logger', () => {
  let originalEnv: boolean;

  const consoleSpy = vi.spyOn(console, 'log');
  consoleSpy.mockImplementation(() => {
    // no-op, prevent logging when running tests
  });

  const consoleErrorSpy = vi.spyOn(console, 'error');
  consoleErrorSpy.mockImplementation(() => {
    // no-op, prevent logging when running tests
  });

  beforeEach(() => {
    originalEnv = import.meta.env.DEV;
    consoleSpy.mockImplementation(() => {});
    consoleErrorSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    import.meta.env.DEV = originalEnv;
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  test('should log message when enabled', () => {
    Logger.enable();
    Logger.log('Test message');
    expect(consoleSpy).toHaveBeenCalledWith('[FIRE]:', 'Test message');
  });

  test('should not log message when disabled', () => {
    Logger.disable();
    Logger.log('Test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('should log error when enabled', () => {
    Logger.enable();
    Logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[FIRE ❌]:', 'Test error message');
  });

  test('should not log error when disabled', () => {
    Logger.disable();
    Logger.error('Test error message');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('should enable logging', () => {
    Logger.enable();
    expect(Logger['isEnabled']).toBe(true);
  });

  test('should disable logging', () => {
    Logger.enable();
    Logger.disable();
    expect(Logger['isEnabled']).toBe(false);
  });

  test('should log message if in development', () => {
    import.meta.env.DEV = true;
    Logger.reset();
    Logger.log('Test message');
    expect(consoleSpy).toHaveBeenCalledWith('[FIRE]:', 'Test message');
  });

  test('should not log message if not in development', () => {
    import.meta.env.DEV = false;
    Logger.reset();
    Logger.log('Test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('should log error if in development', () => {
    import.meta.env.DEV = true;
    Logger.reset();
    Logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[FIRE ❌]:', 'Test error message');
  });

  test('should not log error if not in development', () => {
    import.meta.env.DEV = false;
    Logger.reset();
    Logger.error('Test error message');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
