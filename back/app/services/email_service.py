import logging
import resend
from fastapi import HTTPException, status

from app.core.config import settings

# Initialiser Resend avec la clé API
resend.api_key = settings.RESEND_API_KEY

logger = logging.getLogger(__name__)


def send_invitation_email(
    email_to: str, 
    token: str, 
    inviter_name: str,
    role: str,
    agency_name: str | None = None
) -> dict:
    """
    Envoie un email d'invitation à un utilisateur.
    
    Args:
        email_to: Adresse email du destinataire
        token: Token d'invitation à inclure dans le lien
        inviter_name: Nom de la personne qui envoie l'invitation
        role: Rôle attribué à l'utilisateur
        agency_name: Nom de l'agence (optionnel)
        
    Returns:
        Réponse de Resend contenant les détails de l'envoi
        
    Raises:
        HTTPException: Si l'envoi de l'email échoue
    """
    try:
        # Construire le lien d'invitation
        link = f"{settings.FRONTEND_URL}/invite/{token}"
        
        # Traduire le rôle en français
        role_translations = {
            "DIRECTION": "Direction",
            "ADMIN_AGENCE": "Administrateur d'agence",
            "COMMERCIAL": "Commercial",
            "POSEUR": "Poseur",
            "AUDITEUR": "Auditeur",
            "COMPTABLE": "Comptable"
        }
        role_display = role_translations.get(role, role)
        
        # Construire le message d'agence
        agency_info = ""
        if agency_name:
            agency_info = f"<p><strong>Agence :</strong> {agency_name}</p>"
        
        # Corps HTML de l'email
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #701a2a;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .info-box {{
                    background-color: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Invitation à rejoindre PowerCEE</h1>
                <p>Bonjour,</p>
                <p><strong>{inviter_name}</strong> vous invite à rejoindre PowerCEE.</p>
                
                <div class="info-box">
                    <p><strong>Rôle :</strong> {role_display}</p>
                    {agency_info}
                </div>
                
                <p>Cliquez sur le bouton ci-dessous pour accepter votre invitation et créer votre compte :</p>
                <a href="{link}" class="button">Accepter l'invitation</a>
                <p>Ou copiez ce lien dans votre navigateur :</p>
                <p><a href="{link}">{link}</a></p>
                <p>Cette invitation expire dans 48 heures.</p>
            </div>
        </body>
        </html>
        """
        
        # Envoyer l'email via Resend
        response = resend.Emails.send({
            "from": settings.EMAILS_FROM_EMAIL,
            "to": email_to,
            "subject": "Invitation à rejoindre PowerCEE",
            "html": html_body,
        })
        
        logger.info(f"Email d'invitation envoyé avec succès à {email_to}")
        return response
        
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'email à {email_to}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi de l'email d'invitation: {str(e)}"
        )

