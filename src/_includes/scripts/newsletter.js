// Newsletter: trimite emailul către funcția Netlify (/.netlify/functions/subscribe),
// care vorbește cu MailerLite din server. Astfel nimic nu poate fi blocat de ad-blocker.
(function () {
  var forms = document.querySelectorAll("form.newsletter-form");

  forms.forEach(function (form) {
    if (form.dataset.bound) return; // nu lega de două ori
    form.dataset.bound = "1";

    var msg = form.querySelector(".form-message");
    var btn = form.querySelector("button");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var email = ((form.email && form.email.value) || "").trim();
      var website = (form.website && form.website.value) || ""; // honeypot

      if (!email) {
        if (msg) msg.textContent = "Scrie adresa ta de email.";
        return;
      }

      var original = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Se trimite…";
      }
      if (msg) msg.textContent = "";

      fetch("/.netlify/functions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, website: website }),
      })
        .then(function (res) {
          if (res.ok) {
            window.location.href = "/sigur-vrei-sa-te-abonezi/";
            return;
          }
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (msg) {
                msg.textContent =
                  (data && data.error) || "Ceva n-a mers. Mai încearcă o dată.";
              }
              if (btn) {
                btn.disabled = false;
                btn.textContent = original;
              }
            });
        })
        .catch(function () {
          if (msg) msg.textContent = "Ceva n-a mers. Mai încearcă o dată.";
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
          }
        });
    });
  });
})();
