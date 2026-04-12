import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'storybook-static/',
      'worktrees/',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Point to the tsconfig.json file for TypeScript parsing
        // This is necessary when working with worktrees to ensure ESLint can find the correct TypeScript configuration
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Error on unused variables, but allow variables and arguments starting with "_"
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Sonar Cloud recommended rules
      'complexity': ['error', 15],
      // End Sonar Cloud rules
    },
  },
])
