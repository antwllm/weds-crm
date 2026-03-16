/**
 * Seed the default initial contact email template with brochure attachment.
 * Run: npx tsx scripts/seed-default-template.ts
 *
 * NOTE: Migrate brochure to GCS with:
 *   gsutil cp assets/Brochure_Weds.pdf gs://weds-crm-assets/attachments/Brochure_Weds.pdf
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { emailTemplates } from '../src/db/schema.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const DEFAULT_SUBJECT = 'weds.fr - Votre photographe pour votre mariage';

const DEFAULT_BODY = `<!--DOCTYPE html-->
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            padding: 40px;
            border: 1px solid #eaeaea;
            border-radius: 8px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            max-width: 150px;
            height: auto;
        }
        .content {
            font-size: 16px;
            color: #444444;
        }
        .content p {
            margin-bottom: 20px;
        }
        .content ul {
            margin-bottom: 20px;
            padding-left: 20px;
        }
        .content li {
            margin-bottom: 10px;
        }
        .signature {
            margin-top: 40px;
            border-top: 1px solid #eaeaea;
            padding-top: 20px;
            font-size: 14px;
            color: #666666;
        }
        .signature strong {
            color: #333333;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #999999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <p>Bonjour {{nom}},</p>
            <p>Je vous remercie sinc\u00e8rement d'avoir pens\u00e9 \u00e0 moi pour immortaliser votre mariage.</p>
            <p>Je suis William, photographe de mariage chez weds.fr, et c'est un plaisir de d\u00e9couvrir vos futurs pr\u00e9paratifs.</p>
            <p>Pour pouvoir vous accompagner au mieux et comprendre l'ambiance que vous souhaitez cr\u00e9er lors de cette journ\u00e9e, j'aurais besoin d'en apprendre un peu plus sur vous :</p>
            <ul>
                <li>Quel type de c\u00e9r\u00e9monie pr\u00e9voyez-vous ?</li>
                <li>Combien d'invit\u00e9s attendez-vous environ ?</li>
                <li>Quels sont les moments qui vous tiennent le plus \u00e0 c\u0153ur pour les photos ?</li>
                <li>Y a-t-il un style ou une atmosph\u00e8re particuli\u00e8re qui vous inspire ?</li>
                <li>Comment avez-vous imagin\u00e9 le d\u00e9roul\u00e9 de votre journ\u00e9e ?</li>
            </ul>
            <p>De mon c\u00f4t\u00e9, j'accorde une importance capitale \u00e0 la qualit\u00e9 et aux \u00e9changes, c'est pourquoi je n'accepte en moyenne que deux mariages par mois afin de rester pleinement investi avec mes mari\u00e9s.</p>
            <p>Je vous joins ma brochure tarifaire pour vous donner une premi\u00e8re id\u00e9e de mes services. Une fois que j'aurai vos pr\u00e9cisions, je pourrai vous faire une proposition totalement adapt\u00e9e.</p>
            <p>Seriez-vous disponibles prochainement pour un court appel vid\u00e9o afin de faire connaissance ?</p>
            <p>\u00c0 bient\u00f4t</p>
        </div>

        <div class="signature">
            <strong>William Kant</strong><br>
            Directeur Photographique<br>
            <a href="https://weds.fr" style="color: #666666; text-decoration: none;">weds.fr</a> - 06 51 15 78 42
        </div>
    </div>
</body>
</html>`;

async function main() {
  // Remove existing default
  await db
    .update(emailTemplates)
    .set({ isDefault: false })
    .where(eq(emailTemplates.isDefault, true));

  // Upsert the default template
  const existing = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.name, 'Contact initial'))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(emailTemplates)
      .set({
        subject: DEFAULT_SUBJECT,
        body: DEFAULT_BODY,
        variables: ['nom'],
        isDefault: true,
        contentType: 'html',
        attachments: [
          {
            filename: 'Brochure_Weds.pdf',
            gcsPath: 'attachments/Brochure_Weds.pdf',
            url: 'https://storage.googleapis.com/weds-crm-assets/attachments/Brochure_Weds.pdf',
            mimeType: 'application/pdf',
            size: 0, // Will be actual size after GCS migration
          },
        ],
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, existing[0].id));

    console.log(`Template "Contact initial" mis à jour (id: ${existing[0].id})`);
  } else {
    const [created] = await db
      .insert(emailTemplates)
      .values({
        name: 'Contact initial',
        subject: DEFAULT_SUBJECT,
        body: DEFAULT_BODY,
        variables: ['nom'],
        isDefault: true,
        contentType: 'html',
        attachments: [
          {
            filename: 'Brochure_Weds.pdf',
            gcsPath: 'attachments/Brochure_Weds.pdf',
            url: 'https://storage.googleapis.com/weds-crm-assets/attachments/Brochure_Weds.pdf',
            mimeType: 'application/pdf',
            size: 0, // Will be actual size after GCS migration
          },
        ],
      })
      .returning();

    console.log(`Template "Contact initial" créé (id: ${created.id})`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});
