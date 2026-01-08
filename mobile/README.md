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
```bash
cp .env.example .env
```

Puis éditer `.env` et définir :
```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Pour la production, utiliser l'URL de votre API backend.

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

L'URL de l'API backend est configurée via la variable d'environnement `EXPO_PUBLIC_API_URL`.

Pour le développement local, assurez-vous que :
- Le backend FastAPI tourne sur `http://localhost:8000`
- Les CORS sont configurés pour accepter les requêtes depuis l'app mobile

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
