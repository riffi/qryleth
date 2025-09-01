import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Запрещаем старый неймспейс object-editor извне (используем editor/object)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/object-editor/*'],
              message: 'Используйте новый неймспейс: \'@/features/editor/object/*\''
            },
          ],
        },
      ],
    },
  },
])
