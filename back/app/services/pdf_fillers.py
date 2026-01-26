"""
Service pour remplir les PDFs de formulaires (attestation TVA, CDC CEE).
Code aligné sur GreenPowerBot qui fonctionne.
"""
import io
import logging
import os
from datetime import datetime
from pathlib import Path

from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

logger = logging.getLogger(__name__)

# Chemin vers les templates PDF (depuis la racine du projet)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
TEMPLATE_TVA_PATH = BASE_DIR / "pdf" / "attestationtvaorigine.pdf"
TEMPLATE_CDC_PATH = BASE_DIR / "pdf" / "cdc-cee.pdf"


def fill_tva_attestation(prospect_details: dict) -> bytes | None:
    """
    Remplit l'attestation de TVA en superposant les informations sur le PDF existant.
    """
    try:
        template_path = str(TEMPLATE_TVA_PATH)

        # --- 1. Créer la surcouche avec les "X" et le texte ---
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=A4)

        # --- Dessiner les "X" sur les cases à cocher (Helvetica-Bold pour être plus visible) ---
        can.setFont("Helvetica-Bold", 10)
        coordonnees_fixes = [
            (58, 590), (58, 478), (58, 458), (58, 428), (58, 406),
            (58, 396), (58, 386), (58, 344)
        ]
        for x, y in coordonnees_fixes:
            can.drawString(x, y, "X")

        if prospect_details.get('type_bien') == 'maison':
            can.drawString(58, 621, "X")
        elif prospect_details.get('type_bien') == 'appartement':
            can.drawString(383, 621, "X")

        if prospect_details.get('statut_occupation') == 'proprietaire':
            can.drawString(105, 528, "X")
        elif prospect_details.get('statut_occupation') == 'locataire':
            can.drawString(170, 528, "X")

        # --- Remplir les champs texte avec ReportLab ---
        can.setFont("Helvetica", 8)

        can.drawString(79, 683, prospect_details.get('nom', ''))
        can.drawString(311, 683, prospect_details.get('prenom', ''))
        can.drawString(90, 674, f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}")
        can.drawString(325, 674, prospect_details.get('code_postal', ''))
        can.drawString(401, 674, prospect_details.get('ville', ''))

        can.drawString(95, 537, f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}")
        can.drawString(294, 537, prospect_details.get('ville', ''))
        can.drawString(452, 537, prospect_details.get('code_postal', ''))
        can.drawString(263, 165, prospect_details.get('ville', ''))
        can.drawString(375, 165, datetime.now().strftime('%d/%m/%Y'))

        # --- Ajout de l'ancre de signature YouSign (invisible) ---
        can.setFillColorRGB(1, 1, 1)
        can.setFont("Helvetica", 6)
        can.drawString(220, 70, "{{s1|signature|150|50}}")

        can.save()
        packet.seek(0)

        # --- 2. Fusionner la surcouche avec le PDF original ---
        overlay_pdf = PdfReader(packet)
        existing_pdf = PdfReader(open(template_path, "rb"))
        writer = PdfWriter()

        # Prend la première page du PDF original
        page = existing_pdf.pages[0]
        # Fusionne la surcouche par-dessus
        page.merge_page(overlay_pdf.pages[0])

        # Ajoute la première page modifiée au writer
        writer.add_page(page)

        # Ajoute les autres pages (2 et 3) du PDF original
        for page_num in range(1, len(existing_pdf.pages)):
            writer.add_page(existing_pdf.pages[page_num])

        # --- 3. Sauvegarder le résultat ---
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)

        return output_buffer.getvalue()

    except Exception as e:
        logger.error(f"Erreur lors du remplissage de l'attestation de TVA : {e}", exc_info=True)
        return None


def fill_cdc_cee_pdf(prospect_details: dict, pump_details: dict, devis_id: int) -> bytes | None:
    """
    Remplit le Cadre de Contribution CEE avec les informations du prospect et de la pompe.
    """
    try:
        template_path = str(TEMPLATE_CDC_PATH)

        # --- 1. Créer la surcouche avec les "X" ---
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=A4)
        can.setFont("Helvetica", 9)

        # Coche la case et écrit le montant de la prime
        can.drawString(56, 640, "X")
        can.drawString(250, 640, f"{pump_details.get('prime_cee', 0.0):.2f} EUR")

        # Informations du bénéficiaire
        can.drawString(135, 440, f"{prospect_details.get('nom', '')}")
        can.drawString(135, 426, f"{prospect_details.get('prenom', '')}")
        can.drawString(135, 412, f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}, {prospect_details.get('code_postal', '')} {prospect_details.get('ville', '')}")
        can.drawString(135, 398, f"{prospect_details.get('telephone', '')}")
        can.drawString(135, 384, f"{prospect_details.get('email', '')}")

        # Dates
        date_jour = datetime.now().strftime('%d/%m/%Y')
        can.drawString(480, 200, date_jour)

        # --- Ajout de l'ancre de signature YouSign (invisible) ---
        can.setFillColorRGB(1, 1, 1)
        can.setFont("Helvetica", 6)
        can.drawString(450, 150, "{{s1|signature|150|50}}")

        can.save()
        packet.seek(0)

        # --- 2. Fusionner la surcouche avec le PDF original ---
        overlay_pdf = PdfReader(packet)
        existing_pdf = PdfReader(open(template_path, "rb"))
        writer = PdfWriter()
        page = existing_pdf.pages[0]
        page.merge_page(overlay_pdf.pages[0])
        writer.add_page(page)

        # Ajoute les autres pages du PDF original
        for page_num in range(1, len(existing_pdf.pages)):
            writer.add_page(existing_pdf.pages[page_num])

        # --- 3. Sauvegarder le résultat ---
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        return output_buffer.getvalue()

    except Exception as e:
        logger.error(f"Erreur lors du remplissage du Cadre de Contribution CEE : {e}", exc_info=True)
        return None
