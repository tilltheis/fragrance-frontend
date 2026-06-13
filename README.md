# Fragrance Collection

Personal fragrance collection browser. Built with React 19, TypeScript, Tailwind CSS v4, and TanStack Query. Data is loaded from a private GitHub repository via the GitHub API.

## Setup

```sh
npm install
```

Copy `e2e/.env.example` to `.env.local` and fill in your GitHub credentials.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server at http://localhost:5173 |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright end-to-end tests (requires `.env.local`) |

## E2E tests

The tests require the dev server to be running (`npm run dev`) and credentials set in `.env.local`:

```sh
# In one terminal
npm run dev

# In another
npm run test:e2e
```

See `e2e/.env.example` for the required variables.
