# SELECTOR HUB — GitHub + Netlify starter

This package contains the current SELECTOR HUB storefront plus Netlify serverless functions for PayPal **Sandbox** checkout.

## Important before using
- This is a **testing starter**, not a production-ready store.
- The backend validates product IDs and prices on the server and keeps the PayPal Secret out of browser code.
- It can create and capture a PayPal Sandbox order.
- **Automatic digital delivery is not configured.** The package does not contain your paid product files or a private download store. After a successful test payment, the page explicitly says delivery is not active.
- Customer accounts, order database, receipts/webhooks, refunds, tax handling, fraud controls and admin product management are not included yet.
- Check every product price and variant against your real catalogue before live checkout. The two products labelled “From $…” currently use the base values shown in the server catalogue ($33 and $73), not selectable variants.
- Do not switch `PAYPAL_ENV` to `live` or accept real payments until the delivery system and business/payment setup are complete and tested.

## 1. Put this project on GitHub
1. Sign in to GitHub and create a **New repository** named `selector-hub-store`.
2. Choose **Private** if you want the source code private. This does not make your Netlify website private; hosting visibility is a separate setting.
3. On the new repository page, choose **uploading an existing file**.
4. Extract this ZIP on your computer. Open the extracted folder and upload its contents (the `index.html`, `netlify` folder, `netlify.toml`, `package.json`, README, and `.env.example`). Upload the contents, not the outer folder itself.
5. Commit the files to the repository.

## 2. Connect GitHub to Netlify
1. In Netlify, open the existing SELECTOR HUB site.
2. Find **Project configuration → Build & deploy → Continuous deployment** (wording can vary).
3. Choose **Link repository** / **Connect to Git provider**, select GitHub, then choose `selector-hub-store`.
4. The included `netlify.toml` sets the build command to `node scripts/prepare-site.mjs`, the publish directory to `dist`, and the functions directory to `netlify/functions`. The build step creates `dist` and copies the storefront into it; backend source files stay outside the published directory.
5. Deploy. Netlify should deploy the site and its functions from the repository.

## 3. Add PayPal Sandbox environment variables in Netlify
In the SELECTOR HUB Netlify project, open **Project configuration → Environment variables** and add:
- `PAYPAL_CLIENT_ID` = the **Sandbox** app Client ID from PayPal Developer
- `PAYPAL_SECRET` = the **Sandbox** app Secret from PayPal Developer
- `PAYPAL_ENV` = `sandbox`

Save the variables, then trigger a fresh deploy so the functions receive them. Never put the Secret in `index.html`, GitHub, a public message, or a screenshot. Do not send it to anyone.

## 4. Test only with Sandbox
1. In PayPal Developer, create/use a Sandbox personal (buyer) account.
2. Open the Netlify site, add an item to the cart, and open the cart.
3. Use the PayPal button and sign in with the Sandbox buyer account.
4. Confirm the test order appears in the Sandbox app/account.

The current price list is duplicated in `netlify/functions/paypal-create-order.js` so the server controls the charged amounts. Update the browser product list and server list together when prices change.

## Function endpoints
- `/.netlify/functions/paypal-config` — returns the public Client ID only.
- `/.netlify/functions/paypal-create-order` — validates cart and creates a USD order.
- `/.netlify/functions/paypal-capture-order` — captures and verifies a completed payment.

## Before live launch
We still need to implement private file storage and time-limited download links, persist orders in a database, add verified PayPal webhooks/idempotency, and configure fulfilment. Then verify PayPal live eligibility for the Jamaican business and test the entire purchase-to-download journey. Keep `PAYPAL_ENV=sandbox` until all of that is complete.
