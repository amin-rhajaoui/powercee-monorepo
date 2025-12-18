# Frontend Guidelines (Next.js/React)

## Naming Conventions
- Components: `PascalCase.tsx`
- Functions/Hooks: `camelCase`
- Folders (App Router): `kebab-case`

## Coding Standards
1. **Server Components**: Use Server Components by default. Add `'use client'` only when interaction is needed.
2. **Strict TS**: No `any`. Define interfaces for props.
3. **UI**: Use Shadcn components. Do not invent custom CSS classes unless Tailwind is insufficient.
4. **Data Fetching**: Create typed fetchers in `src/lib/api`.
5. **No Direct DB Access**: NEVER import DB libraries in frontend code.