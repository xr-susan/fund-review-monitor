# Contributing

Thanks for considering a contribution.

## Local setup

1. Install Node.js 18 or newer.
2. Install dependencies:

```bash
npm run install:all
```

3. Copy environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Start the backend and frontend in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

## Before opening a pull request

Run the checks that match your change:

```bash
npm test
npm run build
```

Please keep pull requests focused. Small fixes with clear descriptions are easier to review and merge.
