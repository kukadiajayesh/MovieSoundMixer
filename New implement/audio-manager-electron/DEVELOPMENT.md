# Development Guide

This document describes how to set up your development environment and the general architecture of the project.

## Architecture
This project uses Electron with a React frontend. The application is divided into:
- Main Process (Node.js)
- Renderer Process (React)
- Shared UI / Types

## Setup
1. Clone the repository
2. Run `npm install`
3. Run `npm run dev` to start Vite dev server
4. Run `npm run electron:dev` in another terminal to launch Electron with devtools

## Code Formatting and Linting
We use ESLint and Prettier. VSCode users should install the recommended extensions.
Run formatting manually via:
```bash
npx prettier --write .
npx eslint . --fix
```

## Testing
We use Jest and React Testing Library for frontend tests, and Playwright for E2E testing (setup pending in future phases).

## Build
To build for production:
```bash
npm run build
```
