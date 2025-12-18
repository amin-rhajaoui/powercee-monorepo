from passlib.context import CryptContext

# Configuration du contexte de hachage
# Deprecated=auto permet de gérer la mise à jour des hachages si les paramètres de bcrypt changent
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si un mot de passe en clair correspond à son hachage.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Génère un hachage sécurisé à partir d'un mot de passe en clair.
    """
    return pwd_context.hash(password)

