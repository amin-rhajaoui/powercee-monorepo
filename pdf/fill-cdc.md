def fill_cdc_cee_pdf(prospect_details: dict, pump_details: dict, devis_id: int) -> bytes | None:
    """
    Remplit le Cadre de Contribution CEE avec les informations du prospect et de la pompe.
    """
    try:
        template_path = "cdc-cee.pdf" # Assurez-vous que ce fichier est un PDF avec des champs de formulaire
        
        # --- 1. Créer la surcouche avec les "X" ---
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=A4) # Utiliser A4 pour le CEE pour la cohérence
        can.setFont("Helvetica", 9)

        # --- GRILLE DE DÉBOGAGE (désactivée) ---
        # _draw_debug_grid(can, letter[0], letter[1])

        # --- Écrire les informations manuellement sur le canevas ---

        # Coche la case et écrit le montant de la prime
        can.drawString(56, 640, "X") # Coche la case "une prime d'un montant de"
        can.drawString(250, 640, f"{pump_details.get('prime_cee', 0.0):.2f} €")

        # Informations du bénéficiaire
        can.drawString(135, 440, f"{prospect_details.get('nom', '')}")
        can.drawString(135, 426, f"{prospect_details.get('prenom', '')}")
        can.drawString(135, 412, f"{prospect_details.get('numero', '')} {prospect_details.get('adresse', '')}, {prospect_details.get('code_postal', '')} {prospect_details.get('ville', '')}")
        can.drawString(135, 398, f"{prospect_details.get('telephone', '')}")
        can.drawString(135, 384, f"{prospect_details.get('email', '')}")

        # Dates
        date_jour = datetime.now().strftime('%d/%m/%Y')
        can.drawString(480, 200, date_jour) # Date d'édition du devis

        # Signature
        # Le nom du signataire n'est plus ajouté ici, car il est déjà présent dans le tampon/signature.

        # --- Ajout de l'ancre de signature YouSign (invisible) ---
        can.setFillColorRGB(1, 1, 1) # Blanc
        can.setFont("Helvetica", 6)
        can.drawString(450, 150, "{{s1|signature|150|50}}") # Position dans la zone de signature

        can.save()
        packet.seek(0)
        
        # --- 2. Fusionner la surcouche avec le PDF original ---
        overlay_pdf = PdfReader(packet)
        existing_pdf = PdfReader(open(template_path, "rb"))
        writer = PdfWriter()
        page = existing_pdf.pages[0]
        # Fusionne la surcouche (texte généré) par-dessus la page de base
        page.merge_page(overlay_pdf.pages[0])
        writer.add_page(page)

        # Ajoute les autres pages du PDF original
        for page_num in range(1, len(existing_pdf.pages)):
            writer.add_page(existing_pdf.pages[page_num])

        # --- 4. Sauvegarder le résultat ---
        output_buffer = io.BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        return output_buffer.getvalue()

    except Exception as e:
        print(f"Erreur lors du remplissage du Cadre de Contribution CEE : {e}")
        return None