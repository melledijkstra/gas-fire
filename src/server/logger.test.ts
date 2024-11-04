import { Logger } from './logger';

describe('Logger', () => {
  let originalEnv: string | undefined;

  const consoleSpy = vi.spyOn(console, 'log');
  consoleSpy.mockImplementation(() => {
    // no-op, prevent logging when running tests
  });

  beforeEach(() => {
    originalEnv = process.env.APP_ENV;
    Logger.disable();
  });

  afterEach(() => {
    process.env.APP_ENV = originalEnv;
    consoleSpy.mockReset();
  });

  test('should log message when enabled', () => {
    Logger.enable();
    Logger.log('Test message');
    expect(consoleSpy).toHaveBeenCalledWith('[FIRE]:', 'Test message');
  });

  test('should not log message when disabled', () => {
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

  test('should log message if APP_ENV is development', () => {
    process.env.APP_ENV = 'development';
    Logger.reset();
    Logger.log('Test message');
    expect(consoleSpy).toHaveBeenCalledWith('[FIRE]:', 'Test message');
  });

  test('should not log message if APP_ENV is not development', () => {
    process.env.APP_ENV = 'production';
    Logger.reset();
    Logger.log('Test message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
