from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Pour SQLAlchemy Async, l'URL doit utiliser le driver asyncpg
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Nettoyage de l'URL : asyncpg ne supporte pas les paramètres de query libpq (sslmode, channel_binding, etc.)
# On retire tout ce qui suit le '?' pour éviter les erreurs de parsing
if "?" in SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.split("?")[0]

# Création de l'engine SQLAlchemy Async
import ssl
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context},
)

# Création d'une classe de session locale asynchrone
SessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

