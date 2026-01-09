"""
Routes API pour le dimensionnement de PAC.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.models.folder import Folder
from app.models.property import Property
from app.models.client import Client
from app.services import folder_service
from app.services.sizing_service import dimensionner_pac_simplifie
from app.services.pdf_service import create_sizing_note_pdf
from app.schemas.sizing import SizingRequest, SizingResponse, SizingPdfRequest

router = APIRouter(prefix="/folders", tags=["Sizing"])


def _extract_sizing_params_from_folder(folder: Folder, property_obj: Property | None) -> dict:
    """
    Extrait les paramètres de dimensionnement depuis un folder et property.
    
    Args:
        folder: Dossier contenant les données
        property_obj: Logement associé (peut être None)
    
    Returns:
        Dictionnaire avec les paramètres pour le calcul
    """
    data = folder.data or {}
    
    # Données depuis Property
    surface_chauffee = property_obj.surface_m2 if property_obj and property_obj.surface_m2 else None
    annee_construction = property_obj.construction_year if property_obj else None
    zone_climatique = folder.zone_climatique or (property_obj.zone_climatique if property_obj else None)
    temp_de_base = property_obj.base_temperature if property_obj else None
    altitude = property_obj.altitude if property_obj else None
    
    # Données depuis folder.data (visite technique)
    hauteur_plafond = data.get("avg_ceiling_height")
    temperature_consigne = data.get("target_temperature", 19.0)
    
    # Type d'émetteur
    type_emetteur = "BT" if folder.emitter_type == "BASSE_TEMPERATURE" else "MT_HT"
    
    # Données d'isolation depuis folder.data
    combles_isole = data.get("is_attic_isolated")
    combles_annee = data.get("attic_isolation_year")
    plancher_isole = data.get("is_floor_isolated")
    plancher_annee = data.get("floor_isolation_year")
    murs_type = data.get("wall_isolation_type")
    murs_annee_interieur = data.get("wall_isolation_year_interior")
    murs_annee_exterieur = data.get("wall_isolation_year_exterior")
    menuiserie_type = data.get("joinery_type")
    
    return {
        "surface_chauffee": surface_chauffee,
        "hauteur_plafond": hauteur_plafond,
        "type_emetteur": type_emetteur,
        "annee_construction": annee_construction,
        "zone_climatique": zone_climatique,
        "temp_de_base": temp_de_base,
        "temperature_consigne": temperature_consigne,
        "combles_isole": combles_isole,
        "combles_annee": combles_annee,
        "plancher_isole": plancher_isole,
        "plancher_annee": plancher_annee,
        "murs_type": murs_type,
        "murs_annee_interieur": murs_annee_interieur,
        "murs_annee_exterieur": murs_annee_exterieur,
        "menuiserie_type": menuiserie_type,
    }


@router.post("/{folder_id}/sizing/calculate", response_model=SizingResponse)
async def calculate_sizing(
    folder_id: UUID,
    sizing_request: SizingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> SizingResponse:
    """
    Calcule le dimensionnement de la PAC pour un dossier.
    
    Les paramètres optionnels du request permettent d'override les valeurs du dossier.
    Si non fournis, les valeurs du dossier/property sont utilisées.
    """
    # Récupérer le folder avec vérification tenant_id
    folder = await folder_service.get_folder(db, current_user, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    
    # Récupérer la property si associée
    property_obj = None
    if folder.property_id:
        result = await db.execute(
            select(Property).where(
                and_(
                    Property.id == folder.property_id,
                    Property.tenant_id == current_user.tenant_id,
                )
            )
        )
        property_obj = result.scalar_one_or_none()
    
    # Extraire les paramètres de base depuis le folder/property
    base_params = _extract_sizing_params_from_folder(folder, property_obj)
    
    # Appliquer les overrides du request
    if sizing_request.surface_chauffee is not None:
        base_params["surface_chauffee"] = sizing_request.surface_chauffee
    if sizing_request.hauteur_plafond is not None:
        base_params["hauteur_plafond"] = sizing_request.hauteur_plafond
    if sizing_request.temperature_consigne is not None:
        base_params["temperature_consigne"] = sizing_request.temperature_consigne
    if sizing_request.type_emetteur_override:
        base_params["type_emetteur"] = sizing_request.type_emetteur_override
    
    # Vérifier les paramètres obligatoires
    if base_params["surface_chauffee"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Surface chauffée non définie. Veuillez la renseigner dans le logement ou dans la requête.",
        )
    if base_params["hauteur_plafond"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hauteur sous plafond non définie. Veuillez la renseigner dans le dossier ou dans la requête.",
        )
    if base_params["annee_construction"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Année de construction non définie. Veuillez la renseigner dans le logement.",
        )
    if not base_params["zone_climatique"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zone climatique non définie. Veuillez la renseigner dans le logement.",
        )
    
    # Appliquer les overrides d'isolation si fournis
    isolation_params = {}
    if sizing_request.combles_isole is not None:
        isolation_params["combles_isole"] = sizing_request.combles_isole
    if sizing_request.combles_annee is not None:
        isolation_params["combles_annee"] = sizing_request.combles_annee
    if sizing_request.plancher_isole is not None:
        isolation_params["plancher_isole"] = sizing_request.plancher_isole
    if sizing_request.plancher_annee is not None:
        isolation_params["plancher_annee"] = sizing_request.plancher_annee
    if sizing_request.murs_type is not None:
        isolation_params["murs_type"] = sizing_request.murs_type
    if sizing_request.murs_annee_interieur is not None:
        isolation_params["murs_annee_interieur"] = sizing_request.murs_annee_interieur
    if sizing_request.murs_annee_exterieur is not None:
        isolation_params["murs_annee_exterieur"] = sizing_request.murs_annee_exterieur
    if sizing_request.menuiserie_type is not None:
        isolation_params["menuiserie_type"] = sizing_request.menuiserie_type
    
    # Utiliser les valeurs de base si pas d'override
    for key in ["combles_isole", "combles_annee", "plancher_isole", "plancher_annee", 
                "murs_type", "murs_annee_interieur", "murs_annee_exterieur", "menuiserie_type"]:
        if key not in isolation_params:
            isolation_params[key] = base_params.get(key)
    
    # Calcul du dimensionnement
    try:
        result = await dimensionner_pac_simplifie(
            surface_chauffee=base_params["surface_chauffee"],
            hauteur_plafond=base_params["hauteur_plafond"],
            type_emetteur=base_params["type_emetteur"],
            annee_construction=base_params["annee_construction"],
            zone_climatique=base_params["zone_climatique"],
            temp_de_base=base_params["temp_de_base"],
            temperature_consigne=base_params["temperature_consigne"],
            type_isolation_override=sizing_request.type_isolation_override,
            **isolation_params,
        )
        return SizingResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du calcul de dimensionnement: {str(e)}",
        )


@router.post("/{folder_id}/sizing/generate-pdf")
async def generate_sizing_pdf(
    folder_id: UUID,
    pdf_request: SizingPdfRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> StreamingResponse:
    """
    Génère la note de dimensionnement en PDF pour un dossier.
    
    Si sizing_params est fourni, recalcule le dimensionnement.
    Sinon, utilise les paramètres du dernier calcul.
    """
    # Récupérer le folder avec vérification tenant_id
    folder = await folder_service.get_folder(db, current_user, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    
    # Récupérer le client
    result = await db.execute(
        select(Client).where(
            and_(
                Client.id == folder.client_id,
                Client.tenant_id == current_user.tenant_id,
            )
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client introuvable.",
        )
    
    # Récupérer la property si associée
    property_obj = None
    if folder.property_id:
        result = await db.execute(
            select(Property).where(
                and_(
                    Property.id == folder.property_id,
                    Property.tenant_id == current_user.tenant_id,
                )
            )
        )
        property_obj = result.scalar_one_or_none()
    
    # Calculer ou utiliser les paramètres fournis
    sizing_data = None
    if pdf_request.sizing_params:
        # Recalculer avec les nouveaux paramètres
        base_params = _extract_sizing_params_from_folder(folder, property_obj)
        
        # Appliquer les overrides
        if pdf_request.sizing_params.surface_chauffee is not None:
            base_params["surface_chauffee"] = pdf_request.sizing_params.surface_chauffee
        if pdf_request.sizing_params.hauteur_plafond is not None:
            base_params["hauteur_plafond"] = pdf_request.sizing_params.hauteur_plafond
        if pdf_request.sizing_params.temperature_consigne is not None:
            base_params["temperature_consigne"] = pdf_request.sizing_params.temperature_consigne
        if pdf_request.sizing_params.type_emetteur_override:
            base_params["type_emetteur"] = pdf_request.sizing_params.type_emetteur_override
        
        # Isolation params
        isolation_params = {}
        if pdf_request.sizing_params.combles_isole is not None:
            isolation_params["combles_isole"] = pdf_request.sizing_params.combles_isole
        if pdf_request.sizing_params.combles_annee is not None:
            isolation_params["combles_annee"] = pdf_request.sizing_params.combles_annee
        if pdf_request.sizing_params.plancher_isole is not None:
            isolation_params["plancher_isole"] = pdf_request.sizing_params.plancher_isole
        if pdf_request.sizing_params.plancher_annee is not None:
            isolation_params["plancher_annee"] = pdf_request.sizing_params.plancher_annee
        if pdf_request.sizing_params.murs_type is not None:
            isolation_params["murs_type"] = pdf_request.sizing_params.murs_type
        if pdf_request.sizing_params.murs_annee_interieur is not None:
            isolation_params["murs_annee_interieur"] = pdf_request.sizing_params.murs_annee_interieur
        if pdf_request.sizing_params.murs_annee_exterieur is not None:
            isolation_params["murs_annee_exterieur"] = pdf_request.sizing_params.murs_annee_exterieur
        if pdf_request.sizing_params.menuiserie_type is not None:
            isolation_params["menuiserie_type"] = pdf_request.sizing_params.menuiserie_type
        
        for key in ["combles_isole", "combles_annee", "plancher_isole", "plancher_annee",
                    "murs_type", "murs_annee_interieur", "murs_annee_exterieur", "menuiserie_type"]:
            if key not in isolation_params:
                isolation_params[key] = base_params.get(key)
        
        try:
            sizing_data = await dimensionner_pac_simplifie(
                surface_chauffee=base_params["surface_chauffee"],
                hauteur_plafond=base_params["hauteur_plafond"],
                type_emetteur=base_params["type_emetteur"],
                annee_construction=base_params["annee_construction"],
                zone_climatique=base_params["zone_climatique"],
                temp_de_base=base_params["temp_de_base"],
                temperature_consigne=base_params["temperature_consigne"],
                type_isolation_override=pdf_request.sizing_params.type_isolation_override,
                **isolation_params,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du calcul de dimensionnement: {str(e)}",
            )
    else:
        # Devrait utiliser le dernier calcul, mais pour l'instant on recalcule
        # TODO: stocker le dernier calcul dans le folder ou en cache
        base_params = _extract_sizing_params_from_folder(folder, property_obj)
        try:
            sizing_data = await dimensionner_pac_simplifie(
                surface_chauffee=base_params["surface_chauffee"],
                hauteur_plafond=base_params["hauteur_plafond"],
                type_emetteur=base_params["type_emetteur"],
                annee_construction=base_params["annee_construction"],
                zone_climatique=base_params["zone_climatique"],
                temp_de_base=base_params["temp_de_base"],
                temperature_consigne=base_params["temperature_consigne"],
                combles_isole=base_params.get("combles_isole"),
                combles_annee=base_params.get("combles_annee"),
                plancher_isole=base_params.get("plancher_isole"),
                plancher_annee=base_params.get("plancher_annee"),
                murs_type=base_params.get("murs_type"),
                murs_annee_interieur=base_params.get("murs_annee_interieur"),
                murs_annee_exterieur=base_params.get("murs_annee_exterieur"),
                menuiserie_type=base_params.get("menuiserie_type"),
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du calcul de dimensionnement: {str(e)}",
            )
    
    # Préparer les détails du bénéficiaire
    prospect_details = {
        "nom": client.last_name or "",
        "prenom": client.first_name or "",
        "email": client.email or "",
        "telephone": client.phone or "",
        "adresse": property_obj.address if property_obj else "",
        "code_postal": property_obj.postal_code if property_obj else "",
        "ville": property_obj.city if property_obj else "",
        "altitude": property_obj.altitude if property_obj else None,
        "temp_de_base": property_obj.base_temperature if property_obj else None,
    }
    
    # Trouver le chemin du logo PowerCEE
    import os
    from pathlib import Path
    
    # Chercher le logo dans plusieurs emplacements possibles
    logo_path = None
    base_dir = Path(__file__).parent.parent.parent.parent  # Remonter jusqu'à la racine du monorepo
    possible_logo_paths = [
        base_dir / "front" / "public" / "logo.png",  # Chemin principal depuis monorepo
        base_dir.parent / "front" / "public" / "logo.png",  # Alternative
        Path(__file__).parent.parent.parent / "static" / "logo.png",
        Path(__file__).parent.parent.parent.parent / "front" / "public" / "logo.png",
    ]
    
    for path in possible_logo_paths:
        if path.exists() and path.is_file():
            logo_path = str(path.absolute())
            break
    
    # Générer le PDF avec module_code
    pdf_bytes = create_sizing_note_pdf(
        prospect_details=prospect_details,
        sizing_data=sizing_data,
        selected_pump=pdf_request.selected_pump,
        selected_heater=pdf_request.selected_heater,
        thermostat_details=pdf_request.thermostat_details,
        logo_path=logo_path,
        module_code=folder.module_code,
    )
    
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération du PDF.",
        )
    
    # Retourner le PDF
    from io import BytesIO
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="note_dimensionnement_{folder_id}.pdf"',
        },
    )
