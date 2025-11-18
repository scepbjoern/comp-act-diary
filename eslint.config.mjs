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
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...typescriptEslint.configs.recommended,

  // Global rule adjustments
  {
    rules: {
      // Allow gradual typing; surface as warnings for now
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow intentionally unused via leading underscore, warn otherwise
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
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
]