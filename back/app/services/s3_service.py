import boto3
import uuid
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

def upload_file_to_s3(file: UploadFile, folder: str, allowed_types: list[str] = ["image/jpeg", "image/png", "image/webp"]) -> str:
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
            status_code=status.HTTP_500_INTERNAL_SERVER_MODEL,
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

