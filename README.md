# PowerCee

PowerCee est un projet monorepo comprenant une application front-end et un back-end.

## Structure du projet

- `/front` : Contient le code de l'interface utilisateur.
- `/back` : Contient le code de l'API et de la logique métier.
- `.github/workflows` : Contient les configurations pour l'intégration et le déploiement continus (CI/CD).

## Installation

### Backend
1. Naviguer vers le dossier `back` : `cd back`
2. Créer un environnement virtuel : `python -m venv venv`
3. Activer l'environnement : `source venv/bin/activate` (ou `venv\Scripts\activate` sur Windows)
4. Installer les dépendances : `pip install -r requirements.txt`

## Utilisation

### Lancer le Backend
Depuis le dossier `back` :
```bash
./run.sh
```
Ou manuellement :
```bash
uvicorn app.main:app --reload --port 8000
```

