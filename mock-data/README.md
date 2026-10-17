# Starter data (used while DATA_SOURCE=mock)

There are **no sample orders, customers or messages**: they come only from the website on your computer
(`STOREFRONT_MOCK_DB` in `.env.local`). The files below are only the *starting* content — after the first run
everything is edited in the dashboard.

| File | What it is |
|---|---|
| `staff.json` | Starting staff. Demo password for all: `Demo@12345` (only the hash is stored). Copied into `.mock-db` the first time, then managed in Settings → Staff & permissions |
| `store.json` | Starting contact details and social links (copied the first time, then edited in Settings → Store details) |
| `categories.json` | Starting categories (copied into `.mock-db` the first time; then managed in Categories). Also used by Reports |
| `home.json` | Starting homepage blocks (same as the storefront's sample) — copied into `.mock-db` the first time, then edited in Homepage |
| `brands.json` | The collections the "Collections" block can show (plays the ERP; copy of the storefront's) |
| `pages/*.json` | Starting site pages (About, Contact, FAQ, Terms, Returns, Privacy) — copied into `.mock-db` the first time, then edited in Site pages |
| `branches.json`, `checkout-options.json` | Starting branches (then edited in Settings → Branches) and checkout settings (copies of the storefront's) |
| `gold-prices.json` | Plays the ERP gold-price feed: copied the first time; "Sync now" (ERP mode) reads it again — edit it to simulate a price change |
| `coupons.json` | Starting discount codes (copied the first time, then managed in Gold prices & coupons) |
| `products.json` | Plays the ERP: copied into `.mock-db` the first time as "ERP products"; **Sync with ERP** re-reads weight / stock / SKU from it (edit it to simulate an ERP change). Stock already taken by open website orders stays taken |

When the real API is connected (`DATA_SOURCE=http`) these files are not used.

**Real storefront orders:** set `STOREFRONT_MOCK_DB=../storefront/.mock-db/db.json` in `.env.local`. Orders placed on the
storefront on your computer then appear in the Orders list, and status/payment changes are written
back so the customer sees them in "My orders".
Accounts created on the storefront appear in Customers too, and stopping an account there blocks its login on the website.
Messages sent from the storefront's contact form appear in Contact messages too, and "Design your piece" requests (with their photos) in Customization requests.
Each order lowers the product stock here (and on the website); Cancelled / Returned puts it back. Sync with ERP keeps open orders counted.
