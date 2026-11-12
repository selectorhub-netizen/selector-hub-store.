exports.handler = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;

  if (!clientId) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: "PayPal is not configured yet."
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    },
    body: JSON.stringify({
      clientId,
      currency: "USD"
    })
  };
};
