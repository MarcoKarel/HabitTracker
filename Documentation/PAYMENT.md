Payment integration notes (PayFast)

Overview
- This app uses PayFast for subscription payments. For development and manual testing use the PayFast sandbox:
  - https://sandbox.payfast.co.za/eng/process

Quick demo integration (client-side only)
- The `screens/PaymentScreen.js` file contains a small WebView-based demo that POSTs a form to the PayFast sandbox. This is intended for local/integration testing only.

Important production notes (server-side required)
- You MUST NOT embed `merchant_id` and `merchant_key` in the client for production. These values and the signature/hash must be generated on a secure server.
- PayFast requires you to build an `mf` string (merchant fields) and then create an `signature` (md5/hash) from the sorted fields plus the merchant key. See PayFast docs for exact algorithm.
- Use a server endpoint to create the form data (amount, item_name, return_url, cancel_url, notify_url, etc.) and render the form or return the signed fields to the client.
- Notify (IPN) endpoint: implement a server `notify_url` to receive payment notifications from PayFast and validate the signature on your server.

Sandbox testing
- Use the provided sandbox merchant credentials for quick tests (examples in PayFast docs).
- The demo `PaymentScreen` uses the sandbox merchant id/key as placeholders. Replace these with your server-provided values when testing end-to-end.

Webhooks / verify flow
1. Client starts subscription purchase and submits to PayFast (via server-signed form or direct POST from client to your server which then posts to PayFast).
2. PayFast will call your `notify_url` (server) with transaction data. Your server must verify the signature/hash and then act (e.g., mark subscription active).
3. PayFast then redirects the user to your `return_url` or `cancel_url` depending on outcome.

Pricing details (as requested)
- Free: No payment required.
- Personal: R25 per month (single user)
- Enterprise: R250 per month for up to 15 users. For more than 15 users, instruct customers to contact support.

Links
- PayFast developer docs: https://developers.payfast.co.za/docs#home
- Sandbox process URL: https://sandbox.payfast.co.za/eng/process

Server-side example (very high-level)
1) Create endpoint POST /create-payfast that accepts plan/customer info.
2) Server computes amount, builds the required merchant fields, computes the signature using merchant_key, and returns an HTML form or signed JSON to the client.
3) Client either opens a WebView with the returned HTML form, or server redirects the browser to PayFast.

Security
- Keep merchant_key secret on the server.
- Validate IPN notifications on the server by re-computing the signature and optionally calling PayFast for verification.

Support
- For Enterprise customers that need more than 15 users, include contact information in the UI and in marketing assets; the app currently displays "contact us" guidance in the UI.
