import { Logger } from './logger';

describe('Logger', () => {
  let originalEnv: boolean;

  const consoleSpy = vi.spyOn(console, 'log');
  consoleSpy.mockImplementation(() => {
    // no-op, prevent logging when running tests
  });

  beforeEach(() => {
    originalEnv = import.meta.env.DEV;
    consoleSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    import.meta.env.DEV = originalEnv;
    consoleSpy.mockClear();
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
});
