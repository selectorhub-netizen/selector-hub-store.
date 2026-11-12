const base = () => process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!id || !secret) throw new Error('PayPal credentials are missing.');

  const auth = Buffer.from(`${id}:${secret}`).toString('base64');

  const response = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  if (!response.ok) throw new Error('PayPal authentication failed.');

  return data.access_token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { orderID } = JSON.parse(event.body || '{}');

    if (!orderID || typeof orderID !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid order ID.' }) };
    }

    const access = await getToken();

    const response = await fetch(
      `${base()}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok || data.status !== 'COMPLETED') {
      throw new Error('PayPal could not complete the payment.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: data.status, orderID: data.id })
    };

  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
