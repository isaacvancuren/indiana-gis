import tseslint from 'typescript-eslint'

export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['apps/web/**', '**/dist/**', '**/node_modules/**'],
})
