# Backend Guidelines (Python/FastAPI)

## Naming Conventions
- Variables/Functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_CASE`

## Architecture: Modular Monolith
- Structure code by business domain in `app/modules/`.
- NO circular dependencies.

## Coding Standards
1. **Typing**: Use strict type hints (`def func(a: int) -> str:`).
2. **Async**: Use `async def` for all route handlers and DB calls.
3. **Pydantic**: EVERY input and output must have a Pydantic Schema.
4. **Error Handling**: Raise `HTTPException` with clear detail, never return generic 500s manually.
5. **No Logic in Routes**: Routes should only call Services/Controllers.