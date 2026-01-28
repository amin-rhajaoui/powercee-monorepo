"""
Service pour générer le PDF du devis.
"""
import io
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.agency import Agency
from app.models.client import Client
from app.models.folder import Folder
from app.models.property import Property
from app.models.tenant import Tenant
from app.models.user import User
from app.services.pricing.base import QuotePreview
from app.services.s3_service import get_file_from_s3

logger = logging.getLogger(__name__)

# Couleurs
PRIMARY_COLOR = colors.HexColor('#1E8449')
LIGHT_BACKGROUND = colors.HexColor('#F4F6F6')
DARK_TEXT = colors.HexColor('#2C3E50')
LIGHT_GREY_TEXT = colors.HexColor('#7F8C8D')
TABLE_HEADER_BG = colors.HexColor('#273746')
ACCENT_GREEN_BG = colors.HexColor('#D5F5E3')
ACCENT_GREEN_TEXT = colors.HexColor('#196F3D')


def generate_quote_pdf(
    quote_preview: QuotePreview,
    folder: Folder,
    client: Client,
    property_obj: Property | None,
    tenant: Tenant,
    agency: Agency | None,
    user: User,
    quote_number: str,
) -> bytes | None:
    """
    Génère le PDF du devis en utilisant les lignes de QuotePreview.
    
    Args:
        quote_preview: Résultat de la simulation avec les lignes
        folder: Dossier associé
        client: Client
        property_obj: Propriété (optionnel)
        tenant: Tenant (entreprise)
        agency: Agence siège social (optionnel)
        user: Utilisateur (commercial)
        quote_number: Numéro de devis
    
    Returns:
        Bytes du PDF ou None en cas d'erreur
    """
    try:
        logger.info(f"Génération du devis PDF N°{quote_number} pour {client.first_name} {client.last_name}")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.7*inch,
            leftMargin=0.7*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='RightAlign', parent=styles['Normal'], alignment=2, textColor=DARK_TEXT))
        styles.add(ParagraphStyle(name='CenterAlign', parent=styles['Normal'], alignment=1, textColor=DARK_TEXT))
        styles.add(ParagraphStyle(name='LeftInfo', parent=styles['Normal'], spaceBefore=6, textColor=DARK_TEXT))
        styles.add(ParagraphStyle(name='RightInfo', parent=styles['RightAlign'], spaceBefore=6, textColor=DARK_TEXT))
        styles.add(ParagraphStyle(name='BoldRight', parent=styles['RightAlign'], fontName='Helvetica-Bold', textColor=DARK_TEXT))
        styles.add(ParagraphStyle(name='Footer', parent=styles['Normal'], fontSize=8, alignment=1, textColor=LIGHT_GREY_TEXT))
        styles.add(ParagraphStyle(name='HeaderCell', parent=styles['Normal'], alignment=1, textColor=colors.whitesmoke))
        styles.add(ParagraphStyle(name='SmallText', parent=styles['Normal'], fontSize=8, textColor=DARK_TEXT))
        styles.add(ParagraphStyle(name='TableDescription', parent=styles['Normal'], spaceAfter=0, spaceBefore=0, leading=11, textColor=DARK_TEXT, keepWithNext=0, splitLongWords=0))
        
        story = []
        
        # --- En-tête ---
        header_cols_1 = [3.5*inch, 3.5*inch]
        
        # Logo et infos entreprise
        logo = None
        tmp_logo_path = None  # Garder la référence pour nettoyer après
        if tenant.logo_url:
            try:
                # Extraire la clé S3 depuis l'URL
                # Format: https://bucket.s3.region.amazonaws.com/tenants/{tenant_id}/logo-xxx.png
                if '.s3.' in tenant.logo_url:
                    # Extraire la partie après .s3.region.amazonaws.com/
                    s3_key = tenant.logo_url.split('.s3.')[1].split('/', 1)[1] if '.s3.' in tenant.logo_url and '/' in tenant.logo_url.split('.s3.')[1] else None
                    if s3_key:
                        logo_bytes, _ = get_file_from_s3(s3_key)
                        # Créer un fichier temporaire pour le logo
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                            tmp_file.write(logo_bytes)
                            tmp_logo_path = tmp_file.name
                        logo = Image(tmp_logo_path, width=1.5*inch, height=0.75*inch)
                        logo.hAlign = 'LEFT'
                        # Ne pas supprimer ici, on le fera après doc.build()
            except Exception as e:
                logger.warning(f"Impossible de charger le logo: {e}")
        
        if not logo:
            logo = Paragraph(f"<b>{tenant.name.upper()}</b>", styles['h2'])
        
        # Informations entreprise depuis l'agence siège social ou tenant
        company_name = agency.name if agency else tenant.name
        company_address = agency.address if agency and agency.address else ""
        company_siret = agency.siret if agency and agency.siret else ""
        company_phone = agency.phone if agency and agency.phone else ""
        company_email = agency.email if agency and agency.email else ""
        
        company_info = [
            logo,
            Paragraph(f"<b>{company_name}</b>", styles['LeftInfo']),
        ]
        if company_address:
            company_info.append(Paragraph(company_address, styles['LeftInfo']))
        if company_siret:
            company_info.append(Paragraph(f"SIRET: {company_siret}", styles['LeftInfo']))
        if company_phone:
            company_info.append(Paragraph(f"TÉLÉPHONE: {company_phone}", styles['LeftInfo']))
        if company_email:
            company_info.append(Paragraph(f"MAIL: {company_email}", styles['LeftInfo']))
        
        # Infos Client
        client_address = property_obj.address if property_obj and property_obj.address else ""
        client_postal_code = property_obj.postal_code if property_obj and property_obj.postal_code else ""
        client_city = property_obj.city if property_obj and property_obj.city else ""
        
        client_info = [
            Paragraph(f"A l'attention de M./Mme {client.first_name} {client.last_name}", styles['RightInfo']),
        ]
        if client_address:
            client_info.append(Paragraph(client_address, styles['RightInfo']))
        if client_postal_code and client_city:
            client_info.append(Paragraph(f"{client_postal_code} {client_city}", styles['RightInfo']))
        if client.phone:
            client_info.append(Paragraph(f"Téléphone: {client.phone}", styles['RightInfo']))
        if client.email:
            client_info.append(Paragraph(f"Email: {client.email}", styles['RightInfo']))
        
        header_table_1 = Table([[company_info, client_info]], colWidths=header_cols_1)
        header_table_1.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0)
        ]))
        story.append(header_table_1)
        story.append(Spacer(1, 0.4 * inch))
        
        # Tableau 2: Infos Devis
        salesperson_name = user.full_name if user.full_name else "Technicien-Conseil"
        today_date = datetime.now().strftime('%d/%m/%Y')
        
        devis_info_data = [
            [Paragraph('<b>DEVIS N°</b>', styles['HeaderCell']), Paragraph(f'<b>{quote_number}</b>', styles['HeaderCell']), 'Date de visite technique:', today_date],
            ['Date du devis:', today_date, "Validité de l'offre:", '1 mois'],
            ['Technicien-Conseil:', salesperson_name, '', ''],
        ]
        
        header_table_2 = Table(devis_info_data, colWidths=[1.5*inch, 1.9*inch, 1.9*inch, 1.7*inch], rowHeights=0.3*inch)
        header_table_2.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_BG),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 1, colors.lightgrey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(header_table_2)
        story.append(Spacer(1, 0.4 * inch))
        
        # --- Tableau des lignes du devis ---
        table_data = [
            ['DESCRIPTION', 'QTE', 'PRIX UNITAIRE HT', 'TVA (%)', 'REMISE (€)', 'MONTANT HT']
        ]
        
        for line in quote_preview.lines:
            description = Paragraph(line.description if line.description else line.title, styles['TableDescription'])
            table_data.append([
                description,
                f"{line.quantity:.2f}",
                f"{line.unit_price_ht:,.2f} €",
                f"{line.tva_rate:.2f}",
                '0,00 €',
                f"{line.total_ht:,.2f} €"
            ])
        
        quote_table = Table(table_data, colWidths=[2.8*inch, 0.5*inch, 1.2*inch, 0.6*inch, 0.9*inch, 1*inch])
        quote_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_BG),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('TOPPADDING', (0,1), (-1,-1), 4),
            ('BOTTOMPADDING', (0,1), (-1,-1), 4),
            ('LINEBELOW', (0,0), (-1,0), 2, PRIMARY_COLOR),
            ('LINEBELOW', (0,1), (-1,-2), 1, colors.lightgrey),
            ('ALIGN', (0,1), (0,-1), 'LEFT'),
            ('ALIGN', (1,1), (-1,-1), 'RIGHT'),
        ]))
        story.append(quote_table)
        story.append(Spacer(1, 0.2 * inch))
        
        # --- Section des Totaux ---
        tva_rate = 5.5
        montant_tva = quote_preview.total_ttc - quote_preview.total_ht
        
        totals_data = []
        totals_data.append(['Total HT', f"{quote_preview.total_ht:,.2f} €"])
        totals_data.append([f'TVA {tva_rate:.1f}%', f"{montant_tva:,.2f} €"])
        totals_data.append([Paragraph('<b>Total TTC</b>', styles['RightAlign']), Paragraph(f"<b>{quote_preview.total_ttc:,.2f} €</b>", styles['BoldRight'])])
        totals_data.append(['Prime CEE (déduite)', f"- {quote_preview.cee_prime:,.2f} €"])
        totals_data.append([Paragraph(f'<font color="{ACCENT_GREEN_TEXT.hexval()}"><b>RESTE À CHARGE</b></font>', styles['RightAlign']), 
                           Paragraph(f'<font color="{ACCENT_GREEN_TEXT.hexval()}"><b>{quote_preview.rac_ttc:,.2f} €</b></font>', styles['BoldRight'])])
        
        totals_table = Table(totals_data, colWidths=[5.9*inch, 1.2*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEABOVE', (0,0), (-1,0), 1, colors.lightgrey),
            ('LINEBELOW', (0,1), (-1,1), 1, colors.lightgrey),
            ('BACKGROUND', (0,2), (-1,2), LIGHT_BACKGROUND),
            ('FONTNAME', (0,2), (-1,2), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), ACCENT_GREEN_BG),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ]))
        story.append(totals_table)
        story.append(Spacer(1, 0.4 * inch))
        
        # Mention EBS Energie
        ebs_energie_text = f"""
        <font size=7>
        <u>Paragraphe EBS Energie :</u> Les travaux ou prestations objet du présent document donneront lieu à une contribution financière de EBS ENERGIE (SIREN 533 333 118), versée par EBS ENERGIE dans le cadre de son rôle incitatif sous forme de prime, directement ou via son (ses) mandataire(s), sous réserve de l'engagement de fournir exclusivement à EBS Energie les documents nécessaires à la valorisation des opérations au titre du dispositif des Certificats d'Economies d'Energie et sous réserve de la validation de l'éligibilité du dossier par EBS ENERGIE puis par l'autorité administrative compétente. Le montant de cette contribution financière, hors champ d'application de la TVA, est susceptible de varier en fonction des travaux effectivement réalisés et du volume des CEE attribués à l'opération et est estimé à <b>{quote_preview.cee_prime:,.2f} €</b>.
        </font>
        """
        story.append(Paragraph(ebs_energie_text, styles['SmallText']))
        story.append(Spacer(1, 0.4 * inch))
        
        # Conditions de règlement
        story.append(Paragraph("<u>Conditions de règlement :</u>", styles['Normal']))
        story.append(Paragraph("Le solde sera à régler à la fin des travaux.", styles['SmallText']))
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("""
            <u>DROIT DE RÉTRACTATION :</u><br/>
            <font size=7>
            Le client dispose d'un délai de quatorze jours pour exercer son droit de rétractation d'un contrat conclu à distance,
            à la suite d'un démarchage téléphonique ou hors établissement, sans avoir à motiver sa décision ni à supporter
            d'autres coûts que ceux prévus aux articles L. 221-23 à L. 221-25. Le délai mentionné au premier alinéa court
            à compter du jour de la conclusion du contrat, pour les contrats de prestation de services.
            </font>
        """, styles['SmallText']))
        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph("Devis reçu avant l'exécution des travaux.", styles['Normal']))
        
        # Signature
        story.append(PageBreak())
        story.append(Spacer(1, 0.5 * inch))
        
        signature_client = Paragraph(
            "Signature du Client<br/>(précédée de la mention 'Bon pour accord')",
            styles['CenterAlign']
        )
        bon_pour_accord_text = Paragraph("<i>Bon pour accord</i>", styles['CenterAlign'])
        yousign_anchor = Paragraph('<font color="white">{{s1|signature|150|50}}</font>', styles['CenterAlign'])
        
        signature_cell_content = [signature_client, Spacer(1, 0.1 * inch), bon_pour_accord_text, Spacer(1, 0.1 * inch), yousign_anchor]
        signature_data = [[signature_cell_content]]
        signature_table = Table(signature_data, colWidths=[doc.width], rowHeights=1.2*inch)
        signature_table.setStyle(TableStyle([('BOX', (0,0), (-1,-1), 1, colors.lightgrey), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(signature_table)
        story.append(Spacer(1, 0.2 * inch))
        
        # Pied de page
        footer_text = f"""
        <font size=7>
        {company_name} - {company_address}<br/>
        SIRET {company_siret}<br/>
        </font>
        """
        story.append(Paragraph(footer_text, styles['Footer']))
        
        # Construction du PDF
        try:
            doc.build(story)
            buffer.seek(0)
            pdf_bytes = buffer.getvalue()
            
            # Nettoyer le fichier temporaire du logo APRÈS la construction du PDF
            if tmp_logo_path and os.path.exists(tmp_logo_path):
                try:
                    os.unlink(tmp_logo_path)
                except Exception as e:
                    logger.warning(f"Impossible de supprimer le fichier temporaire du logo: {e}")
            
            logger.info(f"Devis PDF généré avec succès: {quote_number}")
            return pdf_bytes
        except Exception as e:
            # Nettoyer le fichier temporaire même en cas d'erreur
            if tmp_logo_path and os.path.exists(tmp_logo_path):
                try:
                    os.unlink(tmp_logo_path)
                except Exception:
                    pass
            logger.error(f"Erreur lors de la construction du devis PDF: {e}", exc_info=True)
            return None
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération du devis PDF: {e}", exc_info=True)
        return None
