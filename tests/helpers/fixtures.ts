import type { ParsedLead } from '../../src/types.js';

/**
 * Sample Mariages.net email bodies for parser tests.
 * Format matches the regex patterns from email-parser/src/utils/parser.js:
 *   - "L'utilisateur [name] s'est..."
 *   - "DATE EVENEMENT: ..."
 *   - "E-MAIL: ..."
 *   - "TELEPHONE : ..."
 *   - Message block between TELEPHONE and "Repondez"
 */

export const VALID_MARIAGES_EMAIL = `Bonjour,

L'utilisateur Sophie Dupont s'est connecte(e) a Mariages.net et souhaite obtenir des informations sur vos services.

Voici les details de sa demande :

DATE EVENEMENT: 15/06/2027
E-MAIL: sophie.dupont@gmail.com
TELEPHONE : 06 12 34 56 78

Bonjour, nous organisons notre mariage le 15 juin 2027 au Chateau de Versailles. Nous recherchons un photographe pour couvrir la journee complete. Pourriez-vous nous envoyer vos tarifs et disponibilites ?

Merci beaucoup !

Repondez a vos demandes depuis le menu de gestion`;

export const VALID_MARIAGES_EMAIL_NO_PHONE = `Bonjour,

L'utilisateur Marie Leroy s'est connecte(e) a Mariages.net et souhaite obtenir des informations sur vos services.

Voici les details de sa demande :

DATE EVENEMENT: 20/09/2027
E-MAIL: marie.leroy@outlook.fr
TELEPHONE :

Nous cherchons un photographe pour notre mariage en septembre. Pouvez-vous nous contacter ?

Repondez a vos demandes depuis le menu de gestion`;

export const VALID_MARIAGES_EMAIL_DUPLICATE = `Bonjour,

L'utilisateur Sophie Dupont s'est connecte(e) a Mariages.net et souhaite obtenir des informations sur vos services.

Voici les details de sa demande :

DATE EVENEMENT: 15/06/2027
E-MAIL: sophie.dupont@gmail.com
TELEPHONE : 06 12 34 56 78

Bonjour, je vous recontacte car je n'ai pas recu de reponse. Nous sommes toujours interesses par vos services pour notre mariage.

Repondez a vos demandes depuis le menu de gestion`;

export const INVALID_EMAIL_BODY = `Hello,

Thank you for your order #12345. Your package has been shipped.

Tracking number: ABC123XYZ

Best regards,
Amazon Customer Service`;

export const EXPECTED_PARSED_LEAD: ParsedLead = {
  name: 'Sophie Dupont',
  email: 'sophie.dupont@gmail.com',
  phone: '06 12 34 56 78',
  eventDate: '15/06/2027',
  message:
    'Bonjour, nous organisons notre mariage le 15 juin 2027 au Chateau de Versailles. Nous recherchons un photographe pour couvrir la journee complete. Pourriez-vous nous envoyer vos tarifs et disponibilites ?\n\nMerci beaucoup !\n\nNom de la personne : Sophie Dupont',
  rawBody: VALID_MARIAGES_EMAIL,
};
