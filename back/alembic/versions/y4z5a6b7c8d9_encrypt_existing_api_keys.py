"""encrypt_existing_api_keys

Revision ID: y4z5a6b7c8d9
Revises: x3y4z5a6b7c8
Create Date: 2026-01-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "y4z5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "x3y4z5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Chiffre toutes les clés API existantes dans la table integrations.
    Cette migration utilise le service de chiffrement pour chiffrer les données en clair.
    """
    # Importer le service de chiffrement
    import sys
    import os
    sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '../..')))
    
    from app.core.encryption import EncryptionService
    
    # Connexion à la base de données
    connection = op.get_bind()
    
    # Récupérer toutes les intégrations avec leurs clés API
    result = connection.execute(
        text("SELECT id, api_key FROM integrations")
    )
    integrations = result.fetchall()
    
    # Chiffrer chaque clé API
    for integration_id, api_key in integrations:
        try:
            # Vérifier si la clé est déjà chiffrée (commence par gAAAAAB, signature Fernet)
            if api_key.startswith("gAAAAAB"):
                # Déjà chiffrée, on passe
                continue
            
            # Chiffrer la clé
            encrypted_key = EncryptionService.encrypt(api_key)
            
            # Mettre à jour la base de données
            connection.execute(
                text("UPDATE integrations SET api_key = :encrypted_key WHERE id = :id"),
                {"encrypted_key": encrypted_key, "id": integration_id}
            )
        except Exception as e:
            # En cas d'erreur, on log mais on continue (pour ne pas bloquer la migration)
            print(f"Erreur lors du chiffrement de l'intégration {integration_id}: {e}")
            continue
    
    # Alembic gère les transactions automatiquement, pas besoin de commit explicite


def downgrade() -> None:
    """
    Déchiffre toutes les clés API chiffrées.
    ATTENTION: Cette opération est risquée et ne devrait être utilisée qu'en développement.
    """
    # Importer le service de chiffrement
    import sys
    import os
    sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '../..')))
    
    from app.core.encryption import EncryptionService
    
    # Connexion à la base de données
    connection = op.get_bind()
    
    # Récupérer toutes les intégrations avec leurs clés API
    result = connection.execute(
        text("SELECT id, api_key FROM integrations")
    )
    integrations = result.fetchall()
    
    # Déchiffrer chaque clé API
    for integration_id, api_key in integrations:
        try:
            # Vérifier si la clé est chiffrée (commence par gAAAAAB)
            if not api_key.startswith("gAAAAAB"):
                # Pas chiffrée, on passe
                continue
            
            # Déchiffrer la clé
            decrypted_key = EncryptionService.decrypt(api_key)
            
            # Mettre à jour la base de données
            connection.execute(
                text("UPDATE integrations SET api_key = :decrypted_key WHERE id = :id"),
                {"decrypted_key": decrypted_key, "id": integration_id}
            )
        except Exception as e:
            # En cas d'erreur, on log mais on continue
            print(f"Erreur lors du déchiffrement de l'intégration {integration_id}: {e}")
            continue
    
    # Alembic gère les transactions automatiquement, pas besoin de commit explicite
