import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { importX } from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Build outputs; node_modules is ignored by default.
  { ignores: ['**/dist/', '**/lib/'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The base parser contract deliberately types messages and payloads as
      // `any`; the unsafe-* family would only restate that decision on every
      // line the payload flows through, so it is off. Async correctness rules
      // (no-floating-promises, no-misused-promises, require-await) stay on.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    plugins: { 'import-x': importX },
    rules: {
      // @curly-message/parser is the only runtime dependency; any other bare
      // import reachable from src/ is a bug.
      'import-x/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.config.ts',
          '**/*.config.js',
          'tests/**',
        ],
      }],
    },
  },
  {
    // The formatting contract shared across the sveltekit-i18n repos.
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/eol-last': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
    },
  },
  {
    // The `Parser` type is a namespace, as base spells its own types.
    files: ['src/types.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      // The `Factory` generics default to `{}` by design.
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // Plain JS (this config, the tsup config) sits outside tsconfig's program
    // (no allowJs) — lint it untyped, with node globals so no-undef doesn't
    // fire on console/process in one-off scripts.
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
);
