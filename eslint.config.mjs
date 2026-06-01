import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const ignoredPaths = [
  '.next/**',
  'node_modules/**',
  'release/**',
  'out/**',
  'HP71/build/**',
  'HP71/dist/**',
  'tsconfig.tsbuildinfo',
];

const eslintConfig = [
  {
    ignores: ignoredPaths,
  },
  ...compat.extends('next/core-web-vitals'),
];

export default eslintConfig;
