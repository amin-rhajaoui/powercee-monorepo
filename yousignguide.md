Guide d'Intégration API Yousign (v3)
Ce document décrit le protocole technique pour intégrer la signature électronique via l'API Yousign v3. Il est basé sur une implémentation de production existante.

1. Configuration Globale
Base URL : https://api.yousign.app/v3

Authentification : Bearer Token

Headers par défaut :

HTTP
Authorization: Bearer <VOTRE_TOKEN_YOUSIGN>
Content-Type: application/json
2. Prétraitement des Données
Avant d'appeler l'API, les données des signataires doivent être nettoyées pour éviter les erreurs de validation (bad request).

A. Nettoyage du Nom (_sanitize_name)

L'API Yousign est stricte sur les caractères autorisés dans les noms/prénoms.

Règle : Remplacer les underscores _ par des espaces.

Regex autorisée : [^a-zA-Z\s'-àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ] (tout ce qui n'est pas lettre, espace, apostrophe ou tiret doit être supprimé).

Action : strip() le résultat.

B. Formatage Téléphone (_format_phone_number)

Le numéro de téléphone est requis pour l'envoi du code OTP.

Format : E.164 (ex: +33612345678).

Logique :

Supprimer tous les caractères non numériques.

Si commence par 0 (ex: 06...), remplacer le 0 par +33.

Si commence déjà par +33, laisser tel quel.

3. Workflow de Signature
Le processus se déroule en 3 étapes synchrones : Upload -> Création de la demande -> Activation.

Étape 1 : Upload des Documents

Chaque PDF doit être téléversé indépendamment pour obtenir un document_id.

Endpoint : POST /documents

Type : multipart/form-data

Paramètres du Body :

file : Le fichier binaire (PDF).

nature : "signable_document"

parse_anchors : "true" (Crucial : cela indique à Yousign de chercher des balises de signature dans le PDF au lieu de coordonnées X/Y).

Exemple de réponse (Succès) :

JSON
{
  "id": "c4d5e6f7-..."
}
Étape 2 : Création de la "Signature Request"

Une fois les IDs des documents obtenus, on crée le dossier de signature.

Endpoint : POST /signature_requests

Body JSON :

JSON
{
  "name": "Devis pour Prénom Nom",
  "delivery_mode": "email",
  "timezone": "Europe/Paris",
  "documents": ["<DOCUMENT_ID_1>", "<DOCUMENT_ID_2>"],
  "signers": [
    {
      "info": {
        "first_name": "PrénomSanitized",
        "last_name": "NomSanitized",
        "email": "client@email.com",
        "phone_number": "+33600000000",
        "locale": "fr"
      },
      "fields": [], 
      "signature_level": "electronic_signature",
      "signature_authentication_mode": "otp_sms"
    }
  ]
}
Note : fields est vide [] car parse_anchors a été utilisé à l'étape 1. Yousign placera la signature automatiquement là où les ancres textuelles sont trouvées dans le PDF.

Réponse (Succès) : Récupérer id (l'ID de la requête) de la réponse JSON.

Étape 3 : Activation de la Demande

La demande est créée en brouillon. Il faut l'activer pour déclencher l'envoi des emails aux signataires.

Endpoint : POST /signature_requests/{SIGNATURE_REQUEST_ID}/activate

Réponse : Contient l'objet Request activé.

Donnée utile : signers[0].signature_link (L'URL où le signataire peut signer, utile si vous voulez l'envoyer vous-même, bien que Yousign envoie aussi un email).

4. Suivi et Récupération (Polling)
L'implémentation actuelle utilise un système de vérification périodique (polling) pour vérifier le statut.

A. Vérifier le statut

Endpoint : GET /signature_requests/{SIGNATURE_REQUEST_ID}

Analyse de la réponse :

Vérifier le champ status.

Statuts importants :

done : Signature terminée.

pending / ongoing : En attente.

expired / canceled / refused : Échec.

Récupération ID Signataire : Si le statut est done, extraire signers[0].id depuis la réponse. Cet ID est nécessaire pour télécharger la preuve (Audit Trail).

B. Télécharger les Documents Signés

Une fois le statut done :

Endpoint : GET /signature_requests/{SIGNATURE_REQUEST_ID}/documents/{DOCUMENT_ID}/download

Output : Fichier binaire (PDF).

Note : Itérer sur tous les document_ids associés à la demande.

C. Télécharger la Preuve (Audit Trail)

C'est le fichier légal certifiant la signature.

Pré-requis : Avoir le signer_id (récupéré lors de l'étape de vérification du statut).

Endpoint : GET /signature_requests/{SIGNATURE_REQUEST_ID}/signers/{SIGNER_ID}/audit_trails/download

Output : Fichier binaire (PDF).

5. Résumé des Points d'Attention (Best Practices)
Ancres (Anchors) : Cette implémentation repose sur le fait que les PDF générés en amont contiennent des balises textuelles spécifiques que Yousign reconnaît. Ne pas essayer d'envoyer de coordonnées X/Y dans fields.

Gestion des erreurs : Le code gère les timeouts (set à 40s) et les erreurs HTTP. L'upload de la preuve (Audit Trail) peut échouer indépendamment des documents, il faut gérer cette exception sans bloquer tout le flux.

Authentication OTP : Le mode otp_sms impose d'avoir un numéro de téléphone mobile valide. Si le numéro est un fixe, l'API renverra une erreur.