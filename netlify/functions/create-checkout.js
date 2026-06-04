import Stripe from "stripe";
// builtwith.json e sursa unică de adevăr pentru produse.
// esbuild (bundler-ul Netlify) inline-uiește importul de JSON la build.
// Dacă vreodată bundling-ul se plânge de acest import, înlocuiește
// allowlist-ul cu o validare simplă de format (priceId.startsWith("price_")).
import products from "../../src/_data/builtwith.json";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Doar Price ID-urile din builtwith.json sunt acceptate la checkout.
const VALID_PRICE_IDS = new Set(
  products.filter((p) => p.priceId).map((p) => p.priceId)
);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { priceId } = JSON.parse(event.body || "{}");

    if (!priceId || !VALID_PRICE_IDS.has(priceId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Produs invalid" }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        "https://beldie.ro/multumim/?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://beldie.ro/plata-anulata/",
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_creation: "always",
      locale: "ro",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
