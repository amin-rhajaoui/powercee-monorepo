"""
Exceptions métier personnalisées.
"""


class ValuationMissingError(Exception):
    """
    Levée quand la valorisation CEE n'est pas configurée pour le tenant.

    Permet au router de capturer cette erreur et retourner un code d'erreur
    spécifique au frontend au lieu d'une erreur 500.
    """

    def __init__(self, operation_code: str):
        self.operation_code = operation_code
        super().__init__(f"Valorisation non configurée pour l'opération {operation_code}")
