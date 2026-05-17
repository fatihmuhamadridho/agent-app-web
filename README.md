# agent-app-web

A Next.js boilerplate for general-purpose work, whether it is a client project or a personal project.

This repository follows:

- Clean Architecture for data flow and business logic
- Atomic Design for UI structure
- Feature-based structure to keep each feature isolated

## Tech Stack

- Next.js
- React
- TypeScript
- Mantine
- React Query
- SCSS Modules
- Tailwind CSS v4
- Sass

## Architecture Overview

### 1. Clean Architecture

The application layers are separated to keep the dependency flow clear:

- `domain`
  - contains entities, interfaces, repository contracts, use cases, and controllers
  - this is the core business layer
- `infrastructure`
  - contains repository implementations, data fetching hooks, and API access
  - this layer handles technical details
- `views`
  - contains the UI layer
  - used only for rendering, component composition, and UI state

### 2. Atomic Design

The UI is split into several levels:

- `atoms`
  - small and simple UI components
- `molecules`
  - reusable combinations of atoms
- `organisms`
  - larger and more specific UI sections
- `templates`
  - page composition
- `pages`
  - page-level logic, data fetching, context orchestration, and mapping data to UI interfaces

## Folder Structure

```txt
src/
  common/
    configs/
    contexts/
    interfaces/
    libs/
    services/
    utils/
  core/
    domain/
    infrastructure/
  features/
    Home/
      domain/
      infrastructure/
      views/
        atoms/
        molecules/
        organisms/
        templates/
        pages/
        interfaces/
  pages/
  styles/
```

## Feature Rules

- Use a feature-based structure.
- Keep all data and business logic in `domain` and `infrastructure`.
- Keep all page-level UI logic in `views/pages`.
- `views/templates` must only compose UI sections.
- `views/atoms`, `views/molecules`, and `views/organisms` must stay presentational.
- Do not import domain types directly into `views`.
- Define UI-specific interfaces in `views/interfaces` instead.

## Data Flow

The repository follows this flow:

1. `page` reads state and calls data hooks
2. `infrastructure` performs the request or React Query call
3. `controller` and `use case` process the data
4. `repository` handles API access
5. `page` maps domain data into UI interfaces
6. `template` assembles the UI sections
7. `atoms` through `organisms` receive props and render UI only

## UI Rules

- Prefer Mantine components when an equivalent exists.
- Use raw HTML only when Mantine is not a good fit.
- Style each component locally rather than using one shared file for an entire feature.
- Name SCSS modules after the component only, for example:
  - `ProductCard.module.scss`
  - `HomeHeader.module.scss`
- Do not add `atom`, `molecule`, `organism`, or `template` prefixes to SCSS filenames.
- Use SCSS Modules as the main styling location.
- Tailwind utilities may be used inside SCSS via `@apply`.
- If an SCSS module uses Tailwind utilities, add:
  - `@reference "../../../../styles/globals.css";`

## TypeScript Rules

- Follow strict TypeScript practices.
- Type props explicitly once a component becomes reusable or non-trivial.
- Keep UI-facing interfaces in `views/interfaces`.
- Keep domain types in `domain`.
- Prefer `import type` for type-only imports.

## Next.js Rules

- Use `next/head` when page metadata is needed.
- Keep route files in `src/pages` thin.
- Export the feature page component when possible.
- Do not place large logic in route files.

## Workflow Rules

- Run lint after larger refactors.
- Run Prettier and TypeScript checks before finishing work.
- Do not run production builds unless the user explicitly asks for it.
- Leave `build` to the user.

## Example Feature Flow

For the Home feature:

- `src/features/Home/domain`
  - contract, use case, controller, model, interface
- `src/features/Home/infrastructure`
  - repository implementation, React Query hooks
- `src/features/Home/views/pages`
  - fetch data, handle page state, map domain data to UI interfaces
- `src/features/Home/views/templates`
  - assemble header, list, and pagination
- `src/features/Home/views/atoms|molecules|organisms`
  - render UI based on props
