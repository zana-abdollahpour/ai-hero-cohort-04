# Repository Guidelines

## Project Structure & Module Organization

`app/` contains the React Router application: route modules are in `app/routes/`, reusable UI in `app/components/`, database access and schema in `app/db/`, and domain logic in `app/services/`. Shared helpers live in `app/lib/`. Tests sit beside the code they cover as `*.test.ts`; shared Vitest setup is in `app/test/`. Static assets belong in `public/`, SQL migrations and Drizzle metadata in `drizzle/`, and database seeding in `scripts/seed.ts`.

## Build, Test, and Development Commands

Use pnpm (Node.js 22+; pnpm 9+), as pinned by `packageManager`.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the local server at `http://localhost:5173`.
- `pnpm build` creates the production build; `pnpm start` serves it.
- `pnpm typecheck` generates React Router types and runs TypeScript checks.
- `pnpm test` runs Vitest once; `pnpm test:watch` starts watch mode.
- `pnpm db:migrate` applies database migrations; `pnpm db:seed` loads sample data.

For a fresh local database, run migrations before seeding.

## Coding Style & Naming Conventions

Use TypeScript with strict checks enabled. Format with Prettier: two spaces, double quotes, semicolons, trailing commas where supported, and an 80-character print width. Follow existing names: React components and route files use kebab/dotted route naming as appropriate; services use camelCase names (for example, `courseService.ts`); tests use the matching module name plus `.test.ts`. Use the `~/` alias for imports from `app/`.

## Testing Guidelines

Vitest is the test runner. Add focused tests beside the service or utility being changed, following `*.test.ts`. Run `pnpm test` for the full suite and `pnpm typecheck` for type validation. No repository-wide coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent commits use short, direct subjects, usually imperative (for example, “Add lesson commenting”); keep commits similarly concise and focused. Pull requests should explain the user-visible change and relevant implementation details, link an issue or lesson context when available, and include screenshots for UI changes. Mention database migrations or setup steps when applicable.

## Security & Configuration Tips

Keep secrets and local credentials out of commits. This app uses SQLite through Drizzle; review schema changes and include generated migrations under `drizzle/`. Do not commit local database artifacts such as `data.db`, `data.db-shm`, or `data.db-wal`.
