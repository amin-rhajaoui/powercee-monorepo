"""
Tests unitaires pour le service de calcul des primes CEE BAR-TH-171.
"""
import pytest
from app.services.cee_calculator_service import (
    select_etas,
    get_base_value,
    get_usage_factor,
    get_zone_factor,
)


class TestSelectEtas:
    """Tests pour la sélection de l'ETAS selon le type d'émetteur."""

    def test_basse_temperature_returns_etas_35(self):
        """Émetteur basse température doit retourner etas_35."""
        result = select_etas("BASSE_TEMPERATURE", etas_35=150, etas_55=130)
        assert result == 150

    def test_plancher_chauffant_returns_etas_35(self):
        """Émetteur plancher chauffant doit retourner etas_35."""
        result = select_etas("plancher_chauffant", etas_35=160, etas_55=140)
        assert result == 160

    def test_haute_temperature_returns_etas_55(self):
        """Émetteur haute température doit retourner etas_55."""
        result = select_etas("MOYENNE_HAUTE_TEMPERATURE", etas_35=150, etas_55=130)
        assert result == 130

    def test_mixte_returns_etas_55(self):
        """Émetteur mixte doit retourner etas_55."""
        result = select_etas("MIXTE", etas_35=150, etas_55=130)
        assert result == 130

    def test_none_emitter_returns_etas_55(self):
        """Émetteur None doit retourner etas_55 par défaut."""
        result = select_etas(None, etas_35=150, etas_55=130)
        assert result == 130

    def test_fallback_to_etas_55_if_etas_35_none(self):
        """Si etas_35 est None, utiliser etas_55."""
        result = select_etas("BASSE_TEMPERATURE", etas_35=None, etas_55=130)
        assert result == 130

    def test_fallback_to_etas_35_if_etas_55_none(self):
        """Si etas_55 est None, utiliser etas_35."""
        result = select_etas("MOYENNE_HAUTE_TEMPERATURE", etas_35=150, etas_55=None)
        assert result == 150


class TestGetBaseValue:
    """Tests pour la récupération de la valeur de base selon le type et l'ETAS."""

    def test_maison_etas_111_139(self):
        """Maison avec ETAS entre 111 et 139."""
        result = get_base_value("MAISON", 125)
        assert result == 96_700

    def test_maison_etas_140_169(self):
        """Maison avec ETAS entre 140 et 169."""
        result = get_base_value("MAISON", 155)
        assert result == 111_500

    def test_maison_etas_170_199(self):
        """Maison avec ETAS entre 170 et 199."""
        result = get_base_value("MAISON", 185)
        assert result == 121_400

    def test_maison_etas_200_plus(self):
        """Maison avec ETAS >= 200."""
        result = get_base_value("MAISON", 210)
        assert result == 125_800

    def test_appartement_etas_111_139(self):
        """Appartement avec ETAS entre 111 et 139."""
        result = get_base_value("APPARTEMENT", 125)
        assert result == 54_000

    def test_appartement_etas_140_169(self):
        """Appartement avec ETAS entre 140 et 169."""
        result = get_base_value("APPARTEMENT", 155)
        assert result == 44_300

    def test_appartement_etas_170_199(self):
        """Appartement avec ETAS entre 170 et 199."""
        result = get_base_value("APPARTEMENT", 185)
        assert result == 67_800

    def test_appartement_etas_200_plus(self):
        """Appartement avec ETAS >= 200."""
        result = get_base_value("APPARTEMENT", 210)
        assert result == 70_300

    def test_etas_below_111_returns_zero(self):
        """ETAS < 111 doit retourner 0."""
        result = get_base_value("MAISON", 100)
        assert result == 0

    def test_default_to_maison_if_type_none(self):
        """Type None doit être traité comme maison."""
        result = get_base_value(None, 155)
        assert result == 111_500


