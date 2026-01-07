# PowerCEE Monorepo – Claude Instructions

## Project Overview
PowerCEE is a SaaS web application.
This repository is a monorepo containing frontend and backend applications.

## Tech Stack
- Frontend: Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui
- Backend: Node.js, TypeScript, API (REST)
- Database: PostgreSQL
- ORM: Prisma
- Auth: (to be defined)
- Deployment:
  - Frontend: Vercel
  - Backend: Render

## Monorepo Structure
- apps/frontend → Next.js frontend
- apps/backend → API backend
- packages/ → shared code (types, utils, config)

## Coding Rules
- Always use TypeScript
- Use functional React components
- Prefer server components when possible
- Use shadcn/ui components for UI
- Do not introduce new libraries without explanation
- Keep code clean, readable, and documented

## Database Rules
- All database access goes through Prisma
- No raw SQL unless strictly necessary
- Migrations must be explicit and safe

## Git Rules
- Do not modify files outside the requested scope
- Explain each change clearly
- Prefer small, incremental changes

## UX & Product
- SaaS-first UX
- Simple, clean, professional UI
- Accessibility matters
- Forms must have validation and feedback

## What Claude Can Do
- Analyze existing code
- Propose architecture improvements
- Write production-ready code
- Suggest shadcn/ui components
- Help with UX decisions

## What Claude Must Not Do
- Rewrite the whole project without request
- Introduce breaking changes silently
- Add unnecessary complexity