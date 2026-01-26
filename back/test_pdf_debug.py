#!/usr/bin/env python3
"""
Script de test isolé pour débugger la génération de PDF.
Exécuter depuis le dossier back/ avec: python test_pdf_debug.py
"""
import io
import os
import subprocess
import sys
from pathlib import Path

# Ajouter le chemin du projet
sys.path.insert(0, str(Path(__file__).parent))

from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

# Chemins
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_TVA_PATH = BASE_DIR / "pdf" / "attestationtvaorigine.pdf"
OUTPUT_DIR = Path("/tmp/powercee_pdf_debug_isolated")

# Créer le dossier de sortie
OUTPUT_DIR.mkdir(exist_ok=True)


def test_1_template_only():
    """Test 1: Copier simplement le template sans modification."""
    print("\n=== TEST 1: Template seul (copie) ===")

    with open(TEMPLATE_TVA_PATH, "rb") as f:
        template_bytes = f.read()

    output_path = OUTPUT_DIR / "test1_template_copy.pdf"
    with open(output_path, "wb") as f:
        f.write(template_bytes)

    print(f"Sauvegardé: {output_path}")
    return output_path


def test_2_pypdf2_read_write():
    """Test 2: Lire avec PyPDF2 et réécrire sans modification."""
    print("\n=== TEST 2: PyPDF2 read/write sans modification ===")

    reader = PdfReader(open(TEMPLATE_TVA_PATH, "rb"))
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)

    output_path = OUTPUT_DIR / "test2_pypdf2_readwrite.pdf"
    with open(output_path, "wb") as f:
        f.write(output_buffer.getvalue())

    print(f"Sauvegardé: {output_path}")
    return output_path


def test_3_overlay_empty():
    """Test 3: Fusionner avec un overlay vide (sans texte)."""
    print("\n=== TEST 3: Overlay vide (merge_page sans contenu) ===")

    # Créer un overlay vide
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    can.save()  # Sauvegarder sans rien dessiner
    packet.seek(0)

    # Fusionner
    overlay_pdf = PdfReader(packet)
    existing_pdf = PdfReader(open(TEMPLATE_TVA_PATH, "rb"))
    writer = PdfWriter()

    page = existing_pdf.pages[0]
    page.merge_page(overlay_pdf.pages[0])
    writer.add_page(page)

    for page_num in range(1, len(existing_pdf.pages)):
        writer.add_page(existing_pdf.pages[page_num])

    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)

    output_path = OUTPUT_DIR / "test3_overlay_empty.pdf"
    with open(output_path, "wb") as f:
        f.write(output_buffer.getvalue())

    print(f"Sauvegardé: {output_path}")
    return output_path


def test_4_overlay_with_text():
    """Test 4: Fusionner avec un overlay contenant du texte."""
    print("\n=== TEST 4: Overlay avec texte (comme le code actuel) ===")

    # Créer un overlay avec du texte
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    can.setFont("Helvetica", 10)
    can.drawString(100, 700, "TEST - Nom du client")
    can.drawString(100, 680, "123 Rue de Test, 75001 Paris")
    can.save()
    packet.seek(0)

    # Fusionner
    overlay_pdf = PdfReader(packet)
    existing_pdf = PdfReader(open(TEMPLATE_TVA_PATH, "rb"))
    writer = PdfWriter()

    page = existing_pdf.pages[0]
    page.merge_page(overlay_pdf.pages[0])
    writer.add_page(page)

    for page_num in range(1, len(existing_pdf.pages)):
        writer.add_page(existing_pdf.pages[page_num])

    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)

    output_path = OUTPUT_DIR / "test4_overlay_with_text.pdf"
    with open(output_path, "wb") as f:
        f.write(output_buffer.getvalue())

    print(f"Sauvegardé: {output_path}")
    return output_path


