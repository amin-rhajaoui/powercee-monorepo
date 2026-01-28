# Guide de Test - Scanner VisionKit iOS

## ⚠️ IMPORTANT
**VisionKit ne fonctionne PAS sur le simulateur iOS.** Vous devez tester sur un **iPhone réel**.

## Méthode 1 : Build Local avec Xcode (Recommandé pour tests rapides)

### Prérequis
- Mac avec Xcode installé
- iPhone connecté en USB ou sur le même réseau Wi-Fi
- Certificat de développement Apple configuré

### Étapes

1. **Ouvrir le projet iOS dans Xcode :**
   ```bash
   cd mobile
   npx expo run:ios --device
   ```
   
   Ou manuellement :
   ```bash
   cd mobile/ios
   open PowerCEE.xcworkspace  # ou .xcodeproj
   ```

2. **Dans Xcode :**
   - Sélectionnez votre iPhone dans la liste des appareils (en haut)
   - Cliquez sur le bouton "Run" (▶️) ou appuyez sur `Cmd + R`
   - L'app sera installée et lancée sur votre iPhone

3. **Accéder à la page de test :**
   - Naviguez dans l'app jusqu'à : **BAR-TH-171 → Étape 3 (Documents)**
   - Ou utilisez directement l'URL : `/(app)/bar-th-171/step3`

4. **Tester le scanner :**
   - Appuyez sur le bouton "Téléverser l'avis d'imposition" (ou tout autre champ FileUpload)
   - **Sur iOS** : Le scanner VisionKit natif devrait s'ouvrir automatiquement
   - **Sur Android** : Le sélecteur de documents standard s'ouvre

## Méthode 2 : Build avec EAS (Pour tests sur appareil distant)

### Étapes

1. **Installer EAS CLI (si pas déjà fait) :**
   ```bash
   npm install -g eas-cli
   ```

2. **Se connecter à Expo :**
   ```bash
   eas login
   ```

3. **Configurer le projet (première fois) :**
   ```bash
   cd mobile
   eas build:configure
   ```

4. **Créer un build de développement iOS :**
   ```bash
   eas build --platform ios --profile development
   ```

5. **Installer sur votre iPhone :**
   - Une fois le build terminé, vous recevrez un lien
   - Ouvrez le lien sur votre iPhone
   - Installez l'app via TestFlight ou le lien direct

## Scénarios de Test

### ✅ Test 1 : Scanner un document simple (1 page)
1. Ouvrir la page Documents (step3)
2. Appuyer sur "Téléverser l'avis d'imposition"
3. **Résultat attendu sur iOS :** Le scanner VisionKit s'ouvre avec le cadre bleu de détection
4. Scanner un document (1 page)
5. Vérifier que l'image est uploadée et affichée

### ✅ Test 2 : Scanner un document multi-pages
1. Même procédure
2. Dans le scanner, ajouter plusieurs pages
3. **Résultat attendu :** Seule la première page est uploadée (comportement actuel)
4. ⚠️ Si besoin de toutes les pages, il faudra modifier le code pour fusionner en PDF

### ✅ Test 3 : Annulation
1. Ouvrir le scanner
2. Appuyer sur "Annuler"
3. **Résultat attendu :** Retour à l'écran précédent, aucun upload

### ✅ Test 4 : Permission caméra refusée
1. Aller dans Réglages iPhone → PowerCEE → Caméra → Désactiver
2. Essayer d'ouvrir le scanner
3. **Résultat attendu :** Message d'alerte "Permission requise"
4. Réactiver la permission et réessayer

### ✅ Test 5 : Fallback si scanner échoue
1. Si le scanner plante, vérifier qu'un fallback vers DocumentPicker est proposé
2. **Résultat attendu :** Alerte avec option "Oui" pour utiliser le sélecteur de fichiers

### ✅ Test 6 : Android (vérifier que rien n'est cassé)
1. Tester sur un appareil Android
2. **Résultat attendu :** Le comportement standard (DocumentPicker) fonctionne toujours

## Dépannage

### Le scanner ne s'ouvre pas
- ✅ Vérifier que vous êtes sur un **iPhone réel** (pas simulateur)
- ✅ Vérifier que la permission caméra est accordée
- ✅ Vérifier les logs dans Xcode : `Cmd + Shift + Y` pour ouvrir la console

### Erreur "Module not found"
- ✅ Vérifier que `npx expo prebuild` a bien été exécuté
- ✅ Vérifier que les pods iOS sont installés : `cd ios && pod install`

### Le scanner s'ouvre mais plante
- ✅ Vérifier les logs dans Xcode
- ✅ Vérifier que `@dariyd/react-native-document-scanner` est bien installé
- ✅ Vérifier la version iOS (minimum iOS 13.0 requis)

## Vérification du Code

Le scanner est activé automatiquement sur iOS pour :
- `accept="pdf"` → Scanner direct
- `accept="any"` → Scanner en première option dans le menu
- `accept="image"` → Comportement inchangé (ImagePicker)

Sur Android, le comportement reste identique (DocumentPicker).

## Logs Utiles

Pour voir les logs en temps réel :
```bash
# Dans un terminal
npx expo start

# Dans Xcode (pour iOS)
# Ouvrir la console : Cmd + Shift + Y
```

## Prochaines Améliorations Possibles

Si vous voulez gérer les documents multi-pages :
1. Installer `react-native-pdf-lib` ou `expo-file-system`
2. Modifier `handleDocumentScan()` pour fusionner toutes les pages en un PDF
3. Uploader le PDF fusionné au lieu de la première page seulement
