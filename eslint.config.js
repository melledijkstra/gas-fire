// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/common/logger.ts', 'src/server/helpers.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-prototype-builtins': 'off',
    },
  }
);
