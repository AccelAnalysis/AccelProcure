import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  fetch: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  Headers: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  FormData: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly'
};

const nodeGlobals = {
  module: 'readonly',
  require: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  global: 'readonly',
  console: 'readonly'
};

const jestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly'
};

const jestRecommendedRules = (jestPlugin.configs?.recommended?.rules) || {};

const baseRules = {
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
  'no-undef': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }]
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'build/**']
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...browserGlobals, ...nodeGlobals }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      prettier: prettierPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...baseRules,
      'prettier/prettier': 'error',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always'
        }
      ],
      'import/newline-after-import': ['warn', { count: 1 }],
      'import/no-unresolved': 'error'
    }
  },
  {
    files: ['src/api/**/*.{js,jsx}', 'backend/**/*.js'],
    languageOptions: {
      globals: { ...nodeGlobals }
    }
  },
  {
    files: ['**/*.test.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    plugins: {
      jest: jestPlugin
    },
    languageOptions: {
      globals: { ...nodeGlobals, ...jestGlobals }
    },
    rules: {
      ...baseRules,
      ...jestRecommendedRules
    }
  }
];
