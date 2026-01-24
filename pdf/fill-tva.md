def fill_tva_attestation(prospect_details: dict) -> bytes | None:
    """
    Remplit l'attestation de TVA en superposant les informations sur le PDF existant.
    """
    try:
        template_path = "attestationtvaorigine.pdf"
        
        # --- 1. Créer la surcouche avec les "X" et le texte ---
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=A4) # Utiliser A4 pour l'attestation TVA pour la cohérence
        
        # --- GRILLE DE DÉBOGAGE (activée) ---
        #_draw_debug_grid(can, A4[0], A4[1])
        
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
        can.setFont("Helvetica", 8) # Police standard pour le texte
        
        # Coordonnées à remplacer (x, y)
        can.drawString(79, 683, prospect_details.get('nom', '')) # Nom client
        can.drawString(311, 683, prospect_details.get('prenom', '')) # Prénom client
        can.drawString(90, 674, f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}") # Adresse client
        can.drawString(325, 674, prospect_details.get('code_postal', ''))
        can.drawString(401, 674,prospect_details.get('ville', ''))
        
        can.drawString(95, 537, f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}") 
        can.drawString(294, 537,prospect_details.get('ville', '')) 
        can.drawString(452, 537, prospect_details.get('code_postal', ''))
        can.drawString(263, 165, prospect_details.get('ville', '')) # Fait à
        can.drawString(375, 165, datetime.now().strftime('%d/%m/%Y')) # Le

        # --- Ajout de l'ancre de signature YouSign (invisible) ---
        can.setFillColorRGB(1, 1, 1) # Blanc
        can.setFont("Helvetica", 6)
        can.drawString(220, 70, "{{s1|signature|150|50}}") # Position milieu en bas
        
        can.save()
        packet.seek(0)
        
        # --- 2. Fusionner la surcouche avec le PDF original ---
        overlay_pdf = PdfReader(packet)
        existing_pdf = PdfReader(open(template_path, "rb"))
        writer = PdfWriter()
        
        # Prend la première page du PDF original
        page = existing_pdf.pages[0]
        # Fusionne la surcouche (qui ne contient que les "X") par-dessus
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