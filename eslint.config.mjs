import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'public/**', 'tsconfig.tsbuildinfo'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {},
  },
)
