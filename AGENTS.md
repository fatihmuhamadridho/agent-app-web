# Repo Rules

## Feature Structure

- Use a feature-based structure under `src/features/<feature>`.
- Keep business/data flow in `domain` and `infrastructure`.
- Keep UI in `views`.
- `src/pages` should stay thin and only mount the feature page component.

## View Layer Rules

- Treat `views/pages` as the only place for page-level logic.
- Page logic may include:
  - data fetching hooks
  - context reads/writes
  - mapping domain data into UI-specific interfaces
  - pagination state
  - metadata such as `<Head>`
- `views/templates` must only compose UI sections.
- `views/organisms`, `views/molecules`, and `views/atoms` must stay presentational.
- Do not put business logic in `atoms`, `molecules`, `organisms`, or `templates`.
- Do not import domain types directly into `views`; define UI-specific interfaces in `views/interfaces` instead.

## UI Composition

- Prefer Mantine components over raw HTML when there is an equivalent.
- Use raw HTML only when Mantine does not fit the use case.
- Keep components small and purpose-specific.
- Split UI by responsibility:
  - `atoms` for small visual pieces
  - `molecules` for reusable grouped UI
  - `organisms` for larger sections
  - `templates` for page composition
  - `pages` for data and state orchestration

## Styling

- Use SCSS modules for component styling.
- Name SCSS files after the component only, for example:
  - `ProductCard.module.scss`
  - `HomeHeader.module.scss`
- Do not add `atom`, `molecule`, `organism`, or `template` prefixes to SCSS filenames.
- Prefer Tailwind utilities inside SCSS via `@apply`.
- Add `@reference "../../../../styles/globals.css";` at the top of SCSS modules that use Tailwind utilities.
- Keep styling local to each component.
- Avoid one shared styling file for multiple components.
- Use inline styles or Mantine `styles` / `vars` only when the component API needs it or the style cannot be expressed reliably in SCSS.
- If a Mantine component is hard to override with SCSS, prefer the component’s own style API before adding hacks.

## TypeScript

- Follow strict TypeScript practices.
- Type props explicitly once a component becomes reusable or non-trivial.
- Keep UI-facing interfaces in `views/interfaces`.
- Keep domain types in `domain`.
- Prefer `import type` for types that are only used at compile time.

## React / Next.js

- Use `next/head` for page metadata when needed.
- Keep route files thin.
- Use default export for page components only when the route requires it.
- Prefer named exports for feature components.
- Keep React Query configuration close to the feature hook.

## Workflow

- Run lint after larger refactors.
- Run Prettier and TypeScript checks before finishing work.
- Do not run production builds unless the user explicitly asks for it.
- Leave `build` to the user.

## Git

- Do not run `git add` unless explicitly requested.
- When asked to commit, write a message that reflects the actual changes.
- Push only when the user asks for it.
