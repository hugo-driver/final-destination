// Leagă butoanele de cumpărare la funcția Netlify create-checkout.
// Pune pe orice buton: <button class="buy-button" data-price-id="price_...">Cumpără</button>
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".buy-button[data-price-id]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Se încarcă...";

      try {
        const res = await fetch("/.netlify/functions/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: btn.dataset.priceId }),
        });

        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || "Eroare necunoscută");
        }
      } catch (e) {
        btn.disabled = false;
        btn.textContent = original;
        alert(
          "A apărut o eroare la inițierea plății. Încearcă din nou sau scrie-mi la stefan@beldie.ro."
        );
      }
    });
  });
});
