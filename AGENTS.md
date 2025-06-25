# Codex Agent Guidelines

This repository is a Vue 3 project built with Vite. It uses ESLint and Prettier for code style and includes several Node scripts for Firebase utilities.

## Development setup
- Install dependencies using `npm install`.
- Start a dev server with `npm run dev` and build production assets via `npm run build`.
- Use `npm run lint` to run ESLint with auto-fix. Use `npm run format` to apply Prettier.

## Code style
- Formatting is enforced by `.prettierrc.json`:
  - Use **tabs** for indentation (tab width 4).
  - No semicolons.
  - Single quotes for strings.
  - Print width is 100 characters.
  - No trailing commas.
- Vue components use `<script setup>` syntax and are named with `PascalCase`.
- Keep HTML and SCSS classes consistent with the existing Tailwind usage.

## Commit checklist
1. Run `npm run lint` and ensure there are no errors.
2. Optionally run `npm run format` to apply Prettier formatting.
3. Ensure the project builds with `npm run build`.
4. Do **not** commit `node_modules`, build output, or `service-account.json`.

## Node scripts
Utility scripts reside in `scripts/` and interact with Firebase. They require a local `service-account.json` file that should never be committed. Set `DRY_RUN` to `true` when testing these scripts.

