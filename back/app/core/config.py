import json
import time
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# #region agent log
def log_debug(hypothesis_id, message, data=None):
    log_path = "/Users/aminrhajaoui/Documents/PowerCee/powercee-monorepo/.cursor/debug.log"
    log_entry = {
        "sessionId": "debug-session",
        "runId": "run_initial",
        "hypothesisId": hypothesis_id,
        "location": "app/core/config.py",
        "message": message,
        "data": data or {},
        "timestamp": int(time.time() * 1000)
    }
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        pass
# #endregion

class Settings(BaseSettings):
    """
    Configuration de l'application utilisant Pydantic Settings.
    Les variables sont chargées depuis l'environnement ou un fichier .env.
    """
    # Configuration de la base de données
    DATABASE_URL: str
    
    # Sécurité et Authentification
    # L'absence de valeur par défaut rend ces champs obligatoires au démarrage
    SECRET_KEY: str
    STRIPE_SECRET_KEY: str
    
    # URLs externes
    FRONTEND_URL: str

    # Configuration de Pydantic Settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

# #region agent log
log_debug("A", "Tentative d'instanciation des Settings", {"env_files": [".env"]})
# #endregion

try:
    # Instance globale pour être importée ailleurs dans l'application
    settings = Settings()
    # #region agent log
    log_debug("A", "Settings chargés avec succès")
    # #endregion
except Exception as e:
    # #region agent log
    log_debug("A", "Erreur lors du chargement des Settings", {"error": str(e)})
    # #endregion
    raise e

