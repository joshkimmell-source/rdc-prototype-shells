import { createRdcPandaConfig, getPandaIncludePaths } from '@rdc-npm/rdc-ui-v4/theme'

export default createRdcPandaConfig({
  include: [
    './src/**/*.{ts,tsx,js,jsx}',
    ...getPandaIncludePaths(),
  ],
  outdir: 'styled-system',
})
