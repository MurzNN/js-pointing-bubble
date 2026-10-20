import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'unplugin-dts/vite'

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      outDirs: ['dist'],
      insertTypesEntry: true,
      bundleTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'PointingBubble',
      fileName: (format) =>
        format === 'es'
          ? 'react-pointing-bubble.js'
          : 'react-pointing-bubble.cjs',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.{spec.ts,spec.tsx}'],
  },
})
