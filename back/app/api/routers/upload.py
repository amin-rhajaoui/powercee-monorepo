from fastapi import APIRouter, Depends, UploadFile, File
from app.api.deps import get_current_user
from app.services.s3_service import upload_file_to_s3
from app.models import User

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

