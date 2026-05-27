# Family Housing Hub

A family housing management platform with a React web app, Python backend, Firebase Cloud Functions, and an Expo mobile app.

## Repository structure

| Path | Description |
|------|-------------|
| `src/` | React + Vite web application |
| `backend/` | Python API (Render deployment) |
| `functions/` | Firebase Cloud Functions |
| `mobile/` | Expo (React Native) mobile app |
| `shared/` | Shared utilities (web + mobile) |
| `public/` | Static web assets |
| `tests/` | Vitest unit tests and Playwright e2e |
| `docs/` | Project documentation (see [docs/README.md](docs/README.md)) |

## Quick start

### Web app

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Build for production:

```bash
npm run build
```

### Backend

See [backend/README.md](backend/README.md) and [docs/setup/BACKEND_ENV_SETUP.md](docs/setup/BACKEND_ENV_SETUP.md).

### Firebase Functions

```bash
cd functions && npm install
```

### Mobile (Expo)

```bash
cd mobile && npm install
npm run start
```

See [mobile/README.md](mobile/README.md).

## Documentation

All guides, setup notes, and archived status reports live under **`docs/`**:

- [docs/setup/](docs/setup/) — environment, APIs, integrations
- [docs/deployment/](docs/deployment/) — Firebase, Render, AWS legacy
- [docs/architecture/](docs/architecture/) — features and system design
- [docs/testing/](docs/testing/) — testing guides and checklists
- [docs/troubleshooting/](docs/troubleshooting/) — common fixes
- [docs/archive/](docs/archive/) — historical status reports and legacy AWS/Cognito docs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Configuration

- `firebase.json`, `firestore.rules`, `storage.rules` — Firebase
- `render.yaml` — backend on Render
- `vite.config.js` — web bundler
- `.env.example` — template for local env vars (never commit real `.env` files)
