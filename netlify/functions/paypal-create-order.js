const PRODUCTS = [
  { name: 'NICCOMATIC 2026 REMIX PACK #1', price: 130 },
  { name: 'NICCOMATIC 2025-2026 REMIXX PACK #1', price: 25 },
  { name: 'NICCOMATIC SLIP N SLIDE REMIXES', price: 33 },
  { name: 'NICCOMATIC 90S DANCEHALL REMIX JUGGLING', price: 73 },
  { name: 'NICCOMATIC BIG LINKS REMIXE EDITS', price: 55 },
  { name: 'NICCOMATIC FIRE BUN A WEAKHEART REMIXES', price: 20 },
  { name: 'NICCOMATIC 2026 EFX PACK #1', price: 33.33 },
  { name: 'NICCOMATIC ALL HIPHOP JUGGLING #1', price: 200 },
  { name: 'NICCOMATIC ALL DANCEHALL JUGGLING #1', price: 200 },
  { name: 'NICCOMATIC ALL CULTURE JUGGLING #1', price: 150 },
  { name: 'NICCOMATIC FULL DJ LIBRARY', price: 300 },
  { name: 'NICCOMATIC 2026 LADIES DANCEHALL JUGGLING #2', price: 88 },
  { name: 'NICCOMATIC HIP HOP WARM UP JUGGLING #1', price: 88 },
  { name: 'NICCOMATIC THROWBACK HIP HOP WARM JUGGLING #1', price: 88 },
  { name: 'NICCOMATIC SPEND DAT JUGGLING #1', price: 50 },
  { name: 'NICCOMATIC 2025-2026 JUGGLING UPDATES #1', price: 105 },
  { name: 'NICCOMATIC MEMORY LANE BLAZING R&B', price: 80 },
  { name: 'NICCOMATIC SWEET LOADINGZ HOLD ON TO WHAT YOU GOT', price: 80 },
  { name: 'NICCOMATIC SOULZ/LOVERZ ROCK MIX JUGGLING', price: 80 }
];

const paypalBase = () =>
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are missing.');
  }

  const auth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString('base64');

  const response = await fetch(
    `${paypalBase()}/v1/oauth2/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error('PayPal authentication failed.');
  }

  return data.access_token;
}

const jsonResponse = (statusCode, data) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.'
    });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const accessToken = await getAccessToken();

    // CREATE PAYPAL ORDER
    if (body.action === 'create') {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return jsonResponse(400, {
          error: 'Your cart is empty.'
        });
      }

      let total = 0;
      const orderItems = [];

      for (const item of body.items) {
        const id = Number(item.id);
        const qty = Number(item.qty);

        if (
          !Number.isInteger(id) ||
          id < 0 ||
          id >= PRODUCTS.length ||
          !Number.isInteger(qty) ||
          qty < 1 ||
          qty > 20
        ) {
          return jsonResponse(400, {
            error: 'Invalid cart item.'
          });
        }

        const product = PRODUCTS[id];

        total += product.price * qty;

        orderItems.push({
          name: product.name,
          quantity: String(qty),
          unit_amount: {
            currency_code: 'USD',
            value: product.price.toFixed(2)
          }
        });
      }

      total = Math.round(total * 100) / 100;

      const response = await fetch(
        `${paypalBase()}/v2/checkout/orders`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                description: 'SELECTOR HUB Digital Products',
                custom_id: 'SELECTOR-HUB',
                amount: {
                  currency_code: 'USD',
                  value: total.toFixed(2),
                  breakdown: {
                    item_total: {
                      currency_code: 'USD',
                      value: total.toFixed(2)
                    }
                  }
                },
                items: orderItems
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return jsonResponse(400, {
          error: 'PayPal could not create the order.'
        });
      }

      return jsonResponse(200, {
        orderID: data.id
      });
    }

    // CAPTURE APPROVED PAYPAL PAYMENT
    if (body.action === 'capture') {
      const orderID = body.orderID;

      if (
        typeof orderID !== 'string' ||
        !/^[A-Z0-9-]+$/i.test(orderID)
      ) {
        return jsonResponse(400, {
          error: 'Invalid order ID.'
        });
      }

      const response = await fetch(
        `${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== 'COMPLETED') {
        return jsonResponse(400, {
          error: 'PayPal could not complete the payment.'
        });
      }

      return jsonResponse(200, {
        status: data.status,
        orderID: data.id
      });
    }

    return jsonResponse(400, {
      error: 'Invalid payment action.'
    });

  } catch (error) {
    console.error('PayPal function error:', error);

    return jsonResponse(500, {
      error: 'Something went wrong processing your payment.'
    });
  }
};
