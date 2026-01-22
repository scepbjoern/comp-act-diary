// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from 'typescript-eslint'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'public/sw.js',
      '**/*.config.js',
      '**/*.config.mjs',
      'node_modules/**'
    ]
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...typescriptEslint.configs.recommended,

  // Global rule adjustments
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      
      // JavaScript Best Practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-implicit-coercion': 'warn',
    },
  },

  // API routes: allow 'any' to reduce noise until types are introduced
  {
    files: ['app/api/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Markdown/MDX processing: complex unist types make 'any' pragmatic
  {
    files: ['components/MarkdownRenderer.tsx', 'components/RichTextEditor.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // External fonts: Material Symbols needs external loading for custom icon variants
  {
    files: ['app/layout.tsx'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
    },
  },

  // Generated Next types file: allow triple-slash reference
  {
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // Scripts/seed files: allow console and fire-and-forget promises
  {
    files: ['scripts/**/*.{ts,tsx}', 'prisma/seed.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
]