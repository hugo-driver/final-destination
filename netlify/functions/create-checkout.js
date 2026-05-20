import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  try {
    const { product } = JSON.parse(event.body);

    const products = {
      "hard-reset": {
        name: "Hard Reset",
        price: 4900, // 49.00 RON
      },

      "lista-lui-beldie": {
        name: "Lista lui Beldie",
        price: 2900,
      },

      "corp-de-animal": {
        name: "Corp de Animal",
        price: 3900,
      },
    };

    const selectedProduct = products[product];

    if (!selectedProduct) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Produs invalid",
        }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "ron",

            product_data: {
              name: selectedProduct.name,
            },

            unit_amount: selectedProduct.price,
          },

          quantity: 1,
        },
      ],

      mode: "payment",

      success_url:
        "http://localhost:8888/succes?session_id={CHECKOUT_SESSION_ID}",

      cancel_url: "http://localhost:8888/anulat",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
}