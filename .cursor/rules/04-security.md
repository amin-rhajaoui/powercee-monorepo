# Security Rules (NON-NEGOTIABLE)

1. **Secrets**: Never commit `.env` files. No API keys in code.
2. **Tenant Isolation**: Every DB query must filter by `tenant_id`.
3. **Authorization**: Check permissions (RBAC) in the Backend, not just hiding buttons in the Frontend.
4. **Dependencies**: Stick to pinned versions in requirements.txt/package.json.
5. **Input Sanitization**: Rely on Pydantic and Zod to strip malicious inputs.