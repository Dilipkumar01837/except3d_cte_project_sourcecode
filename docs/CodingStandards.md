# Coding Standards

## TypeScript

- Strict mode enabled across all packages
- Use `type` imports for type-only imports
- No `any` — use proper types or `unknown`
- No TODO comments in committed code

## Naming

- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

## Imports

- Workspace packages use `@code-to-escape/*` scope
- Prefer absolute imports via path aliases in apps

## Formatting

- Prettier with single quotes, trailing commas, 100 char width
- ESLint flat config with TypeScript strict rules

## Commits

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
