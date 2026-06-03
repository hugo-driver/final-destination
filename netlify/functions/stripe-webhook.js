import Stripe from "stripe";
import postmark from "postmark";
import AWS from "aws-sdk";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

const s3 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  signatureVersion: "v4",
  region: "auto",
});

// Price ID Stripe -> { pdf: cheia din R2, group: ID grup MailerLite al produsului }
const PRODUCTS = {
  "price_1TdxAULF51VQ7KF55R6FZ69I": { pdf: "hardreset.pdf", group: "188933005604029798" }, // Hard Reset
  "price_1TdxEHLF51VQ7KF5RPwZjuhV": { pdf: "smz.pdf", group: "188933523223086246" }, // Social Media Zombie
  "price_1TdxIJLF51VQ7KF5HoRuBpyq": { pdf: "sfarma.pdf", group: "188933705425749714" }, // Sfarmă Piatră
  "price_1TdxOQLF51VQ7KF5uXWsSDtX": { pdf: "listacumancarebuna.pdf", group: "188933195319739580" }, // Lista cu mâncare bună
  "price_1TdxhZLF51VQ7KF5F0w2dI1q": { pdf: "listaluibeldie.pdf", group: "188933377788741391" }, // Lista lui Beldie
  "price_1Tdxk2LF51VQ7KF5mTEdPvds": { pdf: "unmailpezi.pdf", group: "188933829388404002" }, // Un mail pe zi
};

// Grupul în care intră ORICE cumpărător, pe lângă grupul produsului.
const CLIENT_GROUP = "188932794078987301";

// Adaugă/actualizează cumpărătorul în MailerLite: grup Client + grup produs, ca activ.
// Upsert-ul e non-destructiv: nu scoate abonatul din grupuri existente (ex. "Pixel vs Neuron").
// status:"active" => fără email de confirmare (a plătit deja).
async function addToMailerLite(email, firstName, productGroupId) {
  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      fields: firstName ? { name: firstName } : undefined,
      groups: [CLIENT_GROUP, productGroupId],
      status: "active",
    }),
  });

  if (!res.ok) {
    throw new Error(`MailerLite ${res.status}: ${await res.text()}`);
  }
}

async function objectExists(key) {
  try {
    await s3.headObject({ Bucket: process.env.R2_BUCKET_NAME, Key: key }).promise();
    return true;
  } catch (err) {
    if (err.code === "NotFound" || err.code === "NoSuchKey") return false;
    throw err;
  }
}

async function markDelivered(key) {
  await s3
    .putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: new Date().toISOString(),
      ContentType: "text/plain",
    })
    .promise();
}

// IMPORTANT: text fără diacritice — fontul standard (Helvetica/WinAnsi)
// nu poate desena ț/î/ă/ș și ar arunca eroare.
async function addWatermark(pdfBytes, customerName, customerEmail) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const text = `Achizitionat de: ${customerName} | ${customerEmail}`;

  for (const page of pdfDoc.getPages()) {
    page.drawText(text, {
      x: 20,
      y: 10,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.6,
    });
  }

  return await pdfDoc.save();
}

export async function handler(event) {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Ignorăm evenimentele din test mode (livrarea reală se face doar pe plăți live).
  if (!stripeEvent.livemode) {
    return { statusCode: 200, body: "Test mode event ignored" };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const sessionId = session.id;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);

      for (const item of lineItems.data) {
        const priceId = item.price.id;
        const product = PRODUCTS[priceId];

        // Price ID care nu e al nostru (ex. produs de pe celălalt site) -> ignorăm.
        if (!product) {
          console.log(`Price ID necunoscut, ignorat: ${priceId}`);
          continue;
        }

        // Idempotență: dacă l-am livrat deja pentru această sesiune, sărim.
        const deliveredKey = `delivered/${sessionId}-${product.pdf}`;
        if (await objectExists(deliveredKey)) {
          console.log(`${product.pdf} pentru ${sessionId} deja livrat, skip.`);
          continue;
        }

        // 1. Ia PDF-ul original din R2
        const original = await s3
          .getObject({ Bucket: process.env.R2_BUCKET_NAME, Key: product.pdf })
          .promise();

        // 2. Watermark personalizat
        const personalized = await addWatermark(
          original.Body,
          customerName || "Client",
          customerEmail
        );

        // 3. Salvează versiunea personalizată în R2
        const personalizedKey = `personalized/${sessionId}-${product.pdf}`;
        await s3
          .putObject({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: personalizedKey,
            Body: Buffer.from(personalized),
            ContentType: "application/pdf",
          })
          .promise();

        // 4. Link semnat valabil 7 zile
        const signedUrl = s3.getSignedUrl("getObject", {
          Bucket: process.env.R2_BUCKET_NAME,
          Key: personalizedKey,
          Expires: 604800,
        });

        // 5. Trimite emailul cu Postmark
        await postmarkClient.sendEmail({
          From: '"Ștefan Beldie" <stefan@beldie.ro>',
          ReplyTo: "stefan@beldie.ro",
          To: customerEmail,
          Subject: "Ghidul tău este aici",
          HtmlBody: `
            <p>Mulțumesc pentru încredere și pentru achiziție.</p>
            <p>Îți poți descărca ghidul de la linkul de mai jos. Linkul este valabil <strong>7 zile</strong>:</p>
            <p>
              <a href="${signedUrl}" style="background:#222;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">
                Descarcă ghidul
              </a>
            </p>
            <p>Dacă linkul expiră sau ai vreo problemă cu descărcarea, răspunde direct la acest email.</p>
            <p>Spor,<br>Ștefan</p>
          `,
          TextBody: `Mulțumesc pentru pentru achiziție.

Îți poți descărca ghidul folosind linkul de mai jos în următoarele 7 zile:

${signedUrl}

Dacă linkul expiră sau ai vreo problemă cu descărcarea, răspunde direct la acest email.

Log out,
Ștefan Beldie`,
        });

        // 6. Tag în MailerLite (izolat — un eșec aici NU oprește livrarea PDF-ului)
        try {
          const firstName = customerName ? customerName.split(" ")[0] : "";
          await addToMailerLite(customerEmail, firstName, product.group);
        } catch (mlErr) {
          console.error(`MailerLite tagging eșuat pentru ${customerEmail}:`, mlErr.message);
        }

        // 7. Marchează livrat (la final, ca un eșec mai sus să permită retry)
        await markDelivered(deliveredKey);
      }
    } catch (err) {
      console.error(`Eroare fulfillment pentru sesiunea ${sessionId}:`, err);
      return { statusCode: 500, body: "Fulfillment error" };
    }
  }

  return { statusCode: 200, body: "OK" };
}
