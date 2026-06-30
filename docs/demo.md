# Demo Guide

This project is designed to be easy to demo locally or deploy to a small self-hosted environment.

## Local demo

```bash
npm run install:all
npm run dev:backend
npm run dev:frontend
```

Open http://localhost:3001 and sign in with the local demo account:

- Username: `admin`
- Password: `admin123`

Change the default password and `JWT_SECRET` before exposing the app to anyone else.

## Docker demo

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000.

## Online demo options

The app has a separate frontend and backend:

- Frontend: deploy `frontend/` to Vercel, Netlify, or Cloudflare Pages.
- Backend: deploy `backend/` to Render, Fly.io, Railway, or a small VPS.
- Database: use the bundled SQLite file for personal demos. For public multi-user usage, migrate to a managed database.

Set `VITE_API_URL` in the frontend host to the public backend URL.
