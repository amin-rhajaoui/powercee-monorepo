# Project Context

PowerCEE is a Multi-tenant B2B SaaS for Energy Renovation companies (CEE).

## Core Philosophy
1. **Simplicity First**: We are building an MVP. Avoid over-engineering.
2. **Strict Separation**: Frontend (Next.js) is dumb, Backend (FastAPI) is smart.
3. **Monorepo**: Single repo, clear folder separation (/front, /back).

## Workflows
- **Auth**: JWT HttpOnly Cookies.
- **Payment**: Stripe is the source of truth for subscriptions.
- **Deployment**: git push triggers deploy (Vercel/Render).