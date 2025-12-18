from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers import auth, users

app = FastAPI(
    title="PowerCEE API",
    description="Backend API for PowerCEE - SaaS B2B Energy Renovation",
    version="0.1.0",
)

# Configuration CORS
# SECURITY: Explicit origins only
origins = [
    settings.FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes (GET, POST, etc.)
    allow_headers=["*"],  # Autorise tous les headers
)

# Enregistrement des routers
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """
    Route de santé pour vérifier que l'API est opérationnelle.
    Utilisée par les load balancers ou les outils de monitoring.
    """
    return {"status": "ok"}

