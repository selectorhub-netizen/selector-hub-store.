const PRODUCTS = [
  { id: 0, name: "2026 Remix Pack - Vol. 1", price: 50 },
  { id: 1, name: "2025-2026 Remix Pack - Vol. 1", price: 50 },
  { id: 2, name: "Slip N Slide Remix Collection", price: 30 },
  { id: 3, name: "90s Dancehall Remix Juggling", price: 50 },
  { id: 4, name: "Big Links Remix Edits", price: 30 },
  { id: 5, name: "Fire Bun - Away Cut Ready", price: 30 },
  { id: 6, name: "2026 DJ FX Pack", price: 30 },
  { id: 7, name: "All Hip-Hop Juggling - Vol. 1", price: 100 },
  { id: 8, name: "All Dancehall Juggling - Vol. 1", price: 100 },
  { id: 9, name: "All Culture Juggling - Vol. 1", price: 100 },
  { id: 10, name: "Complete DJ Library", price: 300 },
  { id: 11, name: "2026 Ladies Dancehall Juggling - Vol. 2", price: 50 },
  { id: 12, name: "Hip-Hop Warm-Up Juggling - Vol. 1", price: 50 },
  { id: 13, name: "Throwback Hip-Hop Warm-Up Juggling - Vol. 1", price: 50 },
  { id: 14, name: "Spend Dat Juggling - Vol. 1", price: 50 },
  { id: 15, name: "2025-2026 Juggling Updates - Vol. 1", price: 50 },
  { id: 16, name: "Memory Lane - Blazing R&B", price: 50 },
  { id: 17, name: "Sweet Loadingz Collection", price: 50 },
  { id: 18, name: "Soulz & Lovers Rock Mix", price: 50 },
  { id: 19, name: "2026 Dancehall Juggling - Full Set", price: 100 }
];

const headers = {
  "Content-Type": "application/json"
};

function response(statusCode, data) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(data)
  };
}

function paypalBase() {
  const mode = process.env.PAYPAL_MODE;

  if (mode === "live") {
    return "https://api-m.paypal.com";
  }

  if (mode === "sandbox") {
    return "https://api-m.sandbox.paypal.com";
  }

  throw new Error("PAYPAL_MODE must be live or sandbox.");
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are missing.");
  }

  const credentials = Buffer
    .from(`${clientId}:${clientSecret}`)
    .toString("base64");

  const result = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await result.json();

  if (!result.ok || !data.access_token) {
    throw new Error("Unable to authenticate with PayPal.");
  }

  return data.access_token;
}

async function paypalRequest(path, method, token, body) {
  const result = await fetch(`${paypalBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await result.json();

  if (!result.ok) {
    console.error("PayPal API error:", data);
    throw new Error("PayPal could not complete the request.");
  }

  return data;
}

async function createOrder(token, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Your shopping cart is empty.");
  }

  if (items.length > 20) {
    throw new Error("Too many products in your cart.");
  }

  const orderItems = [];
  let totalCents = 0;

  for (const item of items) {
    const id = Number(item.id);
    const qty = Number(item.qty);

    if (
      !Number.isInteger(id) ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 10
    ) {
      throw new Error("Invalid product or quantity.");
    }

    const product = PRODUCTS.find(p => p.id === id);

    if (!product) {
      throw new Error("An invalid product was selected.");
    }

    totalCents += Math.round(product.price * 100) * qty;

    orderItems.push({
      name: product.name,
      unit_amount: {
        currency_code: "USD",
        value: product.price.toFixed(2)
      },
      quantity: String(qty),
      category: "DIGITAL_GOODS"
    });
  }

  const total = (totalCents / 100).toFixed(2);

  const order = await paypalRequest(
    "/v2/checkout/orders",
    "POST",
    token,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: "SELECTOR-HUB",
          description: "SELECTOR HUB Digital Products",
          amount: {
            currency_code: "USD",
            value: total,
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: total
              }
            }
          },
          items: orderItems
        }
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW"
      }
    }
  );

  return order.id;
}

async function captureOrder(token, orderID) {
  if (!orderID || typeof orderID !== "string") {
    throw new Error("A valid PayPal order ID is required.");
  }

  // Retrieve the order before capturing it.
  const existingOrder = await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(orderID)}`,
    "GET",
    token
  );

  const purchaseUnit = existingOrder.purchase_units?.[0];

  // Only accept orders belonging to SELECTOR HUB.
  if (
    existingOrder.intent !== "CAPTURE" ||
    purchaseUnit?.custom_id !== "SELECTOR-HUB" ||
    purchaseUnit?.amount?.currency_code !== "USD" ||
    existingOrder.status !== "APPROVED"
  ) {
    throw new Error("This PayPal order could not be verified.");
  }

  const result = await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
    "POST",
    token,
    {}
  );

  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];

  if (
    result.status !== "COMPLETED" ||
    !capture ||
    capture.status !== "COMPLETED" ||
    capture.amount?.currency_code !== "USD" ||
    capture.amount?.value !== purchaseUnit.amount.value
  ) {
    throw new Error("PayPal payment could not be confirmed.");
  }

  return {
    status: result.status,
    orderID: result.id
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return response(405, {
      error: "Method not allowed."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const token = await getAccessToken();

    if (body.action === "create") {
      const orderID = await createOrder(token, body.items);

      return response(200, {
        orderID
      });
    }

    if (body.action === "capture") {
      const result = await captureOrder(token, body.orderID);

      return response(200, result);
    }

    return response(400, {
      error: "Invalid checkout action."
    });

  } catch (error) {
    console.error("SELECTOR HUB checkout error:", error);

    return response(400, {
      error: error.message || "Checkout failed."
    });
  }
};
