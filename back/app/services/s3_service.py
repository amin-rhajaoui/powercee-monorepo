import boto3
import uuid
import re
from urllib.parse import urlparse
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

def upload_file_to_s3(file: UploadFile, folder: str, allowed_types: list[str] = ["image/jpeg", "image/png", "image/webp", "application/pdf"]) -> str:
    """
    Upload un fichier vers AWS S3 après validation du type MIME.
    Retourne l'URL publique du fichier.
    """
    # 1. Validation du type MIME
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non supporté : {file.content_type}. Types autorisés : {', '.join(allowed_types)}"
        )

    # 2. Vérification de la configuration AWS
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, settings.AWS_BUCKET_NAME]):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuration AWS S3 manquante."
        )

    # 3. Initialisation du client S3
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

    # 4. Génération d'un nom de fichier unique
    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}"

    try:
        # 5. Upload
        s3_client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload vers S3 : {str(e)}"
        )

    # 6. Construction de l'URL
    url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
    return url


def get_s3_client():
    """
    Retourne un client S3 configuré.
    """
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, settings.AWS_BUCKET_NAME]):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuration AWS S3 manquante."
        )
    
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )


def upload_tenant_logo(
    file: UploadFile,
    tenant_name: str,
    tenant_id: uuid.UUID,
    old_logo_url: str | None
) -> str:
    """
    Upload le logo d'un tenant vers S3 avec un nom normalisé.
    Supprime automatiquement l'ancien logo s'il existe.
    
    Args:
        file: Le fichier logo à uploader
        tenant_name: Le nom de l'entreprise (sera normalisé)
        tenant_id: L'ID du tenant
        old_logo_url: L'URL de l'ancien logo (optionnel)
        
    Returns:
        L'URL du nouveau logo uploadé
    """
    # Types autorisés pour les logos (incluant SVG)
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    
    # Validation du type MIME
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non supporté : {file.content_type}. Types autorisés : {', '.join(allowed_types)}"
        )
    
    # Normalisation du nom de l'entreprise : enlever espaces et caractères spéciaux, tout en minuscules
    normalized_name = re.sub(r'[^a-z0-9]', '', tenant_name.lower())
    
    # Si le nom normalisé est vide, utiliser un nom par défaut
    if not normalized_name:
        normalized_name = "entreprise"
    
    # Déterminer l'extension du fichier
    file_extension = ""
    if file.filename and "." in file.filename:
        file_extension = file.filename.split(".")[-1].lower()
    
    # Si pas d'extension, déterminer depuis le content_type
    if not file_extension:
        content_type_to_ext = {
            "image/svg+xml": "svg",
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/webp": "webp",
        }
        file_extension = content_type_to_ext.get(file.content_type, "png")
    
    # Générer le nom de fichier : logo-{nom_normalisé}.{extension}
    filename = f"logo-{normalized_name}.{file_extension}"
    folder = f"tenants/{tenant_id}"
    s3_key = f"{folder}/{filename}"
    
    # Supprimer TOUS les logos existants du tenant (pour garantir un seul logo)
    # Cela supprime tous les fichiers qui commencent par "logo-" dans le dossier du tenant
    delete_all_tenant_logos(tenant_id)
    
    # Vérification de la configuration AWS
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, settings.AWS_BUCKET_NAME]):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuration AWS S3 manquante."
        )
    
    # Initialisation du client S3
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )
    
    try:
        # Upload du nouveau fichier
        s3_client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            s3_key,
            ExtraArgs={"ContentType": file.content_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload vers S3 : {str(e)}"
        )
    
    # Construction de l'URL
    url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
    return url


def delete_file_from_s3(s3_key: str) -> None:
    """
    Supprime un fichier depuis S3.
    Ne lève pas d'exception si le fichier n'existe pas (idempotent).
    
    Args:
        s3_key: La clé S3 du fichier (ex: "tenants/xxx/image.png")
    """
    s3_client = get_s3_client()
    
    try:
        s3_client.delete_object(Bucket=settings.AWS_BUCKET_NAME, Key=s3_key)
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        # Si le fichier n'existe pas, on ignore l'erreur (idempotent)
        # Pour les autres erreurs, on ignore aussi pour ne pas bloquer le processus
        if error_code != "NoSuchKey":
            # Log silencieux - cette fonction est utilisée pour nettoyer
            pass
    except Exception:
        # Ignorer toutes les autres erreurs pour ne pas bloquer le processus
        pass


def delete_all_tenant_logos(tenant_id: uuid.UUID) -> None:
    """
    Supprime tous les fichiers logo (commençant par "logo-") d'un tenant dans S3.
    Ne lève pas d'exception en cas d'erreur (idempotent).
    
    Args:
        tenant_id: L'ID du tenant
    """
    s3_client = get_s3_client()
    folder = f"tenants/{tenant_id}/"
    prefix = f"{folder}logo-"
    
    try:
        # Lister tous les objets qui commencent par "logo-" dans le dossier du tenant
        paginator = s3_client.get_paginator("list_objects_v2")
        pages = paginator.paginate(
            Bucket=settings.AWS_BUCKET_NAME,
            Prefix=prefix
        )
        
        # Supprimer tous les logos trouvés
        for page in pages:
            if "Contents" in page:
                for obj in page["Contents"]:
                    try:
                        s3_client.delete_object(
                            Bucket=settings.AWS_BUCKET_NAME,
                            Key=obj["Key"]
                        )
                    except Exception:
                        # Ignorer les erreurs de suppression individuelle
                        pass
    except Exception:
        # Ignorer toutes les erreurs pour ne pas bloquer le processus
        pass


def upload_bytes_to_s3(
    file_bytes: bytes,
    folder: str,
    filename: str,
    content_type: str = "application/pdf",
) -> str:
    """
    Upload des bytes vers AWS S3.
    Retourne l'URL publique du fichier.
    
    Args:
        file_bytes: Le contenu du fichier en bytes
        folder: Le dossier dans S3 (ex: "folders/{folder_id}")
        filename: Le nom du fichier (ex: "note_dimensionnement.pdf")
        content_type: Le type MIME du fichier (défaut: application/pdf)
        
    Returns:
        L'URL publique du fichier uploadé
    """
    # Vérification de la configuration AWS
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, settings.AWS_BUCKET_NAME]):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuration AWS S3 manquante."
        )
    
    # Initialisation du client S3
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )
    
    # Génération de la clé S3
    s3_key = f"{folder}/{filename}"
    
    try:
        # Upload depuis bytes
        from io import BytesIO
        s3_client.upload_fileobj(
            BytesIO(file_bytes),
            settings.AWS_BUCKET_NAME,
            s3_key,
            ExtraArgs={"ContentType": content_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload vers S3 : {str(e)}"
        )
    
    # Construction de l'URL
    url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
    return url


def get_file_from_s3(s3_key: str) -> tuple[bytes, str]:
    """
    Télécharge un fichier depuis S3 et retourne son contenu ainsi que son type MIME.
    
    Args:
        s3_key: La clé S3 du fichier (ex: "tenants/xxx/image.png")
        
    Returns:
        Tuple (contenu_du_fichier, content_type)
    """
    s3_client = get_s3_client()
    
    try:
        response = s3_client.get_object(Bucket=settings.AWS_BUCKET_NAME, Key=s3_key)
        content = response["Body"].read()
        content_type = response.get("ContentType", "application/octet-stream")
        return content, content_type
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "NoSuchKey":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fichier introuvable dans S3."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du fichier depuis S3 : {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du fichier depuis S3 : {str(e)}"
        )

