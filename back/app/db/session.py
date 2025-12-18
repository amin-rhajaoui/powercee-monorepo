from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Création de l'engine SQLAlchemy
# Pour Neon/PostgreSQL, l'URL doit être de la forme postgresql://...
engine = create_engine(
    settings.DATABASE_URL,
    # Ces options peuvent être ajustées selon les besoins de performance
    pool_pre_ping=True,
    connect_args={"sslmode": "require"},
)

# Création d'une classe de session locale
# Chaque instance de cette classe sera une session de base de données
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

