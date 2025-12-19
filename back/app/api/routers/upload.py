from fastapi import APIRouter, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from app.api.deps import get_current_user
from app.services.s3_service import upload_file_to_s3, get_file_from_s3
from app.models import User
from urllib.parse import unquote
from io import BytesIO

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint pour uploader un fichier vers S3.
    L'utilisateur doit être authentifié.
    """
    # On stocke les fichiers dans un dossier spécifique au tenant
    folder = f"tenants/{current_user.tenant_id}"
    url = upload_file_to_s3(file, folder)
    return {"url": url}


@router.get("/proxy")
async def proxy_image(
    path: str = Query(..., description="Chemin S3 du fichier (ex: tenants/xxx/image.png)"),
    current_user: User = Depends(get_current_user)
):
    """
    Proxy pour servir les images S3 avec authentification.
    Vérifie que l'utilisateur a accès au tenant du fichier.
    """
    # Décoder le chemin (au cas où il y aurait des caractères encodés)
    s3_key = unquote(path)
    
    # Vérifier que le fichier appartient au tenant de l'utilisateur
    if not s3_key.startswith(f"tenants/{current_user.tenant_id}/"):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ce fichier."
        )
    
    # Télécharger le fichier depuis S3
    content, content_type = get_file_from_s3(s3_key)
    
    # Retourner le fichier en streaming
    return StreamingResponse(
        BytesIO(content),
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=3600"  # Cache pour 1 heure
        }
    )

