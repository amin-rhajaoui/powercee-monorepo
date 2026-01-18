from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers import auth, users, upload, tenants, agencies, invitations, clients, properties, module_drafts, folders, sizing, products, recommendations, technical_surveys, valuation, module_settings, quote, quote_drafts

app = FastAPI(
    title="PowerCEE API",
    description="Backend API for PowerCEE - SaaS B2B Energy Renovation",
    version="0.1.0",
)

# Configuration CORS
# SECURITY: Explicit origins only
# Note: Les applications mobiles React Native n'envoient pas d'origin header,
# donc elles ne sont pas affectées par CORS. On liste ici les origines web uniquement.
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.10:3000",
    # Ajoutez ici d'autres adresses IP si nécessaire pour le développement mobile
    # Les requêtes depuis l'app mobile React Native ne nécessitent pas d'être listées ici
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
app.include_router(upload.router)
app.include_router(tenants.router)
app.include_router(agencies.router)
app.include_router(invitations.router)
app.include_router(clients.router)
app.include_router(properties.router)
app.include_router(module_drafts.router)
app.include_router(folders.router)
app.include_router(sizing.router)
app.include_router(products.router)
app.include_router(recommendations.router)
app.include_router(technical_surveys.router)
app.include_router(valuation.router)
app.include_router(module_settings.router)
app.include_router(quote.router)
app.include_router(quote_drafts.router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """
    Route de santé pour vérifier que l'API est opérationnelle.
    Utilisée par les load balancers ou les outils de monitoring.
    """
    return {"status": "ok"}

