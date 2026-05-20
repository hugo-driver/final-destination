const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',

      line_items: [
        {
          price_data: {
            currency: 'ron',

            product_data: {
              name: body.productName,
            },

            unit_amount: body.price,
          },

          quantity: 1,
        },
      ],

      success_url: 'https://beldie.ro/multumesc/',
      cancel_url: 'https://beldie.ro/anulat/',
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
};