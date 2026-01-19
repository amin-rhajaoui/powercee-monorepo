"""
Helpers pour generation de descriptions et calculs de prix.
"""
from app.models.product import Product, ProductCategory
from .base import PricingContext


def format_currency(value: float) -> str:
    """Formate un montant en euros."""
    return f"{value:,.2f} €".replace(",", " ").replace(".", ",")


def generate_pac_description(product: Product, context: PricingContext) -> str:
    """
    Genere la description detaillee pour une PAC (BAR-TH-171).
    Reprend la logique de pacassistbot/pdf_generator.py.
    """
    if not product.heat_pump_details:
        return product.description or product.name

    details = product.heat_pump_details
    
    # 1. Marque et reference
    brand = product.brand or "N/A"
    model = product.name
    reference = product.reference or "N/A"
    
    # 2. Usage
    usage = "Chauffage + ECS" if details.is_duo else "Chauffage seul"
    
    # 3. Alimentation
    alimentation = str(details.power_supply.value) if details.power_supply else "N/A"
    
    # 4. Surface
    surface_text = f"{context.surface:.2f} m²"
    
    # 5. Puissance
    puissance = f"{details.power_minus_7} kW" if details.power_minus_7 else "N/A"
    
    # 6. ETAS
    # On choisit l'ETAS a afficher selon le type d'emetteur (ou par defaut 55°C pour moyenne/haute temperature)
    is_bt = context.emitter_type == "BASSE_TEMPERATURE"
    if is_bt:
        etas_val = details.etas_35
        etas_label = "Efficacité énergétique saisonnière à 35°C"
        regime_text = "Basse température"
    else:
        etas_val = details.etas_55
        etas_label = "Efficacité énergétique saisonnière à 55°C"
        regime_text = "Moyenne/Haute température"
        
    etas_str = f"{etas_val}%" if etas_val else "N/A"
    
    # 7. Ancien chauffage
    ancien_chauffage = (context.old_heating_system or "N/A").replace("_", " ").capitalize()
    marque_ancien = context.old_boiler_brand or "N/A"
    
    # 8. Neutra cuve
    # Si l'ancien chauffage est fioul, on mentionne la neutralisation
    is_fioul = "FIOUL" in (context.old_heating_system or "").upper()
    neutra_text = "Oui" if is_fioul else "Non applicable"
    
    lines = [
        "Mise en place d'une opération BAR-TH-171 : Pompe à chaleur AIR/EAU",
        f"   Marque et référence de la PAC : {brand} {model} Référence : {reference}",
        f"   Méthode d'utilisation : {usage}",
        f"   Alimentation : {alimentation}",
        f"   Surface chauffée : {surface_text}",
        f"   Puissance dimensionnée : {puissance}",
        f"   {etas_label} : {etas_str}",
        f"   Régime d'eau : {regime_text}",
        "   Installation d'un régulateur de classe IV minimum : Oui",
        "   Dépose de l'équipement existant : Oui",
        f"   Chauffage principal avant travaux : {ancien_chauffage}",
        f"   Marque du mode de chauffage vétuste : {marque_ancien}",
        f"   Neutralisation de la cuve à fioul : {neutra_text}",
        "   Mention : Mise en place d'une opération BAR-TH-171 : Pompe à chaleur de type Air/Eau."
    ]
    
    return "\n".join(lines)


def generate_labor_description(product: Product, context: PricingContext) -> str:
    """Genere la description pour la main d'oeuvre PAC."""
    return """
Main d'œuvre Pompe à chaleur Air/Eau
- Dépose de l'équipement existant
- Installation et raccordements (frigorifique, hydraulique, électrique) de la pompe à chaleur
- Contrôles, mise en service et explication du fonctionnement
- Installation par un professionnel agréé RGE QualiPAC
""".strip()


def generate_product_description(product: Product, context: PricingContext) -> str:
    """Dispatch vers la bonne fonction de generation selon le type de produit."""
    if product.category == ProductCategory.HEAT_PUMP:
        return generate_pac_description(product, context)
    elif product.category == ProductCategory.LABOR:
        # Si c'est une main d'oeuvre 'standard', on peut mettre une description par defaut
        # Mais souvent la MO est liee a la PAC. A voir.
        # Pour l'instant on retourne la description statique ou un default.
        return product.description or generate_labor_description(product, context)
    else:
        return product.description or product.name
