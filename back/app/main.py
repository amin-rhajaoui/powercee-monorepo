from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="PowerCEE API",
    description="Backend API for PowerCEE - SaaS B2B Energy Renovation",
    version="0.1.0",
)

# Configuration CORS
# On n'autorise que le frontend défini dans les settings et le local de développement
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes (GET, POST, etc.)
    allow_headers=["*"],  # Autorise tous les headers
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """
    Route de santé pour vérifier que l'API est opérationnelle.
    Utilisée par les load balancers ou les outils de monitoring.
    """
    return {"status": "ok"}

