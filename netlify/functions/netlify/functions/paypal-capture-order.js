const base = () =>
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { orderID } = JSON.parse(event.body || "{}");

    if (!orderID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid PayPal order." })
      };
    }

    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    if (!id || !secret) {
      throw new Error("PayPal credentials are not configured.");
    }

    const auth = Buffer.from(`${id}:${secret}`).toString("base64");

    const tokenResponse = await fetch(
      `${base()}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error("PayPal authentication failed.");
    }

    const response = await fetch(
      `${base()}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Payment capture failed.");
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

    if (data.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
      throw new Error("Payment is not completed.");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETED",
        orderID: data.id,
        captureID: capture.id,
        amount: capture.amount?.value,
        currency: capture.amount?.currency_code
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
