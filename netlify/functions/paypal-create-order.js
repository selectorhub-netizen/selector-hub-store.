exports.handler = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;

  if (!clientId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'PayPal is not configured.'
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientId,
      currency: 'USD'
    })
  };
};
