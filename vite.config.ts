import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// Allow overriding the base at build time via the VITE_BASE env var.
// For project pages set VITE_BASE to '/repo-name/'. For user/org pages use '/'.
// @ts-ignore - process is available at build time in Node, but the TS config in this repo
// doesn't include Node lib types. Adding @types/node is an option but is a broader change.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwind()],
})

