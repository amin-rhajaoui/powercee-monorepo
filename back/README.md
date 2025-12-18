# PowerCEE Backend API

API développée avec FastAPI pour la plateforme PowerCEE.

## Prérequis

- Python 3.10+
- PostgreSQL

## Installation

1. Créer un environnement virtuel :
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Installer les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

3. Configurer l'environnement :
   Créer un fichier `.env` basé sur les variables requises dans `app/core/config.py`.

## Lancement du serveur

Pour le développement avec rechargement automatique :

```bash
uvicorn app.main:app --reload --port 8000
```

Ou utiliser le script fourni :
```bash
./run.sh
```

L'API sera accessible sur [http://localhost:8000](http://localhost:8000).
La documentation Swagger est disponible sur [http://localhost:8000/docs](http://localhost:8000/docs).