def test_5_pdfrw_merge():
    """Test 5: Utiliser pdfrw au lieu de PyPDF2 pour la fusion."""
    print("\n=== TEST 5: pdfrw pour la fusion ===")

    try:
        from pdfrw import PdfReader as PdfrwReader, PdfWriter as PdfrwWriter, PageMerge
    except ImportError:
        print("pdfrw non installé, skip ce test")
        return None

    # Créer un overlay avec du texte via ReportLab
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    can.setFont("Helvetica", 10)
    can.drawString(100, 700, "TEST - Nom du client")
    can.drawString(100, 680, "123 Rue de Test, 75001 Paris")
    can.save()
    packet.seek(0)

    # Utiliser pdfrw pour fusionner
    overlay_pdf = PdfrwReader(packet)
    template_pdf = PdfrwReader(str(TEMPLATE_TVA_PATH))

    # Fusionner la première page
    merger = PageMerge(template_pdf.pages[0])
    merger.add(overlay_pdf.pages[0]).render()

    # Écrire le résultat
    output_buffer = io.BytesIO()
    writer = PdfrwWriter(output_buffer)
    writer.write()

    # pdfrw écrit directement, donc on doit relire
    output_buffer.seek(0)

    output_path = OUTPUT_DIR / "test5_pdfrw_merge.pdf"

    # Utiliser une autre méthode pour pdfrw
    writer2 = PdfrwWriter(str(output_path))
    writer2.trailer = template_pdf
    writer2.write()

    print(f"Sauvegardé: {output_path}")
    return output_path


def test_6_pikepdf():
    """Test 6: Utiliser pikepdf (bibliothèque plus moderne)."""
    print("\n=== TEST 6: pikepdf pour la fusion ===")

    try:
        import pikepdf
    except ImportError:
        print("pikepdf non installé. Installer avec: pip install pikepdf")
        return None

    # Créer un overlay avec du texte via ReportLab
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    can.setFont("Helvetica", 10)
    can.drawString(100, 700, "TEST - Nom du client")
    can.drawString(100, 680, "123 Rue de Test, 75001 Paris")
    can.save()
    packet.seek(0)

    # Ouvrir les deux PDFs avec pikepdf
    template = pikepdf.open(TEMPLATE_TVA_PATH)
    overlay = pikepdf.open(packet)

    # Créer un nouveau PDF
    output_path = OUTPUT_DIR / "test6_pikepdf_merge.pdf"

    # pikepdf n'a pas de merge_page natif, on fait autrement
    # On va juste overlay le contenu

    # Pour pikepdf, on utilise une approche différente
    page = template.pages[0]
    overlay_page = overlay.pages[0]

    # Ajouter le contenu de l'overlay à la page
    page_contents = page.Contents
    if isinstance(page_contents, list):
        page.Contents = pikepdf.Array([*page_contents, overlay_page.Contents])
    else:
        page.Contents = pikepdf.Array([page_contents, overlay_page.Contents])

    # Fusionner les ressources
    if "/Resources" in overlay_page:
        for key, value in overlay_page.Resources.items():
            if key not in page.Resources:
                page.Resources[key] = value

    template.save(output_path)

    print(f"Sauvegardé: {output_path}")
    return output_path


if __name__ == "__main__":
    print(f"Template: {TEMPLATE_TVA_PATH}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"PyPDF2 version: {__import__('PyPDF2').__version__}")

    tests = [
        test_1_template_only,
        test_2_pypdf2_read_write,
        test_3_overlay_empty,
        test_4_overlay_with_text,
        test_5_pdfrw_merge,
        test_6_pikepdf,
    ]

    results = []
    for test in tests:
        try:
            path = test()
            if path:
                results.append(path)
        except Exception as e:
            print(f"ERREUR: {e}")

    print("\n" + "=" * 50)
    print("RÉSUMÉ DES TESTS")
    print("=" * 50)

    for path in results:
        if path and path.exists():
            print(f"✓ {path.name}")

    print(f"\nOuvrir le dossier: open {OUTPUT_DIR}")

    # Ouvrir automatiquement le dossier
    subprocess.run(["open", str(OUTPUT_DIR)])
