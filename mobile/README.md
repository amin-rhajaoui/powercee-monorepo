# PowerCEE Mobile

Application mobile React Native pour PowerCEE, développée avec Expo.

## Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI (installé globalement ou via npx)
- Un appareil iOS/Android ou un émulateur

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :

Créez un fichier `.env` à la racine du dossier `mobile` avec :
```
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```

**⚠️ IMPORTANT pour le développement mobile :**
- Vous **NE POUVEZ PAS** utiliser `http://localhost:8000` car sur un appareil mobile, `localhost` fait référence à l'appareil lui-même, pas à votre ordinateur de développement.
- Vous devez utiliser l'adresse IP de votre ordinateur sur le réseau local (ex: `http://192.168.1.10:8000`).

Pour trouver votre adresse IP :
- **macOS/Linux** : `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows** : `ipconfig` (cherchez "IPv4 Address")

Assurez-vous que :
1. Votre backend est démarré sur le port 8000
2. Votre ordinateur et votre appareil mobile sont sur le même réseau Wi-Fi
3. Votre pare-feu autorise les connexions entrantes sur le port 8000

Pour la production, utilisez l'URL publique de votre API backend.

## Développement

### Démarrer le serveur de développement

```bash
npm start
```

Cela lancera Expo Dev Tools. Vous pouvez ensuite :
- Appuyer sur `i` pour ouvrir sur iOS Simulator
- Appuyer sur `a` pour ouvrir sur Android Emulator
- Scanner le QR code avec l'app Expo Go sur votre téléphone

### Commandes disponibles

- `npm start` : Démarrer le serveur de développement
- `npm run android` : Lancer sur Android
- `npm run ios` : Lancer sur iOS
- `npm run web` : Lancer sur le web (pour tests)

## Structure du projet

```
mobile/
├── app/              # Navigation et écrans (Expo Router)
│   ├── (auth)/       # Écrans d'authentification
│   └── (app)/        # Écrans de l'application principale
├── components/        # Composants réutilisables
├── contexts/         # Contextes React (AuthContext, etc.)
├── hooks/            # Hooks React personnalisés
├── lib/              # Utilitaires (API client, auth, etc.)
└── types/            # Types TypeScript
```

## Authentification

L'application utilise des tokens Bearer pour l'authentification. Le token est stocké localement avec AsyncStorage et automatiquement ajouté aux requêtes API.

### Flux d'authentification

1. **Login** : L'utilisateur se connecte avec email/mot de passe
2. Le backend retourne un token dans le body JSON (format mobile)
3. Le token est stocké dans AsyncStorage
4. Les requêtes suivantes incluent automatiquement le header `Authorization: Bearer <token>`

## Configuration de l'API

L'URL de l'API backend est configurée via la variable d'environnement `EXPO_PUBLIC_API_URL` dans le fichier `.env`.

**Pour le développement local :**
- Le backend FastAPI doit tourner sur votre ordinateur (ex: `http://192.168.1.10:8000`)
- Utilisez l'adresse IP de votre ordinateur, **pas** `localhost`
- Les CORS sont configurés dans le backend pour accepter les requêtes
- Note : Les applications React Native n'envoient pas d'origin header, donc elles ne sont pas affectées par CORS de la même manière que les applications web

## Build pour production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

Note : Vous devrez configurer EAS (Expo Application Services) pour les builds de production.

## Sécurité

- Les tokens sont stockés localement avec AsyncStorage
- Pour une sécurité renforcée en production, considérez l'utilisation de `expo-secure-store`
- Le backend valide tous les tokens et applique les règles de sécurité (tenant isolation, RBAC)

## Dépendances principales

- `expo` : Framework React Native
- `expo-router` : Navigation basée sur le système de fichiers
- `@react-native-async-storage/async-storage` : Stockage local
- `react-hook-form` + `zod` : Formulaires et validation
- `@react-navigation/native` : Navigation

## Support

Pour toute question ou problème, consultez la documentation Expo : https://docs.expo.dev/
