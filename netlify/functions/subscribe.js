// netlify/functions/subscribe.js
// Primește un email de la formularul de newsletter și îl adaugă în MailerLite,
// în grupul "Pixel vs Neuron", ca abonat neconfirmat (pentru double opt-in).
// Emailul de confirmare îl trimite MailerLite — vezi nota de la "status" mai jos.

// ID-ul grupului "Pixel vs Neuron".
// Îl găsești în MailerLite: Subscribers → Groups → click pe grup → numărul din URL.
const GROUP_ID = "188931986851628206";

exports.handler = async (event) => {
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

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error("Lipsește MAILERLITE_API_KEY din environment.");
    return json(500, { error: "Configurare lipsă pe server." });
  }

  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: email,
        groups: [GROUP_ID],
        // NU setăm "status" intenționat: lăsăm setarea contului să decidă.
        // Cu "Double opt-in for API and integrations" = ON, abonatul nou intră
        // ca neconfirmat și primește emailul de confirmare în română.
        // (Dacă acea setare e OFF, NU se trimite nicio confirmare — de-aia trebuie ON.)
      }),
    });

    if (res.ok) {
      return json(200, { ok: true });
    }

    const data = await res.json().catch(() => ({}));
    console.error("MailerLite a răspuns cu eroare:", res.status, JSON.stringify(data));
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
