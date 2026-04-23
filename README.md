# SaaS RFID Check-in

Multi-tenant RFID access control SaaS platform.

## Stack
- Backend: Node.js + TypeScript + Express + Prisma + Socket.IO
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS
- Database: PostgreSQL

## Quick Start (Local)

1. `cp backend/.env.example backend/.env` — fill in values
2. `docker compose up -d`
3. `npm install`
4. `npm run db:push --workspace=backend`
5. `npm run dev --workspace=backend` — API on :3001
6. `npm run dev --workspace=frontend` — UI on :5173

## Deploy on Railway

1. Connect repo at railway.app
2. Add Postgres plugin
3. Set env vars from backend/.env.example
4. Railway auto-detects backend/railway.toml
