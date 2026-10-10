import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**']),
  {
    // App EVO original (rastreador pessoal de dieta). Preservado sem alterações de
    // comportamento; as regras abaixo ficam como aviso para não reescrever código legado.
    files: ['app/(legacy)/**', 'components/legacy/**', 'lib/legacy/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
