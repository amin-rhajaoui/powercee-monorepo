#!/bin/bash

# Script pour lancer le backend localement
# Assurez-vous d'être dans le dossier 'back'

# Utilisation de l'environnement virtuel s'il existe, sinon création
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️ Aucun environnement virtuel trouvé. Création de 'venv'..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Installation automatique des dépendances
echo "📦 Installation/Mise à jour des dépendances (requirements.txt)..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🚀 Démarrage du serveur PowerCEE API sur le port 8000..."
# On surveille uniquement le dossier 'app' pour éviter les reloads inutiles liés au 'venv'
# --host 0.0.0.0 permet d'écouter sur toutes les interfaces réseau (accessible depuis le réseau local)
uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
