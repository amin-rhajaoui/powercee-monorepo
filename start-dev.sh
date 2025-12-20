#!/bin/bash

# Script pour lancer le frontend et le backend en parallèle en développement
# Usage: ./start-dev.sh

# Ne pas arrêter le script si une commande échoue (les processus en arrière-plan peuvent échouer)
set +e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour nettoyer les processus en arrière-plan lors de l'arrêt
cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt des serveurs...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi
    # Tuer les processus enfants
    pkill -P $$ 2>/dev/null || true
    exit 0
}

# Capturer Ctrl+C et appeler cleanup
trap cleanup SIGINT SIGTERM

# Vérifier qu'on est à la racine du monorepo
if [ ! -d "back" ] || [ ! -d "front" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté à la racine du monorepo${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Démarrage des serveurs de développement...${NC}\n"

# Lancer le backend
echo -e "${GREEN}📦 Démarrage du backend (port 8000)...${NC}"
cd back
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo -e "${YELLOW}⚠️  Création de l'environnement virtuel...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# Lancer uvicorn en arrière-plan
echo -e "${BLUE}[BACKEND]${NC} Démarrage sur http://localhost:8000"
uvicorn app.main:app --reload --reload-dir app --port 8000 &
BACKEND_PID=$!
cd ..

# Attendre un peu pour que le backend démarre
sleep 2

# Lancer le frontend
echo -e "${GREEN}📦 Démarrage du frontend (port 3000)...${NC}"
cd front

# Vérifier si node_modules existe, sinon installer les dépendances
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installation des dépendances npm...${NC}"
    npm install
fi

# Lancer Next.js en arrière-plan
echo -e "${GREEN}[FRONTEND]${NC} Démarrage sur http://localhost:3000"
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}✅ Serveurs démarrés avec succès !${NC}\n"
echo -e "${BLUE}🌐 URLs:${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:8000${NC} (API)"
echo -e "  Backend:  ${GREEN}http://localhost:8000/docs${NC} (Swagger)"
echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "\n${YELLOW}💡 Appuyez sur Ctrl+C pour arrêter les serveurs${NC}\n"

# Attendre que les processus se terminent
wait $BACKEND_PID $FRONTEND_PID

