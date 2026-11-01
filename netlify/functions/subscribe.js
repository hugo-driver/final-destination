// netlify/functions/subscribe.js
// Primește un email de la formularul de newsletter și trimite în Bento
// evenimentul "abonare_beldie". Evenimentul creează contactul (dacă nu există)
// și pornește flow-ul "Confirmare abonare beldie.ro" din Bento, care:
//   1. îl marchează ca dezabonat până confirmă (double opt-in),
//   2. îi trimite emailul "Confirmă abonarea la beldie.ro",
//   3. la click pe link îl abonează și îi pune tag-ul "pixel-vs-neuron".
//
// Variabile de mediu necesare în Netlify (Site configuration -> Environment variables):
//   BENTO_PUBLISHABLE_KEY, BENTO_SECRET_KEY, BENTO_SITE_UUID

const EVENT_TYPE = "abonare_beldie";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let email = "";
  let website = "";
  try {
    const body = JSON.parse(event.body || "{}");
    email = String(body.email || "").trim().toLowerCase();
    website = String(body.website || "");
  } catch {
    return json(400, { error: "Cerere invalidă." });
  }

  // Honeypot anti-spam: câmp ascuns pe care oamenii nu-l văd.
  // Dacă e completat, e aproape sigur un bot — ne prefacem că a mers, fără să chemăm API-ul.
  if (website) {
    return json(200, { ok: true });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Adresă de email invalidă." });
  }

  const publishableKey = process.env.BENTO_PUBLISHABLE_KEY;
  const secretKey = process.env.BENTO_SECRET_KEY;
  const siteUuid = process.env.BENTO_SITE_UUID;
  if (!publishableKey || !secretKey || !siteUuid) {
    console.error("Lipsesc variabilele BENTO_PUBLISHABLE_KEY / BENTO_SECRET_KEY / BENTO_SITE_UUID din environment.");
    return json(500, { error: "Configurare lipsă pe server." });
  }

  const auth = Buffer.from(`${publishableKey}:${secretKey}`).toString("base64");
  const url = `https://app.bentonow.com/api/v1/batch/events?site_uuid=${encodeURIComponent(siteUuid)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "beldie-ro-subscribe/1.0",
      },
      body: JSON.stringify({
        events: [
          {
            type: EVENT_TYPE,
            email: email,
            details: { source: "beldie.ro" },
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));

    // Bento răspunde cu {"results": N, "failed": M}.
    if (res.ok && !(data && data.failed > 0)) {
      return json(200, { ok: true });
    }

    console.error("Bento a răspuns cu eroare:", res.status, JSON.stringify(data));
    return json(502, { error: "Nu am putut procesa abonarea. Mai încearcă o dată." });
  } catch (err) {
    console.error("Eroare în funcția subscribe:", err);
    return json(500, { error: "Eroare de server. Mai încearcă o dată." });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
