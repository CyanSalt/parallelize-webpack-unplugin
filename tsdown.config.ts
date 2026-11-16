import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/loaders/load.ts',
    'src/loaders/transform.ts',
  ],
  format: ['esm', 'cjs'],
  dts: { tsc: { build: true } },
  deps: {
    neverBundle: [
      'webpack',
    ],
  },
})
