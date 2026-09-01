import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // The package is a CLI: MCP clients launch it directly.
  banner: { js: '#!/usr/bin/env node' },
});
