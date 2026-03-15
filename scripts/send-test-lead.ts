/**
 * Send a fake Mariages.net lead email to contact@weds.fr via Resend.
 *
 * Usage:
 *   npx tsx scripts/send-test-lead.ts
 *   npx tsx scripts/send-test-lead.ts --name "Marie Dupont" --phone 0612345678 --email marie@test.com
 */

const RESEND_API_KEY = 're_PiRdTjac_NqDWrHEQJTHV3RiRdTeRhVVD';
const TO = 'contact@weds.fr';

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const leadName = getArg('name', 'Ines Fakret');
const leadEmail = getArg('email', 'test-lead@example.com');
const leadPhone = getArg('phone', '0624504497');
const eventDate = getArg('date', '19/09/2026');
const venue = getArg('venue', 'Domaine de Garriguette');
const firstName = leadName.split(' ')[0];
const initial = firstName.charAt(0).toUpperCase();

const now = new Date();
const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

const textBody = `
Cet utilisateur s'est intéressé à vos services

Demande d'information

 ${initial}

L'utilisateur ${leadName.toUpperCase()} s'est mis en relation avec votre entreprise
(WEDS.FR) via Mariages.net pour vous demander des informations sur vos
services.

${dateStr}

Bonjour, nous nous marions le ${eventDate}, nous avons choisi ${venue} et nous aimerions obtenir le détail de vos services et tarifs. Dans l'attente de votre retour, merci.

À LA RECHERCHE DE: Photo mariage à Var

AUTRES SERVICES: Vidéo, Drone

DATE ÉVÉNEMENT: ${eventDate}

E-MAIL: ${leadEmail}

TÉLÉPHONE : ${leadPhone}

Répondez à vos demandes depuis le menu de gestion

Ou répondez directement à cet email
`;

const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Open Sans',Helvetica,Arial,sans-serif;color:#616161;font-size:14px;line-height:21px">
<table width="100%" border="0" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 0 10px"><span style="font-size:11px;color:#9c9c9c;">Cet utilisateur s'est intéressé à vos services</span></td></tr>
</table>
<table style="width:580px" bgcolor="#FFFFFF" cellpadding="0" cellspacing="0">
<tr><td align="center">
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:30px 20px 10px"><span style="font-weight:600;font-size:20px;">Demande d'information</span></td></tr>
  </table>
  <table cellpadding="0" cellspacing="0" width="100%" align="center">
    <tr><td style="padding:10px" align="center">
      <div align="center"><span style="background:#C7C9C0;border-radius:50%;color:rgba(0,0,0,0.3);display:inline-block;font-size:25px;line-height:75px;text-align:center;width:75px;">${initial}</span></div>
    </td></tr>
  </table>
  <table cellspacing="0" cellpadding="0" width="100%">
    <tr><td align="center" style="padding:10px 30px 30px;border-bottom:solid 1px #e8e8e8;">
      L'utilisateur <b>${leadName}</b> s'est mis en relation avec votre entreprise (<b>weds.fr</b>) via Mariages<span>.</span>net pour vous demander des informations sur vos services.
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:10px 30px" align="center"><span>${dateStr}</span></td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding-bottom:10px;border-bottom:1px solid #e8e8e8;">
    <tr><td align="left">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr><td colspan="2" style="padding:20px;border-radius:8px;background-color:#C4D8F8;color:#222;">
          Bonjour, nous nous marions le ${eventDate}, nous avons choisi ${venue} et nous aimerions obtenir le détail de vos services et tarifs. Dans l'attente de votre retour, merci.
        </td></tr>
        <tr><td valign="top" align="left" style="padding-top:15px">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:5px 0;"><b>À la recherche de:</b> Photo mariage à Var</td></tr>
            <tr><td style="padding:5px 0;"><b>Autres services:</b> Vidéo, Drone</td></tr>
          </table>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:5px 0;"><b>Date Évènement:</b> ${eventDate}</td></tr>
            <tr><td style="padding:5px 0;"><b>E-mail:</b> ${leadEmail}</td></tr>
            <tr><td style="padding:5px 0;"><b>Téléphone :</b> ${leadPhone}</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:20px">Répondez à vos demandes depuis le menu de gestion</td></tr>
    <tr><td align="center" style="padding-bottom:15px">Ou répondez directement à cet email</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

async function sendTestEmail() {
  console.log(`Envoi email de test Mariages.net à ${TO}...`);
  console.log(`  Nom: ${leadName}`);
  console.log(`  Email: ${leadEmail}`);
  console.log(`  Téléphone: ${leadPhone}`);
  console.log(`  Date: ${eventDate}`);
  console.log(`  Lieu: ${venue}`);
  console.log();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Mariages.net <onboarding@resend.dev>',
      reply_to: `${leadName} via Mariages.net <${leadEmail}>`,
      to: [TO],
      subject: "Demande d'information {Mariages.net}",
      html: htmlBody,
      text: textBody,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`✓ Email envoyé ! ID: ${(data as { id: string }).id}`);
    console.log(`  Vérifiez la boîte de ${TO}`);
  } else {
    console.error(`✗ Erreur:`, data);
    process.exit(1);
  }
}

sendTestEmail();
