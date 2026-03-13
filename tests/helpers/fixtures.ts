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

// --- Gmail thread fixtures ---

export const GMAIL_THREAD_LIST_RESPONSE = {
  threads: [
    { id: 'thread-1', snippet: 'Bonjour, nous souhaitons...', historyId: '12345' },
    { id: 'thread-2', snippet: 'Merci pour votre reponse...', historyId: '12346' },
  ],
  nextPageToken: 'next-page-token-123',
};

export const GMAIL_THREAD_DETAIL = {
  id: 'thread-1',
  messages: [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      snippet: 'Bonjour, nous souhaitons obtenir un devis',
      payload: {
        headers: [
          { name: 'From', value: 'sophie.dupont@gmail.com' },
          { name: 'To', value: 'contact@weds.fr' },
          { name: 'Subject', value: 'Demande de devis mariage' },
          { name: 'Date', value: 'Mon, 10 Mar 2026 10:30:00 +0100' },
          { name: 'Message-ID', value: '<msg-id-001@gmail.com>' },
        ],
        mimeType: 'text/plain',
        body: {
          data: Buffer.from('Bonjour, nous souhaitons obtenir un devis pour notre mariage.').toString('base64url'),
        },
      },
    },
    {
      id: 'msg-2',
      threadId: 'thread-1',
      snippet: 'Merci pour votre demande',
      payload: {
        headers: [
          { name: 'From', value: 'contact@weds.fr' },
          { name: 'To', value: 'sophie.dupont@gmail.com' },
          { name: 'Subject', value: 'Re: Demande de devis mariage' },
          { name: 'Date', value: 'Mon, 10 Mar 2026 14:00:00 +0100' },
          { name: 'Message-ID', value: '<msg-id-002@weds.fr>' },
          { name: 'In-Reply-To', value: '<msg-id-001@gmail.com>' },
          { name: 'References', value: '<msg-id-001@gmail.com>' },
        ],
        mimeType: 'text/plain',
        body: {
          data: Buffer.from('Merci pour votre demande, voici nos tarifs.').toString('base64url'),
        },
      },
    },
  ],
};

// --- OpenRouter fixtures ---

export const OPENROUTER_CHAT_RESPONSE = {
  id: 'gen-abc123',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Bonjour Sophie,\n\nMerci pour votre demande concernant notre prestation photographique pour votre mariage le 15 juin 2027.\n\nCordialement,\nWeds.fr',
      },
      finish_reason: 'stop',
    },
  ],
  model: 'anthropic/claude-sonnet-4',
  usage: { prompt_tokens: 150, completion_tokens: 50 },
};

export const LEAD_CONTEXT_FIXTURE = {
  name: 'Sophie Dupont',
  eventDate: '15/06/2027',
  budget: 2500,
  status: 'contacte',
  recentEmails: [
    { direction: 'inbound', snippet: 'Bonjour, nous souhaitons obtenir un devis', date: '2026-03-10T10:30:00Z' },
    { direction: 'outbound', snippet: 'Merci pour votre demande, voici nos tarifs', date: '2026-03-10T14:00:00Z' },
  ],
  notes: ['Budget confirme a 2500 EUR', 'Lieu: Chateau de Versailles'],
};

// --- WhatsApp webhook fixtures ---

export const WHATSAPP_TEXT_MESSAGE_WEBHOOK = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '33612345678', phone_number_id: 'phone-id-123' },
            contacts: [{ profile: { name: 'Sophie Dupont' }, wa_id: '33612345678' }],
            messages: [
              {
                from: '33612345678',
                id: 'wamid.abc123',
                timestamp: '1710000000',
                text: { body: 'Bonjour, je souhaite confirmer notre rendez-vous.' },
                type: 'text',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

export const WHATSAPP_MEDIA_MESSAGE_WEBHOOK = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '33612345678', phone_number_id: 'phone-id-123' },
            contacts: [{ profile: { name: 'Sophie Dupont' }, wa_id: '33612345678' }],
            messages: [
              {
                from: '33612345678',
                id: 'wamid.media456',
                timestamp: '1710000100',
                image: { mime_type: 'image/jpeg', sha256: 'abc', id: 'media-id-123' },
                type: 'image',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

export const WHATSAPP_STATUS_UPDATE_WEBHOOK = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '33612345678', phone_number_id: 'phone-id-123' },
            statuses: [
              {
                id: 'wamid.abc123',
                status: 'delivered',
                timestamp: '1710000200',
                recipient_id: '33612345678',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};
