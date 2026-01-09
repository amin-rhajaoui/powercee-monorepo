"""
Service de génération de PDF pour les notes de dimensionnement.

Design professionnel PowerCEE avec couleurs de la marque.
"""
import io
import logging
import os
from datetime import datetime
from typing import Any

from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    PageBreak,
    Table,
    TableStyle,
    Flowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

logger = logging.getLogger(__name__)

# Couleurs PowerCEE - Primary: hsl(349 62% 27%) = #6B1F2F
POWERCEE_PRIMARY = colors.HexColor('#6B1F2F')  # Rouge bordeaux PowerCEE
POWERCEE_PRIMARY_LIGHT = colors.HexColor('#8B4A5F')  # Version plus claire
POWERCEE_PRIMARY_VERY_LIGHT = colors.HexColor('#E8DDE2')  # Version très claire pour fonds
POWERCEE_SECONDARY = colors.HexColor('#2C3E50')  # Bleu foncé pour textes
POWERCEE_SUCCESS = colors.HexColor('#27AE60')  # Vert pour succès/résultats positifs
POWERCEE_INFO = colors.HexColor('#3498DB')  # Bleu pour informations
POWERCEE_WARNING = colors.HexColor('#F39C12')  # Orange pour avertissements
POWERCEE_BACKGROUND = colors.HexColor('#F8F9FA')  # Gris très clair pour fonds
POWERCEE_TEXT = colors.HexColor('#2C3E50')  # Texte principal
POWERCEE_TEXT_MUTED = colors.HexColor('#6C757D')  # Texte secondaire


class PowerCeeHeader(Flowable):
    """En-tête personnalisé PowerCEE avec bandeau coloré."""
    
    def __init__(self, width, height, logo_path=None):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.logo_path = logo_path
    
    def draw(self):
        canvas = self.canv
        canvas.saveState()
        
        # Bandeau PowerCEE en haut
        canvas.setFillColor(POWERCEE_PRIMARY)
        canvas.rect(0, self.height - 0.5*inch, self.width, 0.5*inch, fill=1, stroke=0)
        
        # Logo ou texte PowerCEE (si logo disponible)
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                canvas.drawImage(
                    self.logo_path,
                    self.width - 2*inch,
                    self.height - 0.4*inch,
                    width=1.5*inch,
                    height=0.3*inch,
                    preserveAspectRatio=True,
                    mask='auto'
                )
            except Exception as e:
                logger.warning(f"Impossible de charger le logo: {e}")
                canvas.setFillColor(colors.white)
                canvas.setFont('Helvetica-Bold', 16)
                canvas.drawRightString(self.width - 0.3*inch, self.height - 0.35*inch, "PowerCEE")
        else:
            canvas.setFillColor(colors.white)
            canvas.setFont('Helvetica-Bold', 16)
            canvas.drawRightString(self.width - 0.3*inch, self.height - 0.35*inch, "PowerCEE")
        
        canvas.restoreState()


