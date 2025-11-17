// Simple PayPal payment service (server-side)
// Reads configuration from environment variables in `.env`.
// NOTE: Keep secrets (client secret / service role) server-side only. Do not ship these to the client.

const isNode = typeof process !== 'undefined' && process?.versions?.node;

const PAYPAL_SANDBOX = (process.env.PAYPAL_SANDBOX || 'true') === 'true';
const PAYPAL_BASE = PAYPAL_SANDBOX ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

// Preferred: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment.
// Fallback: use PAYPAL_MERCHANT_KEY and PAYPAL_PASSPHRASE if those are what you have (not ideal).
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_MERCHANT_KEY;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_PASSPHRASE;

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  // Do not throw here because this file may be loaded in environments that don't need payments.
  console.warn('PayPal credentials not found in environment. Payment functions will fail until configured.');
}

const encodeBasicAuth = (id, secret) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(`${id}:${secret}`).toString('base64');
  }
  // browser fallback (should not be used for secrets)
  return btoa(`${id}:${secret}`);
};

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error('PayPal credentials missing');

  const tokenUrl = `${PAYPAL_BASE}/v1/oauth2/token`;
  const body = 'grant_type=client_credentials';
  const auth = encodeBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Create an order. amount is a string like '9.99'
async function createOrder({ amount, currency = 'USD', return_url = null, cancel_url = null }) {
  const token = await getAccessToken();
  const url = `${PAYPAL_BASE}/v2/checkout/orders`;

  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount,
        },
      },
    ],
  };

  if (return_url && cancel_url) {
    body.application_context = {
      return_url,
      cancel_url,
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal create order failed: ${res.status} ${t}`);
  }

  return res.json();
}

// Capture an approved order
async function captureOrder(orderId) {
  if (!orderId) throw new Error('orderId required');
  const token = await getAccessToken();
  const url = `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal capture failed: ${res.status} ${t}`);
  }

  return res.json();
}

module.exports = {
  createOrder,
  captureOrder,
  getAccessToken,
  PAYPAL_BASE,
};

export default module.exports;
