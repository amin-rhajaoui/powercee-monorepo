from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Configuration de l'application utilisant Pydantic Settings.
    Les variables sont chargées depuis l'environnement ou un fichier .env.
    """
    # Configuration de l'application
    ENVIRONMENT: str = "development"
    
    # Configuration de la base de données
    DATABASE_URL: str
    
    # Sécurité et Authentification
    # L'absence de valeur par défaut rend ces champs obligatoires au démarrage
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    STRIPE_SECRET_KEY: str
    
    # URLs externes
    FRONTEND_URL: str

    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_BUCKET_NAME: str | None = None
    AWS_REGION: str = "eu-west-3"

    # Configuration de Pydantic Settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

try:
    # Instance globale pour être importée ailleurs dans l'application
    settings = Settings()
except Exception as e:
    raise e