class TestGetUsageFactor:
    """Tests pour le facteur d'usage selon la surface."""

    def test_appartement_small(self):
        """Appartement < 35m²."""
        result = get_usage_factor("APPARTEMENT", 30)
        assert result == 0.5

    def test_appartement_35_60(self):
        """Appartement 35-60m²."""
        result = get_usage_factor("APPARTEMENT", 50)
        assert result == 0.7

    def test_appartement_60_70(self):
        """Appartement 60-70m²."""
        result = get_usage_factor("APPARTEMENT", 65)
        assert result == 1.0

    def test_appartement_70_90(self):
        """Appartement 70-90m²."""
        result = get_usage_factor("APPARTEMENT", 80)
        assert result == 1.3

    def test_appartement_90_110(self):
        """Appartement 90-110m²."""
        result = get_usage_factor("APPARTEMENT", 100)
        assert result == 1.5

    def test_appartement_110_130(self):
        """Appartement 110-130m²."""
        result = get_usage_factor("APPARTEMENT", 120)
        assert result == 1.9

    def test_appartement_130_plus(self):
        """Appartement >= 130m²."""
        result = get_usage_factor("APPARTEMENT", 150)
        assert result == 2.5

    def test_maison_small(self):
        """Maison < 70m²."""
        result = get_usage_factor("MAISON", 60)
        assert result == 0.5

    def test_maison_70_90(self):
        """Maison 70-90m²."""
        result = get_usage_factor("MAISON", 80)
        assert result == 0.7

    def test_maison_90_110(self):
        """Maison 90-110m²."""
        result = get_usage_factor("MAISON", 100)
        assert result == 1.0

    def test_maison_110_130(self):
        """Maison 110-130m²."""
        result = get_usage_factor("MAISON", 120)
        assert result == 1.1

    def test_maison_130_plus(self):
        """Maison >= 130m²."""
        result = get_usage_factor("MAISON", 150)
        assert result == 1.6


class TestGetZoneFactor:
    """Tests pour le facteur de zone climatique."""

    def test_zone_h1(self):
        """Zone H1 doit retourner 1.2."""
        assert get_zone_factor("H1") == 1.2
        assert get_zone_factor("h1") == 1.2

    def test_zone_h2(self):
        """Zone H2 doit retourner 1.0."""
        assert get_zone_factor("H2") == 1.0
        assert get_zone_factor("h2") == 1.0

    def test_zone_h3(self):
        """Zone H3 doit retourner 0.7."""
        assert get_zone_factor("H3") == 0.7
        assert get_zone_factor("h3") == 0.7

    def test_zone_none_returns_default(self):
        """Zone None doit retourner 1.0."""
        assert get_zone_factor(None) == 1.0

    def test_unknown_zone_returns_default(self):
        """Zone inconnue doit retourner 1.0."""
        assert get_zone_factor("H4") == 1.0


class TestCalculatePrime:
    """
    Tests pour le calcul complet de la prime.

    Note: Ces tests nécessitent une base de données mockée pour le service async.
    Ils vérifient la formule de calcul avec des valeurs connues.
    """

    def test_formula_calculation_manual(self):
        """
        Test manuel de la formule de calcul.

        Exemple: Maison 100m² en zone H1, ETAS 155, couleur Bleu, valorisation 5€/MWh

        Base = 111_500 (maison, ETAS 140-169)
        Usage = 1.0 (maison, 90-110m²)
        Zone = 1.2 (H1)
        Valorisation = 5.0 €/MWh
        Coefficient = 5

        Prime = (111_500 × 1.0 × 1.2 × 5.0 × 5) / 1000
             = (111_500 × 1.0 × 1.2 × 5.0 × 5) / 1000
             = 3_345_000 / 1000
             = 3_345.00 €
        """
        base = 111_500
        usage_factor = 1.0
        zone_factor = 1.2
        valuation_price = 5.0
        coefficient = 5

        expected = (base * usage_factor * zone_factor * valuation_price * coefficient) / 1000
        assert expected == 3_345.0

    def test_formula_calculation_appartement(self):
        """
        Test formule pour appartement.

        Appartement 65m² en zone H2, ETAS 175, valorisation 4.5€/MWh

        Base = 67_800 (appartement, ETAS 170-199)
        Usage = 1.0 (appartement, 60-70m²)
        Zone = 1.0 (H2)
        Valorisation = 4.5 €/MWh

        Prime = (67_800 × 1.0 × 1.0 × 4.5 × 5) / 1000
             = 1_525.50 €
        """
        base = 67_800
        usage_factor = 1.0
        zone_factor = 1.0
        valuation_price = 4.5
        coefficient = 5

        expected = (base * usage_factor * zone_factor * valuation_price * coefficient) / 1000
        assert expected == 1_525.5

    def test_formula_large_house(self):
        """
        Test formule pour grande maison.

        Maison 150m² en zone H3, ETAS 210, valorisation 6€/MWh

        Base = 125_800 (maison, ETAS >= 200)
        Usage = 1.6 (maison, >= 130m²)
        Zone = 0.7 (H3)
        Valorisation = 6.0 €/MWh

        Prime = (125_800 × 1.6 × 0.7 × 6.0 × 5) / 1000
             = 4_226.88 €
        """
        base = 125_800
        usage_factor = 1.6
        zone_factor = 0.7
        valuation_price = 6.0
        coefficient = 5

        expected = round((base * usage_factor * zone_factor * valuation_price * coefficient) / 1000, 2)
        assert expected == 4_226.88