def create_sizing_note_pdf(
    prospect_details: dict[str, Any],
    sizing_data: dict[str, Any],
    compatible_pacs: list[dict[str, Any]] | None = None,
    selected_pump: dict[str, Any] | None = None,
    selected_heater: dict[str, Any] | None = None,
    thermostat_details: dict[str, Any] | None = None,
    logo_path: str | None = None,
    module_code: str | None = None,
) -> bytes | None:
    """
    Crée une note de dimensionnement en PDF avec design professionnel PowerCEE.

    Args:
        prospect_details: Détails du bénéficiaire (nom, adresse, etc.)
        sizing_data: Résultats du calcul de dimensionnement
        compatible_pacs: Liste des PACs compatibles (optionnel)
        selected_pump: PAC sélectionnée pour le devis (optionnel)
        selected_heater: Ballon thermodynamique associé (optionnel)
        thermostat_details: Détails du thermostat (optionnel)
        logo_path: Chemin vers le logo PowerCEE (optionnel)

    Returns:
        Bytes du PDF ou None en cas d'erreur
    """
    logger.info(f"Création de la note de dimensionnement PDF pour {prospect_details.get('nom', 'N/A')}")
    buffer = io.BytesIO()

    # Configuration du document avec marges professionnelles
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.2*cm,
        leftMargin=1.2*cm,
        topMargin=2*cm,
        bottomMargin=1.5*cm,
    )

    # Styles personnalisés PowerCEE
    styles = getSampleStyleSheet()
    
    # Style titre principal
    styles.add(ParagraphStyle(
        name='PowerCeeTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=POWERCEE_PRIMARY,
        fontName='Helvetica-Bold',
        spaceAfter=6,
        alignment=1,  # Centré
    ))
    
    # Style sous-titre
    styles.add(ParagraphStyle(
        name='PowerCeeSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=POWERCEE_TEXT_MUTED,
        fontName='Helvetica',
        spaceAfter=20,
        alignment=1,
        leading=14,
    ))
    
    # Style titre de section (à gauche)
    styles.add(ParagraphStyle(
        name='PowerCeeSectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=POWERCEE_PRIMARY,
        fontName='Helvetica-Bold',
        spaceBefore=16,
        spaceAfter=10,
        alignment=0,  # À gauche
        borderWidth=0,
        borderPadding=0,
        leftIndent=0,
        keepWithNext=1,
    ))
    
    # Style texte normal
    styles.add(ParagraphStyle(
        name='PowerCeeNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=POWERCEE_TEXT,
        fontName='Helvetica',
        leading=13,
        spaceAfter=6,
    ))
    
    # Style texte important
    styles.add(ParagraphStyle(
        name='PowerCeeBold',
        parent=styles['Normal'],
        fontSize=10,
        textColor=POWERCEE_TEXT,
        fontName='Helvetica-Bold',
        leading=13,
    ))
    
    # Style texte rassurant (vert)
    styles.add(ParagraphStyle(
        name='PowerCeeSuccess',
        parent=styles['Normal'],
        fontSize=10,
        textColor=POWERCEE_SUCCESS,
        fontName='Helvetica-Bold',
        leading=13,
    ))
    
    # Style valeur importante
    styles.add(ParagraphStyle(
        name='PowerCeeValue',
        parent=styles['Normal'],
        fontSize=16,
        textColor=POWERCEE_PRIMARY,
        fontName='Helvetica-Bold',
        alignment=1,
        leading=20,
    ))
    
    # Style valeur très importante
    styles.add(ParagraphStyle(
        name='PowerCeeValueLarge',
        parent=styles['Normal'],
        fontSize=28,
        textColor=POWERCEE_PRIMARY,
        fontName='Helvetica-Bold',
        alignment=1,
        leading=34,
    ))
    
    # Style cellule d'en-tête de tableau
    styles.add(ParagraphStyle(
        name='PowerCeeHeaderCell',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        alignment=1,
        leading=12,
    ))
    
    # Style cellule de résultat
    styles.add(ParagraphStyle(
        name='PowerCeeResultCell',
        parent=styles['Normal'],
        fontSize=11,
        textColor=POWERCEE_TEXT,
        fontName='Helvetica',
        alignment=1,
        leading=13,
        backColor=POWERCEE_BACKGROUND,
    ))
    
    # Style info box
    styles.add(ParagraphStyle(
        name='PowerCeeInfoBox',
        parent=styles['Normal'],
        fontSize=9,
        textColor=POWERCEE_TEXT_MUTED,
        fontName='Helvetica-Oblique',
        leading=13,
        leftIndent=12,
        rightIndent=12,
        backColor=POWERCEE_PRIMARY_VERY_LIGHT,
        borderPadding=12,
    ))
    
    # Style success box (vert)
    styles.add(ParagraphStyle(
        name='PowerCeeSuccessBox',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#155724'),
        fontName='Helvetica',
        leading=14,
        leftIndent=12,
        rightIndent=12,
        backColor=colors.HexColor('#D4EDDA'),
        borderPadding=12,
    ))

    # Fonction pour l'en-tête de page avec titre stylé
    def header(canvas_obj, document):
        canvas_obj.saveState()
        
        # Dimensions de l'en-tête
        header_height = 1.8*cm
        # Positionner l'en-tête juste au-dessus de la zone de contenu (qui commence à topMargin)
        # Les coordonnées Y commencent en bas (0), donc A4[1] est le haut de la page
        header_y = A4[1] - doc.topMargin
        margin_left = 1.2*cm
        margin_right = 1.2*cm
        header_width = A4[0] - margin_left - margin_right
        radius = 0.4*cm  # Bords arrondis
        
        # Dessiner le rectangle arrondi avec la couleur PowerCEE
        canvas_obj.setFillColor(POWERCEE_PRIMARY)
        canvas_obj.roundRect(
            margin_left,
            header_y,
            header_width,
            header_height,
            radius,
            fill=1,
            stroke=0
        )
        
        # Titre centré en blanc
        canvas_obj.setFillColor(colors.white)
        canvas_obj.setFont('Helvetica-Bold', 20)
        title_text = "Note de dimensionnement"
        text_width = canvas_obj.stringWidth(title_text, 'Helvetica-Bold', 20)
        text_x = margin_left + (header_width - text_width) / 2
        # Centrage vertical : hauteur du header / 2 - moitié de la hauteur du texte (approximativement 7pt)
        text_y = header_y + (header_height / 2) - 7
        canvas_obj.drawString(text_x, text_y, title_text)
        
        canvas_obj.restoreState()

    # Fonction pour le pied de page
    def footer(canvas_obj, document):
        canvas_obj.saveState()
        # Ligne de séparation
        canvas_obj.setStrokeColor(POWERCEE_PRIMARY_VERY_LIGHT)
        canvas_obj.setLineWidth(0.5)
        canvas_obj.line(1.2*cm, 1.5*cm, A4[0] - 1.2*cm, 1.5*cm)
        
        # Texte du pied de page
        canvas_obj.setFillColor(POWERCEE_TEXT_MUTED)
        canvas_obj.setFont('Helvetica', 8)
        footer_text = f"PowerCEE - Note de dimensionnement - Page {document.page} - {datetime.now().strftime('%d/%m/%Y')}"
        canvas_obj.drawCentredString(A4[0] / 2.0, 1*cm, footer_text)
        
        # Mention développé par Spatiaal
        canvas_obj.setFont('Helvetica-Oblique', 7)
        canvas_obj.setFillColor(colors.HexColor('#9CA3AF'))
        canvas_obj.drawCentredString(A4[0] / 2.0, 0.6*cm, "Généré avec PowerCEE développé par Spatiaal")
        
        canvas_obj.restoreState()

    story = []

    # Le titre est maintenant dans l'en-tête, pas besoin d'espacement supplémentaire
    # Le topMargin gère déjà l'espace
    
    # Sous-titre avec mention BAR-TH-171
    subtitle = Paragraph(
        "Pompe à Chaleur Air-Eau<br/>"
        "<i>Étude technique personnalisée pour votre projet de rénovation énergétique</i><br/>"
        f"<i>Mise en place de <b>{module_code if module_code else 'BAR-TH-171'}</b></i>",
        ParagraphStyle(
            name='DocumentSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=POWERCEE_TEXT_MUTED,
            fontName='Helvetica',
            spaceAfter=16,
            alignment=0,  # À gauche
            leading=14,
        ),
    )
    story.append(subtitle)
    
    story.append(Spacer(1, 0.4*cm))
    
    # Message rassurant d'introduction avec mention PowerCEE
    intro_box = Paragraph(
        "<b>Votre projet en toute confiance</b><br/>"
        "Cette note de dimensionnement a été établie selon les règles de l'art et les normes en vigueur. "
        "Elle vous garantit un dimensionnement adapté à vos besoins pour une installation performante et durable.<br/><br/>"
        "<i><font size=8 color='#6C757D'>Document généré avec le logiciel PowerCEE développé par Spatiaal</font></i>",
        styles['PowerCeeInfoBox'],
    )
    story.append(intro_box)
    
    story.append(Spacer(1, 0.6*cm))

    # --- Coordonnées du bénéficiaire ---
    # Tableau des coordonnées avec style PowerCEE
    coord_data = [
        [
            Paragraph("<b>Nom & Prénom</b>", styles['PowerCeeBold']),
            Paragraph(
                f"{prospect_details.get('prenom', '')} {prospect_details.get('nom', '')}",
                styles['PowerCeeNormal'],
            ),
        ],
        [
            Paragraph("<b>Adresse</b>", styles['PowerCeeBold']),
            Paragraph(
                f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}",
                styles['PowerCeeNormal'],
            ),
        ],
        [
            Paragraph("<b>Code Postal & Ville</b>", styles['PowerCeeBold']),
            Paragraph(
                f"{prospect_details.get('code_postal', '')} {prospect_details.get('ville', '')}",
                styles['PowerCeeNormal'],
            ),
        ],
        [
            Paragraph("<b>Téléphone</b>", styles['PowerCeeBold']),
            Paragraph(
                prospect_details.get('telephone', 'N/A'),
                styles['PowerCeeNormal'],
            ),
        ],
        [
            Paragraph("<b>Email</b>", styles['PowerCeeBold']),
            Paragraph(
                prospect_details.get('email', 'N/A'),
                styles['PowerCeeNormal'],
            ),
        ],
    ]
    
    coord_table = Table(coord_data, colWidths=[doc.width * 0.35, doc.width * 0.65])
    coord_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), POWERCEE_PRIMARY_VERY_LIGHT),
        ('TEXTCOLOR', (0, 0), (0, -1), POWERCEE_PRIMARY),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, POWERCEE_PRIMARY_VERY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1.5, POWERCEE_PRIMARY),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [POWERCEE_PRIMARY_VERY_LIGHT, colors.white]),
    ]))
    # Utiliser KeepTogether pour éviter les coupures
    coord_section = [
        Spacer(1, 0.3*cm),
        Paragraph("Informations du bénéficiaire", styles['PowerCeeSectionTitle']),
        Spacer(1, 0.25*cm),
        coord_table,
        Spacer(1, 0.8*cm),
    ]
    story.append(KeepTogether(coord_section))

    # --- Résultat principal mis en avant ---
    if sizing_data and "error" not in sizing_data:
        puissance = sizing_data.get("Puissance_Estimee_kW", "N/A")
        besoins = sizing_data.get("Besoins_Chaleur_Annuel_kWh", "N/A")

        # Affichage PUISSANCE et BESOINS sans doublons dans le PDF
        puissance_title = Paragraph(
            "<b>Puissance préconisée</b>",
            ParagraphStyle(
                name='ResultTitle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=POWERCEE_TEXT,
                fontName='Helvetica-Bold',
                alignment=1,
                spaceAfter=8,
            ),
        )
        puissance_value = Paragraph(
            f"<font size=32 color='#6B1F2F'><b>{puissance} kW</b></font>",
            ParagraphStyle(
                name='ResultValueMain',
                parent=styles['Normal'],
                fontSize=32,
                textColor=POWERCEE_PRIMARY,
                fontName='Helvetica-Bold',
                alignment=1,
            ),
        )

        besoins_title = Paragraph(
            "<b>Besoins annuels estimés</b>",
            ParagraphStyle(
                name='ResultTitle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=POWERCEE_TEXT,
                fontName='Helvetica-Bold',
                alignment=1,
                spaceAfter=8,
            ),
        )
        besoins_display = int(besoins) if isinstance(besoins, (int, float)) else besoins
        besoins_value = Paragraph(
            f"<font size=22 color='#27AE60'><b>{besoins_display} kWh/an</b></font>",
            ParagraphStyle(
                name='ResultValueSecondary',
                parent=styles['Normal'],
                fontSize=22,
                textColor=POWERCEE_SUCCESS,
                fontName='Helvetica-Bold',
                alignment=1,
            ),
        )

        # Table finale sans duplication
        left_cell_table = Table(
            [[puissance_title], [puissance_value]],
            colWidths=[doc.width / 2 - 0.3*cm],
            rowHeights=[0.8*cm, 1.5*cm],
        )
        left_cell_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, 0), 20),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 1), (-1, 1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 20),
        ]))

        right_cell_table = Table(
            [[besoins_title], [besoins_value]],
            colWidths=[doc.width / 2 - 0.3*cm],
            rowHeights=[0.8*cm, 1.5*cm],
        )
        right_cell_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, 0), 20),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 1), (-1, 1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 20),
        ]))

        result_main_table = Table(
            [[left_cell_table, right_cell_table]],
            colWidths=[doc.width / 2, doc.width / 2],
            rowHeights=[2.5*cm],
        )
        result_main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), POWERCEE_PRIMARY_VERY_LIGHT),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#E8F5E9')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0.2*cm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0.2*cm),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('GRID', (0, 0), (-1, -1), 2.5, POWERCEE_PRIMARY),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [POWERCEE_PRIMARY_VERY_LIGHT, colors.HexColor('#E8F5E9')]),
        ]))

        # Message rassurant avec style success - BIEN EN DESSOUS du tableau (pas de superposition)
        reassurance_text = Paragraph(
            "<b>✓ Dimensionnement validé</b><br/>"
            "Cette puissance a été calculée pour assurer votre confort même lors des périodes les plus froides, "
            "tout en optimisant les performances énergétiques de votre installation.",
            ParagraphStyle(
                name='ReassuranceText',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#155724'),
                fontName='Helvetica',
                leading=14,
                leftIndent=0,
                rightIndent=0,
                spaceBefore=0,
                spaceAfter=0,
            ),
        )
        
        reassurance_table = Table(
            [[reassurance_text]],
            colWidths=[doc.width],
            rowHeights=[None],  # Hauteur automatique selon le contenu
        )
        reassurance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#D4EDDA')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 20),
            ('RIGHTPADDING', (0, 0), (-1, -1), 20),
            ('TOPPADDING', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
            ('BOX', (0, 0), (-1, -1), 2, POWERCEE_SUCCESS),  # Bordure verte épaisse
            ('GRID', (0, 0), (-1, -1), 0, colors.white),  # Pas de grille interne
        ]))
        
        # Grouper le tableau principal et la validation ensemble pour éviter les coupures
        # On ajoute la table UNE SEULE FOIS dans ce groupe
        result_with_validation = [
            result_main_table,
            Spacer(1, 0.5*cm),  # Espacement normal (pas négatif) pour mettre en dessous
            reassurance_table,
            Spacer(1, 0.8*cm),  # Espacement après la validation
        ]
        story.append(KeepTogether(result_with_validation))

    # --- Méthodologie ---
    methodo_section = []
    methodo_section.append(Spacer(1, 0.3*cm))
    methodo_section.append(Paragraph("Méthodologie de calcul", styles['PowerCeeSectionTitle']))
    methodo_section.append(Spacer(1, 0.25*cm))
    
    methodo_text = """
    <b>Une approche rigoureuse et transparente</b><br/>
    Le dimensionnement de votre pompe à chaleur est réalisé selon une méthode de calcul volumique simplifiée, 
    basée sur le <b>Coefficient G</b> de déperdition thermique. Cette méthode prend en compte :
    """
    
    methodo_list = [
        "L'année de construction de votre logement et ses caractéristiques",
        "Le niveau d'isolation global (calculé automatiquement depuis vos données)",
        "La zone climatique et l'altitude de votre localisation",
        "Le type d'émetteurs de chauffage installés (basse ou haute température)",
        "Les conditions climatiques extrêmes de votre région"
    ]
    
    methodo_section.append(Paragraph(methodo_text, styles['PowerCeeNormal']))
    methodo_section.append(Spacer(1, 0.2*cm))
    
    for item in methodo_list:
        methodo_section.append(Paragraph(f"• {item}", styles['PowerCeeNormal']))
    
    methodo_section.append(Spacer(1, 0.7*cm))
    story.append(KeepTogether(methodo_section))

    # --- Paramètres du logement ---
    if sizing_data and "error" not in sizing_data:
        details = sizing_data.get("Details_Calcul", {})
        params = sizing_data.get("Parametres_Entree", {})
        intermediate = sizing_data.get("Intermediate_Calculations", {})

        params_section = []
        
        # Tableau des paramètres
        altitude_value = prospect_details.get('altitude')
        if altitude_value is None:
            altitude_value = params.get('Altitude', 'N/A')
        if altitude_value is not None and altitude_value != 'N/A':
            altitude_display = f"{int(altitude_value)} m"
        else:
            altitude_display = 'N/A'
        
        temp_de_base = prospect_details.get('temp_de_base')
        if temp_de_base is None:
            teb_value = intermediate.get('teb')
            if teb_value is not None and isinstance(teb_value, (int, float)):
                temp_de_base = int(teb_value)
        
        params_data = [
            [
                Paragraph("<b>Surface chauffée</b>", styles['PowerCeeBold']),
                Paragraph(f"{params.get('Surface', 'N/A')} m²", styles['PowerCeeNormal']),
                Paragraph("<b>Volume chauffé</b>", styles['PowerCeeBold']),
                Paragraph(f"{details.get('Volume_Chauffe_m3', 'N/A'):.0f} m³" if isinstance(details.get('Volume_Chauffe_m3'), (int, float)) else f"{details.get('Volume_Chauffe_m3', 'N/A')} m³", styles['PowerCeeNormal']),
            ],
            [
                Paragraph("<b>Hauteur sous plafond</b>", styles['PowerCeeBold']),
                Paragraph(f"{params.get('Hauteur', 'N/A')} m", styles['PowerCeeNormal']),
                Paragraph("<b>Année de construction</b>", styles['PowerCeeBold']),
                Paragraph(f"{params.get('Annee', 'N/A')}", styles['PowerCeeNormal']),
            ],
            [
                Paragraph("<b>Zone climatique</b>", styles['PowerCeeBold']),
                Paragraph(f"{params.get('Zone_Climatique', 'N/A')}", styles['PowerCeeNormal']),
                Paragraph("<b>Altitude</b>", styles['PowerCeeBold']),
                Paragraph(altitude_display, styles['PowerCeeNormal']),
            ],
            [
                Paragraph("<b>Type d'isolation</b>", styles['PowerCeeBold']),
                Paragraph(
                    (params.get('Isolation', 'N/A') or 'N/A').replace('_', ' ').title(),
                    styles['PowerCeeNormal'],
                ),
                Paragraph("<b>Température ext. de base</b>", styles['PowerCeeBold']),
                Paragraph(
                    f"{int(temp_de_base)}°C" if temp_de_base is not None else 'N/A',
                    styles['PowerCeeNormal'],
                ),
            ],
        ]
        
        params_table = Table(params_data, colWidths=[doc.width * 0.25, doc.width * 0.25, doc.width * 0.25, doc.width * 0.25])
        params_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), POWERCEE_PRIMARY_VERY_LIGHT),
            ('BACKGROUND', (2, 0), (2, -1), POWERCEE_PRIMARY_VERY_LIGHT),
            ('TEXTCOLOR', (0, 0), (0, -1), POWERCEE_PRIMARY),
            ('TEXTCOLOR', (2, 0), (2, -1), POWERCEE_PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ]))
        params_section_content = [
            Spacer(1, 0.3*cm),
            Paragraph("Caractéristiques de votre logement", styles['PowerCeeSectionTitle']),
            Spacer(1, 0.25*cm),
            params_table,
            Spacer(1, 0.7*cm),
        ]
        story.append(KeepTogether(params_section_content))

        # --- Détails du calcul ---
        calc_details_section = [
            Paragraph("Détails du calcul", styles['PowerCeeSectionTitle']),
            Spacer(1, 0.3*cm),
        ]
        
        calc_details_data = [
            [
                Paragraph("<b>Paramètre</b>", styles['PowerCeeHeaderCell']),
                Paragraph("<b>Valeur</b>", styles['PowerCeeHeaderCell']),
                Paragraph("<b>Unité</b>", styles['PowerCeeHeaderCell']),
            ],
            [
                Paragraph("Coefficient G (base)", styles['PowerCeeNormal']),
                Paragraph(f"{intermediate.get('g_base', 'N/A')}", styles['PowerCeeNormal']),
                Paragraph("-", styles['PowerCeeNormal']),
            ],
            [
                Paragraph("Facteur d'isolation", styles['PowerCeeNormal']),
                Paragraph(f"{intermediate.get('facteur_isolation', 'N/A'):.3f}" if isinstance(intermediate.get('facteur_isolation'), (int, float)) else str(intermediate.get('facteur_isolation', 'N/A')), styles['PowerCeeNormal']),
                Paragraph("-", styles['PowerCeeNormal']),
            ],
            [
                Paragraph("Coefficient G final", styles['PowerCeeBold']),
                Paragraph(f"{details.get('G_Coefficient_Wm3K', 'N/A'):.3f}" if isinstance(details.get('G_Coefficient_Wm3K'), (int, float)) else str(details.get('G_Coefficient_Wm3K', 'N/A')), styles['PowerCeeBold']),
                Paragraph("W/m³·K", styles['PowerCeeNormal']),
            ],
            [
                Paragraph("Delta T (écart température)", styles['PowerCeeNormal']),
                Paragraph(f"{details.get('Delta_T_K', 'N/A'):.1f} K" if isinstance(details.get('Delta_T_K'), (int, float)) else f"{details.get('Delta_T_K', 'N/A')} K", styles['PowerCeeNormal']),
                Paragraph("K", styles['PowerCeeNormal']),
            ],
            [
                Paragraph("Facteur correction émetteur", styles['PowerCeeNormal']),
                Paragraph(f"{details.get('Facteur_Correction_Emetteur', 'N/A')}", styles['PowerCeeNormal']),
                Paragraph("-", styles['PowerCeeNormal']),
            ],
        ]
        
        calc_details_table = Table(calc_details_data, colWidths=[doc.width * 0.5, doc.width * 0.3, doc.width * 0.2])
        calc_details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), POWERCEE_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, POWERCEE_BACKGROUND]),
        ]))
        calc_details_section.append(calc_details_table)
        calc_details_section.append(Spacer(1, 0.5*cm))
        story.append(KeepTogether(calc_details_section))

        # --- Formule et calcul détaillé ---
        formule_section = [
            Spacer(1, 0.4*cm),  # Espacement supplémentaire après la section précédente
            Paragraph("Calcul de la puissance nécessaire", styles['PowerCeeSectionTitle']),
            Spacer(1, 0.3*cm),
        ]
        
        formule_text = """
        <b>Formule utilisée :</b><br/>
        <font size=12><b>Puissance (kW) = Volume × G × ΔT × FCE</b></font><br/><br/>
        Cette formule nous permet de déterminer précisément la puissance nécessaire pour compenser les déperditions 
        thermiques de votre logement dans les conditions les plus exigeantes.
        """
        formule_section.append(Paragraph(formule_text, styles['PowerCeeNormal']))
        formule_section.append(Spacer(1, 0.3*cm))
        
        # Calcul étape par étape
        vol = details.get('Volume_Chauffe_m3', 'N/A')
        g_coeff = details.get('G_Coefficient_Wm3K', 'N/A')
        delta_t_val = details.get('Delta_T_K', 'N/A')
        fce = details.get('Facteur_Correction_Emetteur', 'N/A')
        p_kw_brut = intermediate.get('puissance_kw_brut', 'N/A') if intermediate else 'N/A'
        p_kw_arrondi = sizing_data.get("Puissance_Estimee_kW", "N/A")
        
        try:
            vol_num = float(vol) if vol != 'N/A' else None
            g_num = float(g_coeff) if g_coeff != 'N/A' else None
            delta_t_num = float(delta_t_val) if delta_t_val != 'N/A' else None
            fce_num = float(fce) if fce != 'N/A' else None
            p_kw_brut_num = float(p_kw_brut) if p_kw_brut != 'N/A' else None

            if all(x is not None for x in [vol_num, g_num, delta_t_num, fce_num, p_kw_brut_num]):
                etape1 = vol_num * g_num
                etape2 = etape1 * delta_t_num
                etape3 = etape2 * fce_num

                steps_data = [
                    [
                        Paragraph("<b>Étape</b>", styles['PowerCeeHeaderCell']),
                        Paragraph("<b>Calcul</b>", styles['PowerCeeHeaderCell']),
                        Paragraph("<b>Résultat</b>", styles['PowerCeeHeaderCell']),
                    ],
                    [
                        Paragraph("1", styles['PowerCeeBold']),
                        Paragraph(f"Volume × G<br/>{vol:.0f} m³ × {g_coeff:.3f} W/m³·K", styles['PowerCeeNormal']),
                        Paragraph(f"{etape1:.1f} W/K", styles['PowerCeeNormal']),
                    ],
                    [
                        Paragraph("2", styles['PowerCeeBold']),
                        Paragraph(f"Étape 1 × ΔT<br/>{etape1:.1f} × {delta_t_val:.1f} K", styles['PowerCeeNormal']),
                        Paragraph(f"{etape2:.0f} W", styles['PowerCeeNormal']),
                    ],
                    [
                        Paragraph("3", styles['PowerCeeBold']),
                        Paragraph(f"Étape 2 × FCE<br/>{etape2:.0f} × {fce}", styles['PowerCeeNormal']),
                        Paragraph(f"{etape3:.0f} W", styles['PowerCeeNormal']),
                    ],
                    [
                        Paragraph("4", styles['PowerCeeBold']),
                        Paragraph("Conversion (÷ 1000)", styles['PowerCeeNormal']),
                        Paragraph(f"{p_kw_brut_num:.2f} kW", styles['PowerCeeSuccess']),
                    ],
                    [
                        Paragraph("5", styles['PowerCeeBold']),
                        Paragraph("Arrondi supérieur<br/>(puissance commerciale)", styles['PowerCeeNormal']),
                        Paragraph(f"<b><font size=14>{p_kw_arrondi} kW</font></b>", styles['PowerCeeValue']),
                    ],
                ]

                steps_table = Table(steps_data, colWidths=[doc.width * 0.15, doc.width * 0.5, doc.width * 0.35])
                steps_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), POWERCEE_PRIMARY),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                    ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                    ('BACKGROUND', (0, -1), (-1, -1), POWERCEE_PRIMARY_VERY_LIGHT),
                    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ]))
                formule_section.append(steps_table)
        except (ValueError, TypeError) as e:
            logger.warning(f"Erreur dans le calcul étape par étape: {e}")
        
        formule_section.append(Spacer(1, 0.5*cm))
        story.append(KeepTogether(formule_section))

        # --- Besoins annuels ---
        besoins_section = [
            Paragraph("Estimation des besoins annuels", styles['PowerCeeSectionTitle']),
            Spacer(1, 0.3*cm),
        ]
        
        besoins_annuels = sizing_data.get("Besoins_Chaleur_Annuel_kWh")
        dju_val = intermediate.get('dju', 'N/A') if intermediate else 'N/A'
        regime_besoins = sizing_data.get("Regime_Temperature", "Moyenne/Haute température")
        scop_estime = 4.5 if regime_besoins == 'Basse température' else 3.5
        
        if besoins_annuels is not None:
            consommation_electrique = round(besoins_annuels / scop_estime)
            
            besoins_text = f"""
            <b>Votre consommation estimée :</b><br/>
            Basée sur les <b>Degrés-Jours Unifiés (DJU)</b> de votre zone climatique ({dju_val}), 
            votre logement nécessitera environ <b><font color='#27AE60'>{int(besoins_annuels)} kWh/an</font></b> 
            de chaleur pour le chauffage.<br/><br/>
            
            Avec une pompe à chaleur ayant un rendement saisonnier (SCOP) de <b>{scop_estime}</b> 
            pour un régime à <b>{regime_besoins}</b>, votre consommation électrique estimée sera d'environ 
            <b><font color='#6B1F2F'>{consommation_electrique} kWh/an</font></b>.
            """
            besoins_section.append(Paragraph(besoins_text, styles['PowerCeeNormal']))
            besoins_section.append(Spacer(1, 0.3*cm))
            
            # Tableau comparatif
            annual_comparison = [
                [
                    Paragraph("<b>Type d'énergie</b>", styles['PowerCeeHeaderCell']),
                    Paragraph("<b>Consommation annuelle</b>", styles['PowerCeeHeaderCell']),
                ],
                [
                    Paragraph("Besoins de chaleur", styles['PowerCeeNormal']),
                    Paragraph(f"{int(besoins_annuels):,} kWh/an".replace(',', ' '), styles['PowerCeeBold']),
                ],
                [
                    Paragraph("Consommation électrique (PAC)", styles['PowerCeeNormal']),
                    Paragraph(f"{consommation_electrique:,} kWh/an".replace(',', ' '), styles['PowerCeeSuccess']),
                ],
            ]
            
            annual_table = Table(annual_comparison, colWidths=[doc.width * 0.6, doc.width * 0.4])
            annual_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), POWERCEE_PRIMARY),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, POWERCEE_BACKGROUND]),
            ]))
            besoins_section.append(annual_table)
            besoins_section.append(Spacer(1, 0.5*cm))  # Espacement suffisant pour éviter la superposition
            
            # Message rassurant sur les économies - BIEN EN DESSOUS du tableau
            savings_message = Paragraph(
                "<b>✓ Une solution économique et écologique</b><br/>"
                "La pompe à chaleur vous permettra de réduire significativement votre consommation d'énergie "
                "par rapport à un système de chauffage classique, tout en préservant votre confort.",
                styles['PowerCeeInfoBox'],
            )
            besoins_section.append(savings_message)
        
        besoins_section.append(Spacer(1, 0.5*cm))
        story.append(KeepTogether(besoins_section))

        # --- Régime de température ---
        config_section = [
            Spacer(1, 0.4*cm),  # Espacement supplémentaire après la section précédente
            Paragraph("Configuration technique", styles['PowerCeeSectionTitle']),
            Spacer(1, 0.3*cm),
        ]
        
        # Régime récupéré depuis sizing_data (utiliser la même variable que dans besoins)
        regime_config = sizing_data.get("Regime_Temperature", "Moyenne/Haute température") if sizing_data else "Moyenne/Haute température"
        regime_info = Paragraph(
            f"<b>Régime de température :</b> {regime_config}<br/>"
            f"Le dimensionnement est adapté à vos émetteurs existants pour garantir une installation "
            f"parfaitement compatible et performante.",
            styles['PowerCeeNormal'],
        )
        config_section.append(regime_info)
        config_section.append(Spacer(1, 0.3*cm))
        
        taux_couverture = sizing_data.get("Taux_Couverture", "N/A")
        taux_info = Paragraph(
            f"<b>Taux de couverture :</b> {taux_couverture}%<br/>"
            "Cette puissance permet de couvrir 100% des besoins de chauffage même lors des périodes "
            "les plus froides, sans nécessiter d'appoint électrique complémentaire.",
            styles['PowerCeeNormal'],
        )
        config_section.append(taux_info)
        config_section.append(Spacer(1, 0.5*cm))
        story.append(KeepTogether(config_section))

    # --- Équipement sélectionné (si fourni) ---
    if selected_pump:
        equipment_section = [
            Paragraph("Équipement préconisé", styles['PowerCeeSectionTitle']),
            Spacer(1, 0.3*cm),
        ]
        
        equipment_text = [
            f"<b>Pompe à chaleur :</b> {selected_pump.get('marque', 'N/A')} {selected_pump.get('modele', 'N/A')}",
        ]
        
        if selected_pump.get('puissance_moins_7'):
            equipment_text.append(f"<b>Puissance à -7°C :</b> {selected_pump.get('puissance_moins_7')} kW")
        
        regime = sizing_data.get("Regime_Temperature", "Moyenne/Haute température") if sizing_data else "Moyenne/Haute température"
        if regime == 'Basse température':
            etas_value = selected_pump.get('etas_35') or 'N/A'
            equipment_text.append(f"<b>ETAS à 35°C :</b> {etas_value}%")
        else:
            etas_value = selected_pump.get('etas_55') or 'N/A'
            equipment_text.append(f"<b>ETAS à 55°C :</b> {etas_value}%")
        
        for text in equipment_text:
            equipment_section.append(Paragraph(text, styles['PowerCeeNormal']))
        
        if selected_heater:
            equipment_section.append(Spacer(1, 0.2*cm))
            equipment_section.append(Paragraph(
                f"<b>Ballon thermodynamique associé :</b> {selected_heater.get('designation', 'N/A')} "
                f"({selected_heater.get('capacite', 'N/A')}L)",
                styles['PowerCeeNormal'],
            ))
        
        if thermostat_details:
            equipment_section.append(Spacer(1, 0.2*cm))
            equipment_section.append(Paragraph(
                f"<b>Thermostat :</b> {thermostat_details.get('marque', 'N/A')} "
                f"{thermostat_details.get('modele', 'N/A')} (Classe {thermostat_details.get('reference', 'N/A')})",
                styles['PowerCeeNormal'],
            ))
        
        equipment_section.append(Spacer(1, 0.5*cm))
        story.append(KeepTogether(equipment_section))

    # --- Note de garantie et transparence ---
    story.append(Spacer(1, 0.3*cm))
    garantie_box = Paragraph(
        "<b>Engagement PowerCEE</b><br/>"
        "Cette note de dimensionnement a été établie avec rigueur selon les règles de l'art. ",
        styles['PowerCeeInfoBox'],
    )
    story.append(garantie_box)
    
    story.append(Spacer(1, 0.4*cm))
    
    # Mention finale avec logo/branding
    final_mention = Table(
        [[
            Paragraph(
                f"<i><font size=8 color='#6C757D'>Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}</font></i><br/>"
                f"<i><font size=8 color='#6C757D'>avec le logiciel PowerCEE développé par Spatiaal</font></i>",
                ParagraphStyle(
                    name='FinalMention',
                    parent=styles['Normal'],
                    fontSize=8,
                    textColor=POWERCEE_TEXT_MUTED,
                    fontName='Helvetica-Oblique',
                    alignment=1,
                ),
            )
        ]],
        colWidths=[doc.width],
    )
    final_mention.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), POWERCEE_BACKGROUND),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))
    story.append(final_mention)

    # --- Construction du PDF ---
    try:
        def first_page(canvas_obj, document):
            header(canvas_obj, document)
            footer(canvas_obj, document)
        
        def later_pages(canvas_obj, document):
            header(canvas_obj, document)
            footer(canvas_obj, document)
        
        doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"Erreur lors de la construction de la note de dimensionnement PDF: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
