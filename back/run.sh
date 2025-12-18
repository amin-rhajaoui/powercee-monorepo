#!/bin/bash

# Script pour lancer le backend localement
# Assurez-vous d'être dans le dossier 'back'

echo "Démarrage du serveur PowerCEE API sur le port 8000..."
uvicorn app.main:app --reload --port 8000

