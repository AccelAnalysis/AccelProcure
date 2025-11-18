# Documentation Overview

## Jest Installation & Testing Guide

The project already lists Jest and its required companions (e.g., `jest`, `babel-jest`, `jest-environment-jsdom`, `@testing-library/*`) in `package.json`. That means the preferred way to get Jest is simply to install all project dependencies:

```bash
# From the repo root
npm install
```

The command above pulls every dependency (including Jest) into `node_modules`. If you want to install only the testing stack, run:

```bash
npm install --save-dev jest@29.7.0 jest-environment-jsdom@29.7.0 babel-jest@29.5.0 @babel/preset-env@7.22.0 identity-obj-proxy@3.0.0
```

> **Tip:** Yarn works as well: `yarn install` (or `yarn add --dev jest@29.7.0 ...`).

After dependencies install successfully, you can execute the service smoke tests that live in `src/services/__tests__/services.test.js`.

```bash
npm test
# or
npx jest src/services/__tests__/services.test.js
```

If you encounter network-restriction errors (for example, private registries or offline CI runners), mirror the dependencies in an internal registry or use a package manager cache (`npm config set cache <path>` and seed it from an environment with internet access). Once the packages are available locally, rerun `npm install` and then `npm test`.

## Live map insight references

* [`docs/LIVE_MAP_INSIGHTS.md`](./LIVE_MAP_INSIGHTS.md) documents how the `/ai/map-insights` endpoints, schemas, and mock payloads connect to the new overlay/metrics components in the UI.
