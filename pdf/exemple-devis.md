def create_quote_pdf(prospect_details: dict, user_details: dict, pump_details: dict, devis_id: int, pricing_details: dict, line_item_prices: dict, heater_details: dict | None = None, thermostat_details: dict | None = None, sizing_data: dict | None = None) -> bytes | None:
    """
    Crée un devis détaillé en PDF.
    Peut inclure un chauffe-eau en plus pour les offres "combo".
    """
    # --- Définition du style moderne ---
    PRIMARY_COLOR = colors.HexColor('#1E8449') # Vert professionnel
    LIGHT_BACKGROUND = colors.HexColor('#F4F6F6')
    DARK_TEXT = colors.HexColor('#2C3E50')
    LIGHT_GREY_TEXT = colors.HexColor('#7F8C8D')
    TABLE_HEADER_BG = colors.HexColor('#273746')
    ACCENT_GREEN_BG = colors.HexColor('#D5F5E3')
    ACCENT_GREEN_TEXT = colors.HexColor('#196F3D')

    logger.info("PDF_GEN(344): Début de create_quote_pdf.")
    logger.info(f"Création du devis PDF N°{devis_id} pour {prospect_details.get('nom')} avec les prix de vente calculés.")
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=0.7*inch, leftMargin=0.7*inch,
                            topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    logger.info("PDF_GEN(355): Styles de base chargés.")
    styles.add(ParagraphStyle(name='RightAlign', parent=styles['Normal'], alignment=2, textColor=DARK_TEXT))
    styles.add(ParagraphStyle(name='CenterAlign', parent=styles['Normal'], alignment=1, textColor=DARK_TEXT))
    styles.add(ParagraphStyle(name='LeftInfo', parent=styles['Normal'], spaceBefore=6, textColor=DARK_TEXT))
    styles.add(ParagraphStyle(name='RightInfo', parent=styles['RightAlign'], spaceBefore=6, textColor=DARK_TEXT))
    styles.add(ParagraphStyle(name='BoldRight', parent=styles['RightAlign'], fontName='Helvetica-Bold', textColor=DARK_TEXT))
    styles.add(ParagraphStyle(name='Footer', parent=styles['Normal'], fontSize=8, alignment=1, textColor=LIGHT_GREY_TEXT))
    styles.add(ParagraphStyle(name='HeaderCell', parent=styles['Normal'], alignment=1, textColor=colors.whitesmoke)) # Style pour le texte blanc dans l'en-tête
    styles.add(ParagraphStyle(name='SmallText', parent=styles['Normal'], fontSize=8, textColor=DARK_TEXT))
    styles.add(ParagraphStyle(name='TableDescription', parent=styles['Normal'], spaceAfter=0, spaceBefore=0, leading=11, textColor=DARK_TEXT, keepWithNext=0, splitLongWords=0))

    logger.info("PDF_GEN(363): Styles personnalisés ajoutés.")
    story = []

    # --- En-tête ---
    # Tableau 1: Infos GreenPower vs Infos Client
    logger.info("PDF_GEN(368): Création de l'en-tête, Tableau 1.")
    header_cols_1 = [3.5*inch, 3.5*inch]
    
    # Logo et infos GreenPower
    try:
        logger.info(f"PDF_GEN(373): Tentative de chargement du logo depuis {LOGO_PATH}.")
        logo = Image(LOGO_PATH, width=1.5*inch, height=0.75*inch)
        logo.hAlign = 'LEFT'
    except Exception:
        logger.warning("PDF_GEN(377): Logo non trouvé, utilisation de texte.")
        logo = Paragraph("<b>GREENPOWER</b>", styles['h2'])
 
    logger.info("PDF_GEN(381): Préparation des informations de l'entreprise.")
    company_info = [
        logo,
        Paragraph("<b>GREENPOWER</b>", styles['LeftInfo']),
        Paragraph("16 RUE DE PARIS, 89100 SAINT-DENIS-LES-SENS", styles['LeftInfo']),
        Paragraph("SIRET: 900 000 043 00027", styles['LeftInfo']),
        Paragraph("TELEPHONE: 03 51 57 10 68", styles['LeftInfo']),
        Paragraph("MAIL: contact@greenpower89.fr", styles['LeftInfo']),
    ]
    # Infos Client
    logger.info("PDF_GEN(387): Préparation des informations du client.")
    client_info = [
        Paragraph(f"A l'attention de M./Mme {prospect_details.get('prenom')} {prospect_details.get('nom')}", styles['RightInfo']),
        Paragraph(f"{prospect_details.get('numero')} {prospect_details.get('adresse')}", styles['RightInfo']),
        Paragraph(f"{prospect_details.get('code_postal')} {prospect_details.get('ville')}", styles['RightInfo']),
        Paragraph(f"Téléphone: {prospect_details.get('telephone')}", styles['RightInfo']),
        Paragraph(f"Email: {prospect_details.get('email')}", styles['RightInfo']),
    ]
    header_table_1 = Table([[company_info, client_info]], colWidths=header_cols_1)
    logger.info("PDF_GEN(395): Création de l'objet Table 1.")
    header_table_1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0)]))
    story.append(header_table_1)
    story.append(Spacer(1, 0.4 * inch))
    logger.info("PDF_GEN(399): Tableau 1 ajouté à l'histoire du PDF.")

    # Tableau 2: Infos Devis
    logger.info("PDF_GEN(402): Création de l'en-tête, Tableau 2.")
    salesperson_name = f"{user_details.get('first_name', '')} {user_details.get('last_name', '')}".strip()
    # La date de visite technique est définie à la date du jour, comme la date du devis.
    today_date = datetime.now().strftime('%d/%m/%Y')
    logger.info(f"PDF_GEN(405): Infos devis: ID={devis_id}, Commercial={salesperson_name}.")
    devis_info_data = [
        [Paragraph('<b>DEVIS N°</b>', styles['HeaderCell']), Paragraph(f'<b>{devis_id}</b>', styles['HeaderCell']), 'Date de visite technique:', today_date],
        ['Date du devis:', today_date, "Validité de l'offre:", '1 mois'],
        ['Technicien-Conseil:', salesperson_name, '', ''],
    ]
    # Ajustement de la largeur des colonnes pour un meilleur alignement.
    # La 3ème colonne a été élargie pour "Date de visite technique" et la 4ème a été réduite.
    header_table_2 = Table(devis_info_data, colWidths=[
        1.5 * inch,  # Colonne 1: Labels (ex: 'Date du devis:')
        1.9 * inch,  # Colonne 2: Valeurs (ex: date, nom)
        1.9 * inch,  # Colonne 3: Labels (ex: 'Date de visite technique:') - Élargie
        1.7 * inch   # Colonne 4: Valeurs (ex: 'N/A') - Réduite
    ], rowHeights=0.3*inch)
    logger.info("PDF_GEN(413): Création de l'objet Table 2.")
    header_table_2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.lightgrey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(header_table_2)
    story.append(Spacer(1, 0.4 * inch))
    logger.info("PDF_GEN(422): Tableau 2 ajouté à l'histoire du PDF.")

    # --- Calcul des totaux pour les deux lignes du devis ---
    logger.info("PDF_GEN(438): Calcul des totaux HT pour les lignes du devis.")
    tva_rate = 0.055
    # Le total fourniture est la somme de tous les équipements et accessoires.
    fourniture_ht_total = (
        line_item_prices.get('pac', 0.0) +
        line_item_prices.get('ballon', 0.0) +
        line_item_prices.get('thermostat', 0.0) +
        line_item_prices.get('accessoires', 0.0)
    )
    main_oeuvre_ht_total = line_item_prices.get('main_oeuvre', 0.0)
    logger.info(f"PDF_GEN(450): fourniture_ht_total={fourniture_ht_total}, main_oeuvre_ht_total={main_oeuvre_ht_total}.") # type: ignore
    
    table_data = [
        ['DESCRIPTION', 'QTE', 'PRIX UNITAIRE HT', 'TVA (%)', 'REMISE (€)', 'MONTANT HT']
    ]

    # --- Ligne 1: Fourniture ---
    logger.info("PDF_GEN(457): Préparation des lignes de fourniture détaillées.") # type: ignore

    # --- Ligne pour la Pompe à Chaleur ---
    # Déterminer le type de PAC pour l'affichage
    pac_usage_text = "Chauffage et ECS" if heater_details or pump_details.get('usage') == 'Chauffage + ECS' else "Chauffage seul"
    
    # Déterminer le régime de température depuis sizing_data ou prospect_details
    if sizing_data and "error" not in sizing_data:
        regime_temperature = sizing_data.get("Regime_Temperature", "Moyenne/Haute température")
    else:
        regime_temperature = prospect_details.get('regime_temperature', 'Moyenne/Haute température')
    
    # Formater le texte du régime de température
    if regime_temperature == "Basse température":
        regime_temperature_text = "Basse température"
    else:
        regime_temperature_text = "Moyenne/Haute température"
    
    # Déterminer l'ETAS à afficher selon le régime de température
    if regime_temperature == "Basse température":
        etas_value = pump_details.get('etas_35', 'N/A')
        etas_label = "Efficacité énergétique saisonnière à 35°C"
    else:
        etas_value = pump_details.get('etas_55', 'N/A')
        etas_label = "Efficacité énergétique saisonnière à 55°C"

    # Récupérer la surface chauffée
    surface_chauffee = prospect_details.get('surface_chauffee')
    surface_text = f"{surface_chauffee:.2f} m²" if surface_chauffee else "N/A"
    
    description_pac_parts = [
        "<b>Mise en place d'une opération BAR-TH-171 : Pompe à chaleur AIR/EAU</b>",
        f"&nbsp;&nbsp;&nbsp;Marque et référence de la PAC : {pump_details.get('marque', 'N/A')} {pump_details.get('modele', 'N/A')} Référence : {pump_details.get('reference', 'N/A')}", 
        f"&nbsp;&nbsp;&nbsp;Méthode d'utilisation : {pump_details.get('usage', 'N/A')}",
        f"&nbsp;&nbsp;&nbsp;Alimentation : {pump_details.get('alimentation', 'N/A')}",
        f"&nbsp;&nbsp;&nbsp;Surface chauffée : {surface_text}",
        f"&nbsp;&nbsp;&nbsp;Puissance dimensionnée : {pump_details.get('puissance_moins_7', 'N/A')} kW",
        f"&nbsp;&nbsp;&nbsp;{etas_label} : {etas_value}%",
        f"&nbsp;&nbsp;&nbsp;Régime d'eau : {regime_temperature_text}",
        "&nbsp;&nbsp;&nbsp;Installation d'un régulateur de classe IV minimum : Oui",
        "&nbsp;&nbsp;&nbsp;Dépose de l'équipement existant : Oui",
        f"&nbsp;&nbsp;&nbsp;Chauffage principal avant travaux : {prospect_details.get('systeme_chauffage_actuel', 'N/A').replace('_', ' ').capitalize()}",
        f"&nbsp;&nbsp;&nbsp;Marque du mode de chauffage vétuste : {prospect_details.get('marque_chauffage_actuel', 'N/A')}",
    ]
    # Afficher la neutralisation de la cuve uniquement si le chauffage est au fioul
    if prospect_details.get('systeme_chauffage_actuel') == 'fioul':
        description_pac_parts.append("&nbsp;&nbsp;&nbsp;Neutralisation de la cuve à fioul : Oui")
    else:
        description_pac_parts.append("&nbsp;&nbsp;&nbsp;Neutralisation de la cuve à fioul : Non applicable")
    
    description_pac_parts.append("&nbsp;&nbsp;&nbsp;<u>Mention :</u> Mise en place d'une opération BAR-TH-171 : Pompe à chaleur de type Air/Eau.")

    # Filtrer les éléments vides avant le join pour éviter les doubles sauts de ligne
    description_pac_parts = [p for p in description_pac_parts if p and p.strip()]
    description_pac = Paragraph("<br/>".join(description_pac_parts).rstrip(), styles['TableDescription'])
    pac_ht = line_item_prices.get('pac', 0.0)
    table_data.append([description_pac, '1.00', f"{pac_ht:,.2f} €", '5.50', '0,00 €', f"{pac_ht:,.2f} €"])
    logger.info("PDF_GEN: Ligne 'Pompe à chaleur' ajoutée.")
    # Si combo : ajouter immédiatement la main d'œuvre PAC
    if heater_details:
        main_oeuvre_pac_ht = line_item_prices.get('main_oeuvre_pac', 0.0)
        mo_pac_description = Paragraph("""
            <b>Main d'œuvre Pompe à chaleur Air/Eau</b><br/>
            - Dépose de l'équipement existant<br/>
            - Installation et raccordements (frigorifique, hydraulique, électrique) de la pompe à chaleur<br/>
            - Contrôles, mise en service et explication du fonctionnement<br/>
            - Installation par un professionnel agréé RGE QualiPAC
        """, styles['Normal'])
        table_data.append([mo_pac_description, '1.00', f"{main_oeuvre_pac_ht:,.2f} €", '5.50', '0,00 €', f"{main_oeuvre_pac_ht:,.2f} €"])
        logger.info("PDF_GEN: Ligne 'Main d'oeuvre PAC' ajoutée (positionnée après la PAC).")

    # --- Ligne pour le Ballon (si combo) ---
    if heater_details:
        logger.info("PDF_GEN: Un chauffe-eau est présent (combo), ajout de sa ligne.") # type: ignore
        capacite_val = heater_details.get('capacite')
        try:
            capacite_float = float(capacite_val)
        except (TypeError, ValueError):
            capacite_float = None
        profile_soutirage = "XL" if capacite_float is not None and capacite_float >= 250 else "L"
        description_ballon_parts = [
            "<b>Mise en place d'une opération BAR-TH-148 : Chauffe-eau thermodynamique</b>",
            f"&nbsp;&nbsp;&nbsp;Marque et référence du ballon : {heater_details.get('marque', 'N/A')} {heater_details.get('designation', 'N/A')} Référence : {heater_details.get('reference', 'N/A')}",
            f"&nbsp;&nbsp;&nbsp;Éfficacité énergétique : {heater_details.get('rendement_energetique', 'N/A')}%",
            f"&nbsp;&nbsp;&nbsp;Capacité: {heater_details.get('capacite', 'N/A')} L",
            f"&nbsp;&nbsp;&nbsp;COP : {heater_details.get('cop_a_15', 'N/A')}",
            f"&nbsp;&nbsp;&nbsp;PROFIL SOUTIRAGE: {profile_soutirage}",
            "&nbsp;&nbsp;&nbsp;<u>Mention :</u> Mise en place d'une opération BAR-TH-148 : MISE EN PLACE D'UN CHAUFFE EAU THERMODYNAMIQUE AIR EXTERIEUR ET ACCUMULATION (CET) Certifié selon norme EN 16147 à 15°C d'air"
        ]
        # Filtrer les éléments vides avant le join pour éviter les doubles sauts de ligne
        description_ballon_parts = [p for p in description_ballon_parts if p and p.strip()]
        description_ballon = Paragraph("<br/>".join(description_ballon_parts).rstrip(), styles['TableDescription'])
        ballon_ht = line_item_prices.get('ballon', 0.0)
        table_data.append([description_ballon, '1.00', f"{ballon_ht:,.2f} €", '5.50', '0,00 €', f"{ballon_ht:,.2f} €"])
        logger.info("PDF_GEN: Ligne 'Chauffe-eau' ajoutée.") # type: ignore
        # Ajouter immédiatement la main d'œuvre chauffe-eau thermodynamique
        main_oeuvre_ballon_ht = line_item_prices.get('main_oeuvre_ballon', 0.0)
        mo_ballon_description = Paragraph("""
            <b>Main d'œuvre chauffe-eau thermodynamique</b><br/>
            - Installation et raccordements (hydraulique, électrique) du chauffe-eau thermodynamique<br/>
            - Contrôles et mise en service<br/>
            - Installation par un professionnel agréé RGE QualiPAC
        """, styles['Normal'])
        table_data.append([mo_ballon_description, '1.00', f"{main_oeuvre_ballon_ht:,.2f} €", '5.50', '0,00 €', f"{main_oeuvre_ballon_ht:,.2f} €"])
        logger.info("PDF_GEN: Ligne 'Main d'oeuvre chauffe-eau thermodynamique' ajoutée (positionnée après le ballon).")

    # --- Ligne pour le Thermostat ---
    if thermostat_details:
        logger.info("PDF_GEN: Un thermostat est présent, ajout de sa ligne.") # type: ignore
        description_thermostat_parts = [
            f"<u>Thermostat : {thermostat_details.get('marque')} {thermostat_details.get('modele')}</u>"
        ]
        if thermostat_details.get('reference'):
            description_thermostat_parts.append(f"&nbsp;&nbsp;&nbsp; : {thermostat_details.get('reference')}")
        # Filtrer les éléments vides avant le join pour éviter les doubles sauts de ligne
        description_thermostat_parts = [p for p in description_thermostat_parts if p and p.strip()]
        description_thermostat = Paragraph("<br/>".join(description_thermostat_parts).rstrip(), styles['TableDescription'])
        thermostat_ht = line_item_prices.get('thermostat', 0.0)
        table_data.append([description_thermostat, '1.00', f"{thermostat_ht:,.2f} €", '5.50', '0,00 €', f"{thermostat_ht:,.2f} €"])
        logger.info("PDF_GEN: Ligne 'Thermostat' ajoutée.") # type: ignore

    # --- Ligne pour les Accessoires ---
    description_accessoires = Paragraph("<u>Fourniture petit matériel de pose et raccordements (pompe à chaleur)</u>", styles['TableDescription'])
    accessoires_ht = line_item_prices.get('accessoires', 0.0)
    table_data.append([description_accessoires, '1.00', f"{accessoires_ht:,.2f} €", '5.50', '0,00 €', f"{accessoires_ht:,.2f} €"])
    logger.info("PDF_GEN: Ligne 'Accessoires' ajoutée.") # type: ignore

    # --- Ligne(s): Main d'oeuvre ---
    # Pour les combos, les lignes ont été déjà ajoutées juste après chaque fourniture.
    if not heater_details:
        # Non-combo : une seule ligne
        logger.info("PDF_GEN(478): Préparation de la ligne 'Main d'oeuvre'.") # type: ignore
        mo_description = Paragraph("""
            <b>MAIN D'OEUVRE</b><br/>
            - Dépose de l'équipement existant<br/>
            - Installation et raccordements (frigorifique, hydraulique, électrique) des équipements<br/>
            - Contrôles, mise en service et explication du fonctionnement<br/>
            - Installation par un professionnel agréé RGE QualiPAC
        """, styles['Normal'])
        table_data.append([mo_description, '1.00', f"{main_oeuvre_ht_total:,.2f} €", '5.50', '0,00 €', f"{main_oeuvre_ht_total:,.2f} €"])
        logger.info("PDF_GEN(485): Ligne 'Main d'oeuvre' ajoutée aux données du tableau.") # type: ignore
    
    # Ajustement des largeurs de colonnes pour éviter le débordement des titres
    quote_table = Table(table_data, colWidths=[2.8*inch, 0.5*inch, 1.2*inch, 0.6*inch, 0.9*inch, 1*inch])
    logger.info("PDF_GEN(489): Création de l'objet Table des lignes de devis.") # type: ignore
    quote_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'), 
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('TOPPADDING', (0,1), (-1,-1), 4),  # Padding top réduit pour les lignes de données
        ('BOTTOMPADDING', (0,1), (-1,-1), 4),  # Padding bottom réduit pour les lignes de données
        ('LINEBELOW', (0,0), (-1,0), 2, PRIMARY_COLOR), # Ligne épaisse sous l'en-tête
        ('LINEBELOW', (0,1), (-1,-2), 1, colors.lightgrey), # Lignes fines entre les items
        ('ALIGN', (0,1), (0,-1), 'LEFT'),
        ('ALIGN', (1,1), (-1,-1), 'RIGHT'),
    ]))
    story.append(quote_table)
    story.append(Spacer(1, 0.2 * inch))
    logger.info("PDF_GEN(500): Tableau des lignes de devis ajouté à l'histoire.") # type: ignore

    # --- Section des Totaux ---
    # Utiliser les valeurs finales calculées par le service de pricing pour garantir la cohérence.
    logger.info("PDF_GEN(504): Préparation de la section des totaux.") # type: ignore
    total_ht_final = float(pricing_details.get('total_ht', 0.0))
    montant_tva_final = float(pricing_details.get('montant_tva', 0.0))
    total_ttc_final = float(pricing_details.get('final_selling_price_ttc', 0.0))
    prime_cee_final = float(pricing_details.get('prime_cee', 0.0))
    prime_renov_final = float(pricing_details.get('prime_renov', 0.0))
    reste_a_charge_final = float(pricing_details.get('reste_a_charge', 0.0))
    logger.info(f"PDF_GEN(512): Valeurs des totaux: HT={total_ht_final}, TVA={montant_tva_final}, TTC={total_ttc_final}, CEE={prime_cee_final}, MPR={prime_renov_final}, RAC={reste_a_charge_final}") # type: ignore

    totals_data = []
    totals_data.append(['Total HT', f"{total_ht_final:,.2f} €"])
    totals_data.append([f'TVA {tva_rate*100:.1f}%', f"{montant_tva_final:,.2f} €"])
    totals_data.append([Paragraph('<b>Total TTC</b>', styles['RightAlign']), Paragraph(f"<b>{total_ttc_final:,.2f} €</b>", styles['BoldRight'])])
    
    # Ajouter les lignes pour les aides
    totals_data.append(['Prime CEE (déduite)', f"- {prime_cee_final:,.2f} €"])
    totals_data.append(["MaPrimeRénov' (déduite)", f"- {prime_renov_final:,.2f} €"])
    
    # Le Reste à Charge est la dernière ligne, en gras et vert
    rac_label_p = Paragraph(f'<font color="{ACCENT_GREEN_TEXT.hexval()}"><b>RESTE À CHARGE</b></font>', styles['RightAlign'])
    rac_amount_p = Paragraph(f'<font color="{ACCENT_GREEN_TEXT.hexval()}"><b>{reste_a_charge_final:,.2f} €</b></font>', styles['BoldRight'])
    totals_data.append([rac_label_p, rac_amount_p])
    logger.info("PDF_GEN(525): Données du tableau des totaux préparées.") # type: ignore

    totals_table = Table(totals_data, colWidths=[5.9*inch, 1.2*inch])
    logger.info("PDF_GEN(528): Création de l'objet Table des totaux.") # type: ignore
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LINEABOVE', (0,0), (-1,0), 1, colors.lightgrey),
        ('LINEBELOW', (0,1), (-1,1), 1, colors.lightgrey),
        ('BACKGROUND', (0,2), (-1,2), LIGHT_BACKGROUND), # Fond pour Total TTC
        ('FONTNAME', (0,2), (-1,2), 'Helvetica-Bold'),
        ('BACKGROUND', (0,-1), (-1,-1), ACCENT_GREEN_BG), # Fond pour Reste à Charge
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.4 * inch))
    logger.info("PDF_GEN(539): Tableau des totaux ajouté à l'histoire.") # type: ignore

    # --- Mention EBS Energie (déplacée ici) ---
    logger.info("PDF_GEN(541): Ajout de la mention EBS Energie.") # type: ignore
    prime_cee_final = pricing_details.get('prime_cee', 0.0)
    logger.info(f"PDF_GEN(543): Valeur de prime_cee_final: {prime_cee_final}") # type: ignore
    ebs_energie_text = f"""
    <font size=7>
    <u>Paragraphe EBS Energie :</u> Les travaux ou prestations objet du présent document donneront lieu à une contribution financière de EBS ENERGIE (SIREN 533 333 118), versée par EBS ENERGIE dans le cadre de son rôle incitatif sous forme de prime, directement ou via son (ses) mandataire(s), sous réserve de l’engagement de fournir exclusivement à EBS Energie les documents nécessaires à la valorisation des opérations au titre du dispositif des Certificats d’Economies d’Energie et sous réserve de la validation de l’éligibilité du dossier par EBS ENERGIE puis par l’autorité administrative compétente. Le montant de cette contribution financière, hors champ d’application de la TVA, est susceptible de varier en fonction des travaux effectivement réalisés et du volume des CEE attribués à l’opération et est estimé à <b>{prime_cee_final:,.2f} €</b>.
    </font>
    """
    story.append(Paragraph(ebs_energie_text, styles['SmallText']))
    story.append(Spacer(1, 0.4 * inch))

    logger.info("PDF_GEN(568): Ajout des conditions de règlement et droit de rétractation.") # type: ignore
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
    logger.info("PDF_GEN(585): Ajout de la section signature.") # type: ignore
    story.append(PageBreak()) # Déplace le bloc de signature à la page suivante
    story.append(Spacer(1, 0.5 * inch))
 
    # Création de la zone de signature unique pour le client
    signature_client = Paragraph(
        "Signature du Client<br/>(précédée de la mention 'Bon pour accord')",
        styles['CenterAlign'] # Le titre en haut de la cellule
    )
 
    # Création du texte "Bon pour accord" en italique et centré
    bon_pour_accord_text = Paragraph(
        "<i>Bon pour accord</i>",
        styles['CenterAlign'] # Le texte au milieu
    )
 
    # Ajout de l'ancre de signature YouSign, en blanc pour la masquer
    yousign_anchor = Paragraph(
        '<font color="white">{{s1|signature|150|50}}</font>',
        styles['CenterAlign']
    )
 
    # Le contenu de la cellule est une liste d'éléments : le titre, un espace, et le texte.
    # Cela permet de centrer verticalement le texte "Bon pour accord".
    signature_cell_content = [signature_client, Spacer(1, 0.1 * inch), bon_pour_accord_text, Spacer(1, 0.1 * inch), yousign_anchor]

    signature_data = [
        [signature_cell_content]
    ]
    # Un seul bloc de signature, centré
    signature_table = Table(signature_data, colWidths=[doc.width], rowHeights=1.2*inch)
    logger.info("PDF_GEN(591): Création de l'objet Table des signatures.") # type: ignore
    signature_table.setStyle(TableStyle([('BOX', (0,0), (-1,-1), 1, colors.lightgrey), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(signature_table)
    story.append(Spacer(1, 0.2 * inch))
    logger.info("PDF_GEN(598): Ajout du pied de page.") # type: ignore
    footer_text = """
    <font size=7>
    GREENPOWER - SASU au capital de 1000€ - 16 RUE DE PARIS 89100 SAINT-DENIS-LES-SENS<br/>
    SIRET 900 000 043 00027 - R.C.S Sens - NAF 4322A - N°TVA FR09900000043<br/>
    Assurance décennale et RC Pro: MMA IARD, Contrat n°148.220.729
    </font>
    """
    story.append(Paragraph(footer_text, styles['Footer']))

    # --- Construction du PDF ---
    # Ajout des Conditions Générales de Vente
    logger.info("PDF_GEN(606): Ajout des pages de CGV.") # type: ignore
    add_cgv_pages(story, styles)

    try:
        logger.info("PDF_GEN(610): Lancement de la construction finale du PDF (doc.build).") # type: ignore
        doc.build(story)
        buffer.seek(0)
        logger.info("PDF_GEN(613): Construction du PDF terminée avec succès.") # type: ignore
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"PDF_GEN(616): Erreur lors de la construction du devis PDF (doc.build): {e}", exc_info=True) # type: ignore
        return None
    
def add_cgv_pages(story: list, styles: dict):
    """Ajoute les pages des Conditions Générales de Vente au document."""
    story.append(PageBreak())

    # Ajout de styles spécifiques pour les CGV
    styles.add(ParagraphStyle(name='CGVTitle', parent=styles['h1'], alignment=1, spaceAfter=20))
    styles.add(ParagraphStyle(name='CGVArticleTitle', parent=styles['h3'], spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name='CGVText', parent=styles['Normal'], alignment=4, firstLineIndent=12)) # Justifié
    styles.add(ParagraphStyle(name='CGVRetractationTitle', parent=styles['h2'], alignment=1, spaceBefore=24, spaceAfter=12))

    story.append(Paragraph("Conditions générales de vente et bon de rétractation", styles['CGVTitle']))

    cgv_text = """
    <b>Article 1. Objet</b><br/>
    Les présentes conditions générales de vente s'appliquent à toutes les ventes de produits et de prestations de services conçues par GREEN POWER et assurée par un fournisseur partenaire agréé. Elles forment et constatent le contrat en complément de toutes conditions particulières.<br/><br/>
    <b>Article 2. Contrat</b><br/>
    Les ventes doivent être constatées par écrit, notamment au moyen d'un devis accepté par le client ou d'un bon de commande accepté par GREEN POWER. Toute commande de produits implique l'adhésion sans réserve aux présentes conditions générales de vente, complétées ou aménagées par nos conditions particulières, qui annulent toute clause contraire pouvant figurer dans les conditions d'achat, bons de commande, ou autres documents commerciaux. Toute condition contraire posée par l'acheteur sera, à défaut d'acceptation expresse, inopposable au vendeur, quel que soit le moment où elle aura pu être portée à sa connaissance.<br/><br/>
    <b>Article 3. Prix - Tarifs - Devis - Facture</b><br/>
    Les offres, prix ou devis sont garantis pendant 30 jours à compter de leur date. Une facture est établie par GREEN POWER lors de chaque vente.<br/><br/>
    <b>Article 4. Paiement</b><br/>
    Le client s'oblige à verser, après l'expiration du délai prévu de sept jours à l'article 1221-10 du Code de la consommation, un acompte égal à 30 % du prix figurant sur le bon de commande. Le solde total sera payé à la signature du procès-verbal de réception de l'installation de l'équipement.<br/><br/>
    <b>Article 5. Escompte</b><br/>
    Un escompte de 3 % du prix facturé est octroyé pour paiement de la totalité du prix au moins 30 jours avant la date de livraison convenue.<br/><br/>
    <b>Article 6. Financement</b><br/>
    En cas de recours par l'acheteur à un crédit à la consommation, la vente est soumise aux chapitres 1 et 2 du titre I et aux chapitres 1 et 2 du titre IV compris dans le livre Ill du Code de la consommation ; notamment aux termes de l'article L.312-52, le contrat de vente est résolu de plein droit, sans indemnité de part ni d'autre. Si le préteur n'a pas, dans le délai de sept jours à compter de l'acceptation de l'offre préalable, informé le vendeur de l'attribution du crédit, ou si l'emprunteur a, dans les délais qui lui sont impartis, exercé son droit de rétractation.<br/><br/>
    <b>Article 7. Intérêts moratoires - Pénalités</b><br/>
    En cas de retard de paiement, sans formalité aucune ni mise en demeure préalable, automatiquement et de plein droit, sont exigibles immédiatement la totalité des sommes dues et un intérêt moratoire ou taux annuel de 15 % du montant non payé, avec anatocisme, et GREEN POWER aura le droit de suspendre l'exécution de ses obligations, sans préjudice de toute autre action. Le taux des pénalités exigible en cas de retard de paiement figure sur la facture.<br/><br/>
    <b>Article 8. Réserve de propriété - Transfert de propriété et des risques</b><br/>
    La société GREEN POWER conserve la propriété des biens vendus jusqu'au paiement effectif de l'intégralité du prix. Conformément à l'article L 216-4 du Code de la consommation, tout risque de perte et d'endommagement des produits est transféré au client au moment où ce dernier ou un tiers désigné par lui, et autre que le transporteur proposé par notre Société, prend physiquement possession de ces biens. Lorsque le client confie la livraison du bien à un transporteur autre que celui proposé par notre société, le risque de perte ou d'endommagement du bien est transféré au client à la remise du bien ou au transporteur.<br/><br/>
    <b>Article 9. Installations</b><br/>
    Le client est tenu de recevoir sur le site de l'installation toute personne du choix de GREEN POWER pour vérifier la faisabilité de la commande. Les produits doivent être installés par GREEN POWER ou par un professionnel agréé. L'installation doit être conforme aux prescriptions communiquées par GREEN POWER et aux normes et règles de sécurité en vigueur.<br/><br/>
    <b>Article 10. Délais de Livraison</b><br/>
    Le délai de livraison ou d'exécution figure sur le bon de commande. A défaut de livraison ou d'exécution à la date indiquée, le client peut renoncer au contrat après échec d'une mise en demeure fixant un délai supplémentaire raisonnable ou immédiatement si la société a été informée, lors de la conclusion du contrat, que le délai de livraison est une condition essentielle du contrat. Le client dégage notre société de tout engagement relatif aux délais de livraison et ne saurait prétendre au paiement d'une quelconque indemnité :<br/>
    - Lorsque les renseignements à fournir par le client ne seraient pas donnés en temps voulu ;<br/>
    - Lorsque l’accès à l’installation n’a pas été possible à la date prévue du fait du client ;<br/>
    - Lorsque les conditions de paiement n’auraient pas été respectées par le client ;<br/>
    - En cas de force majeure.<br/><br/>
    <b>Article 11. Garanties légales</b><br/>
    Au titre de la garantie légale, le client bénéficie sur les biens meubles corporels, sauf cas d'exonérations envisagées par la loi, de la garantie des vices cachés, prévue par les dispositions des articles 1641 et suivant du Code civil, et de la garantie de conformité, prévue aux articles L. 217-1 et suivants du Code de la consommation. Vous êtes informé que la société GREEN POWER, 16 rue de Paris, 89100 SAINT DENIS LES SENS, est la garante de la conformité des produits au contrat dans le cadre de ces deux garanties légales. II est rappelé que le consommateur dans le cadre de la garantie légale de conformité :<br/>
    - Bénéficie d'un délai de deux ans à compter de la délivrance du bien pour agir ;<br/>
    - Peut choisir entre la réparation ou le remplacement du bien, sous réserve des conditions de coût prévues par l'article L. 217-9 du Code de la consommation ;<br/>
    - Est dispensé de rapporter la preuve de l'existence du défaut de conformité du bien durant les six mois suivant la délivrance du bien. Ce délai est porté à vingt-quatre mois à compter du 18 mars 2016, sauf pour les biens d'occasion.<br/>
    La garantie légale de conformité s'applique indépendamment de la garantie commerciale pouvant couvrir votre bien.<br/>
    II est rappelé que le consommateur peut décider de mettre en œuvre la garantie contre les défauts cachés de la chose vendue au sens de l'article 1641 du code civil et que dans cette hypothèse, il peut choisir entre la résolution de la vente ou une réduction du prix de vente conformément à l'article 1644 du code civil.<br/>
    <u>Article L217-4 du Code de la Consommation</u><br/>
    Le vendeur est tenu de livrer un bien conforme au contrat et répond des défauts de conformité existants lors de la délivrance. Il répond également des défauts de conformité résultant de l'emballage, des instructions de montage ou de l'installation lorsque celle-ci a été mise à sa charge par le contrat ou a été réalisée sous sa responsabilité.<br/>
    <u>Article 1217-5 du Code de lo Consommation</u><br/>
    Pour être conforme au contrat, le bien doit :<br/>
    - Être propre à l'usage habituellement attendu d'un bien semblable et, le cas échéant :<br/>
    1) Correspondre à la description donnée par le vendeur et posséder les qualités que celui-ci a présentées à l'acheteur sous forme d'échantillon ou de modèle ;<br/>
    2) Présenter les qualités qu'un acheteur peut légitimement attendre eu égard aux déclarations publiques faites par le vendeur, par le producteur ou par son représentant, notamment dans la publicité ou l’étiquetage,<br/>
    - Ou présenter les caractéristiques définies d'un commun accord par les parties ou être propre à tout usage spécial recherché par l'acheteur, porté à la connaissance du vendeur et que ce dernier a accepté.<br/>
    <u>Article 1217-12 du Code de la Consommation</u><br/>
    L'action résultant du défaut de conformité est prescrit par 2 ans à compter de la délivrance du bien.<br/>
    <u>Article L217-16 du Code de la Consommation</u><br/>
    Lorsque l'acheteur demande au vendeur, pendant le cours de la garantie commerciale qui lui a été consentie lors de l'acquisition ou de la réparation d'un bien meuble, une remise en état couverte par la garantie, toute période d'immobilisation d'au moins sept jours vient s'ajouter à la durée de la garantie qui restait à courir. Cette période court à compter de la demande d'intervention de l'acheteur ou de la mise à disposition pour réparation du bien en cause, si cette mise à disposition est postérieure à la demande d'intervention.<br/>
    <u>Article 1641 du Code Civil</u><br/>
    Le vendeur est tenu de la garantie à raison des défauts cachés de la chose vendue qui la rendent impropre à l'usage auquel on la destine, ou qui diminuent tellement cet usage que l'acheteur ne l'aurait pas acquise, ou n'en aurait donné qu'un moindre prix, s'il les avait connus.<br/>
    <u>Article 1648 alinéa 1er du Code Civil</u><br/>
    L’action résultant des vices rédhibitoires doit être intentée par l’acheteur dans un délai de 2 ans à compter de la découverture du vice. La mise en œuvre de ces garanties est exclue dans les cas suivants :<br/>
    - Une mauvaise utilisation du bien de la part de l’acheteur ;<br/>
    - Le défaut de fonctionnement résultant d'une intervention réalisée par une personne physique ou morale autre que la société et effectuée sans autorisation de sa part ;<br/>
    - L'usure normale du bien ;<br/>
    - La négligence ou le défaut d'entretien de la part de l'acheteur ;<br/>
    - Le défaut de fonctionnement résultant d'un cas de force majeure, d'un acte de vandalisme ou de catastrophe naturelle.<br/><br/>
    <b>Article 12. Obligations du client, adaptations, autorisations</b><br/>
    Le client est seul responsable des biens mobiliers et immobiliers qui reçoivent l'installation, leur solidité, leur bon état d'entretien et de réparations, permettant sans difficulté la pose et le maintien des produits; de l'obtention de toutes autorisations nécessaires et devra apporter tous documents justifiant de leur obtention avant la livraison; dès la livraison, de tous dégâts pouvant survenir aux produits ou installations et de leur perte partielle ou totale; sur le site de l'installation, de toutes adaptations ou modifications, tous travaux de réfection, d'aménagement ou autres, nécessaires, avant, pendant ou après l'installation. Le client souscrira une police d'assurance contre la perte, le vol ou la destruction, des produits et installations, et devra en justifier dans le délai de 30 jours à compter de la commande acceptée. Dans le cas où les travaux nécessitent l'autorisation d'un tiers ou l'accomplissement de formalités administratives ou autres (telles qu'une autorisation par la copropriété, etc.), le client s'engage à en informer le fournisseur partenaire agréé par GREEN POWER, immédiatement.<br/><br/>
    <b>Article 13. Propriété intellectuelle</b><br/>
    GREEN POWER est et reste propriétaire des droits de propriété intellectuelle sur les études, dessins, modèles, prototypes, etc., réalisés pour satisfaire à la commande.<br/><br/>
    <b>Article 14. Réclamations</b><br/>
    Le présent contrat est soumis à la loi française. Toute réclamation doit être adressée à notre société par lettre recommandée avec accusé de réception. En cas de litiges, ceux-ci relèvent de la juridiction compétente conformément aux règles du nouveau code procédure civile. Cependant, si la demande du client auprès de la Société n'a pas abouti, celui-ci est averti que d'autres voies de recours s'offrent à lui et, en particulier, le recours à la médiation conventionnelle. Le client pourra ainsi adresser sa demande de règlement amiable de son différend gratuitement à l'Association française de Défense des Consommateurs Européens (AFDCE) 655 Chemin des Jacassières, 13510 Eguilles / secretariat@ofdce.org / 04 42 24 32 81. L'AFDCE est membre de l'ANM.<br/><br/>
    <b>Article 15. Rupture du contrat</b><br/>
    En cas d'annulation de la commande par le client après le délai de rétractation légal, pour quelque raison que ce soit hormis la force majeure, à titre de dommages et intérêts, en réparation du préjudice ainsi subi par GREEN POWER de plein droit. Les acomptes versés sont acquis à GREEN POWER et 35 % du Prix total TTC facturé est exigible au bénéfice de GREEN POWER. Faute de paiement ou de respect d'une quelconque de ses obligations par le client et 30 jours après une mise en demeure restée infructueuse, le présent contrat sera résilié de plein droit si bon semble à GREEN POWER. En considération de la réserve de propriété, les produits livrés devront alors être restitués à GREEN POWER Réciproquement, si la société devait annuler la commande, seul cas de force majeur, après le délai de rétractation légale ouvert au consommateur, de sa seule volonté, elle serait tenue à une indemnité équivalente ; en application de la clause de réserve de propriété, les biens livrés seraient restitués à la société GREEN POWER.<br/><br/>
    <b>Article 16. Droit applicable et langue du contrat</b><br/>
    Les présentes conditions générales de vente et tous actes ou faits qui en découlent sont régis par le droit français. Dans le cas où les présentes conditions générales de vente ou toutes correspondances entre GREEN POWER et le client seraient traduites en une ou plusieurs langues, seul le texte français ferait loi en cas de litige.<br/><br/>
    <b>Article 17. Attribution de juridiction</b><br/>
    En cas de litige, les Tribunaux de Strasbourg sont seuls compétents, même en cas d'appel en garantie et de pluralité de défendeurs. Cette clause est inapplicable à un particulier, consommateur ou non professionnel. Elle ne peut trouver application en matière d'ordonnance portant injonction de payer.<br/><br/>
    <b>Article 18. Droit de rétractation</b><br/>
    <u>Délai et modalité d'exercice du droit de rétractation</u><br/>
    Droit de rétractation pour les contrats à distance ou en dehors d'un établissement commercial vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un délai de quatorze jours. Le point de départ du délai de rétractation court à compter du jour<br/>
    - De la conclusion du contrat, pour les contrats de prestation de services,<br/>
    - De la réception du bien pour le consommateur ou un tiers, autre que le transporteur, désigné par lui, pour les contrats de vente de biens. Pour les contrats conclus hors établissement, le consommateur peut exercer son droit de rétractation à compter de la conclusion du contrat.<br/>
    Dans le cas d'une commande portant sur plusieurs biens livrés séparément ou dans le cas d'une commande d'un bien composé de lots ou de pièces multiples dont la livraison est échelonnée sur une période définie, le délai court à compter de la réception du dernier bien ou lot ou de la dernière pièce. Pour les contrats prévoyant la livraison régulière de biens pendant une période définie, le délai court à compter de la réception du premier bien. Pour exercer son droit de rétractation, le client doit adresser à l'entreprise avant l'expiration du délai de 14 jours, le formulaire de rétractation joint au présent bon de commande ou toute autre déclaration, dénuée d'ambiguïté, exprimant sa volonté de se rétracter. Il appartient au client de démontrer l'envoi de l'exercice du droit de rétractation dans le délai imparti.<br/>
    <u>Effet de la rétractation</u><br/>
    En cas de rétractation de votre part du présent contrat, nous vous rembourserons tous les paiements reçus de vous, y compris les frais de livraison au plus tard quatorze jours à compter du jour nous serons informés de votre décision de rétractation du présent contrat. Ce remboursement n'occasionnera aucun frais pour vous. Nous récupérerons le bien à nos propres frais. Votre responsabilité n'est engagée qu'à l'égard de la dépréciation du bien résultant de manipulations autres que celles nécessaires pour établir la nature, les caractéristiques et le bon fonctionnement de ce bien.<br/>
    <u>Exception au droit de rétractation</u><br/>
    Conformément à l'article L 221-28 du code de la Consommation, le client ne peut plus exercer son droit de rétractation pour une prestation de service commencée avec un accord avant la fin du délai de rétractation et qu'il y a renoncé expressément (L 221-281 ° du code de la consommation).<br/><br/>
    <b>Article 19. Protection des données personnelles</b><br/>
    Les informations personnelles collectées par l'entreprise via le devis ou le bon de commande (nom, prénom, date de naissance, adresse, téléphone, adresse électronique, coordonnées bancaires), sont enregistrées dans son fichier de clients et principalement utilisées pour la bonne gestion des relations avec le client, le traitement des commandes ou des réclamations éventuelles. Les données personnelles du client ne sont conservées que pour la durée strictement nécessaire au regard des finalités précédemment exposées. L'accès aux données personnelles est strictement limité aux employés et préposés de l'entreprise, habilités à les traiter en raison de leurs fonctions. Les informations recueillies pourront éventuellement être communiquées à des tiers liés à l'entreprise par contrat pour l'exécution de tâches sous-traitées nécessaires à la gestion de la commande, sans qu'une autorisation du client ne soit nécessaire. Il est précisé que, dans le cadre de l'exécution de leurs prestations, les tiers n'ont qu'un accès limité aux données et ont une obligation contractuelle de les utiliser en conformité avec les dispositions de la législation applicable en matière de protection des données personnelles. En dehors des cas énoncés ci-dessus, l'entreprise s'engage à ne pas vendre, louer, céder ou donner accès à des tiers aux données sans consentement préalable du client, à moins d'y être contraints en raison d'un motif légitime (obligation légale, lutte contre la fraude ou l'abus, exercice des droits de la défense, etc.).Conformément aux dispositions légales et réglementaires applicables, en particulier la loi n° 78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés et du règlement européen n°2016/679/UE du 27 avril 2016 (applicable dès le 25 mai 2018), le client bénéficie d'un droit d'accès, de rectification, de portabilité et d'effacement de ses données ou encore de limitation du traitement. Il peut également, pour des motifs légitimes, s'opposer au traitement des données la concernant. Le client peut, sous réserve de la production d'un justificatif d'identité valide, exercer ses droits en contactant GREEN POWER à l'adresse suivante : contact@greenpower89.fr. Vous disposez du droit de vous inscrire gratuitement sur la liste d'opposition Bloctel, gérée par la société Opposetel, afin de ne pas faire l'objet de sollicitations commerciales par téléphone. L'inscription sur cette liste n'interdit cependant pas à GREEN POWER de vous contacter à des fins de prospection pendant la durée de votre contrat, sauf si vous avez spécifiquement exercé votre droit d'opposition afin de ne plus recevoir d’offres commerciales. Pour toute information complémentaire ou réclamation, le client peut contacter la Commission Nationale de l'informatique et des Libertés (plus d'informations sur www.cnil.fr).
    """
    story.append(Paragraph(cgv_text, styles['CGVText']))

    story.append(PageBreak())
    story.append(Paragraph("BORDEREAU DE RÉTRACTATION", styles['CGVRetractationTitle']))
    
    retractation_text = """
    (Compléter et signer ce formulaire, l'envoyer par lettre recommandée avec accusé de réception. Utiliser l'adresse figurant sur la première page et l'expédier au plus tard le quatorzième jour à partir de la commande.)<br/><br/>
    <b>Votre numéro de commande :</b> .....................................................................................................................................................................<br/><br/>
    <b>A l'attention de la société GREEN POWER</b> - 16 RUE DE PARIS. 89100 SAINT DENIS LES SENS - SIRET N° 90000004300019<br/><br/>
    Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien (*) / pour la prestation de service (*) ci-dessous (indiquer le service concerné et le nom de l'offre ou de l'équipement) :<br/>
    ...................................................................................................................................................................................................................<br/><br/>
    <b>Commande le (*) / reçu le (*) :</b> ...... / ...... / ............<br/><br/>
    <b>Nom du consommateur :</b> .....................................................................................................................................................................<br/><br/>
    <b>Adresse du consommateur :</b> .............................................................................................................................................................<br/><br/><br/><br/>
    <b>Signature:</b><br/><br/><br/>
    (Uniquement en cas de notification du présent formulaire sur papier)<br/>
    (*) Rayez la mention inutile
    """
    story.append(Paragraph(retractation_text, styles['Normal']))