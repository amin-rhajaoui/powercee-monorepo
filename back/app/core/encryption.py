"""
Service de chiffrement pour les clés API sensibles.
Utilise Fernet (AES 128 en mode CBC) pour chiffrer les données au repos.
"""
import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings


class EncryptionService:
    """
    Service pour chiffrer et déchiffrer les clés API.
    Utilise la SECRET_KEY de l'application pour générer la clé Fernet.
    """

    _fernet_instance: Fernet | None = None

    @classmethod
    def _get_fernet(cls) -> Fernet:
        """
        Génère ou récupère l'instance Fernet pour le chiffrement.
        La clé est dérivée de SECRET_KEY de manière déterministe.
        """
        if cls._fernet_instance is None:
            # Dériver une clé Fernet de 32 bytes depuis SECRET_KEY
            # Utiliser PBKDF2 avec SHA256 pour une dérivation sécurisée
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"powercee_api_key_encryption_salt",  # Salt fixe pour la dérivation
                iterations=100000,  # Nombre d'itérations pour ralentir les attaques par force brute
            )
            key = base64.urlsafe_b64encode(
                kdf.derive(settings.SECRET_KEY.encode())
            )
            cls._fernet_instance = Fernet(key)

        return cls._fernet_instance

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """
        Chiffre une chaîne de caractères et retourne le résultat encodé en base64.

        Args:
            plaintext: Texte en clair à chiffrer

        Returns:
            Texte chiffré encodé en base64

        Raises:
            ValueError: Si plaintext est vide ou None
        """
        if not plaintext:
            raise ValueError("Le texte à chiffrer ne peut pas être vide")

        fernet = cls._get_fernet()
        encrypted_bytes = fernet.encrypt(plaintext.encode("utf-8"))
        return encrypted_bytes.decode("utf-8")

    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        """
        Déchiffre une chaîne de caractères chiffrée.

        Args:
            ciphertext: Texte chiffré encodé en base64

        Returns:
            Texte en clair déchiffré

        Raises:
            ValueError: Si le déchiffrement échoue (clé invalide, données corrompues)
        """
        if not ciphertext:
            raise ValueError("Le texte à déchiffrer ne peut pas être vide")

        try:
            fernet = cls._get_fernet()
            decrypted_bytes = fernet.decrypt(ciphertext.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            raise ValueError(
                f"Échec du déchiffrement: {str(e)}. "
                "Vérifiez que la SECRET_KEY est correcte."
            ) from e
