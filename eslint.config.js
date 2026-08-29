import { config } from '@kolhe/eslint-config'

export default config(
  [
    {
      files: ['src/**/*.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    },
    {
      // web/ is a separate Vite app with its own linter (oxlint) and React conventions.
      ignores: ['web/**']
    }
  ],
  {
    prettier: true,
    markdown: true
  }
)
