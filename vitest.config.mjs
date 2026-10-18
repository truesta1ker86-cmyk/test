import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Angular supplies compiled bundles through a Vite plugin. Hashing only the
    // source spec can reuse a bundle after one of its imported components changes.
    fsModuleCache: false,
  },
});
