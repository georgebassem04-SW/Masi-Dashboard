# Store Dashboard (admin panel)

The control panel each client's staff use to run their online gold/jewelry store:
orders, products, prices, website content, customers and settings.
It sits next to the storefront and later runs on its own subdomain (`admin.client.com`).

```
Frontend-Main\
├── storefront\   the shop customers see       → port 3000
└── dashboard\    this project (staff only)    → port 3002
```

## Run it

```bash
cd dashboard
npm install
copy .env.example .env.local     # Windows  (cp on Mac/Linux) — then fill it in
npm run dev                      # open http://localhost:3002
```

There are **no sample orders, customers or messages**: they come from the website running on your computer
(`STOREFRONT_MOCK_DB` in `.env.local`). Products, categories, pages and prices start from starter files and are edited here.

Demo logins (password for all: `Demo@12345`):

| Email | Role | Sees |
|---|---|---|
| owner@demo.store | Owner | everything |
| orders@demo.store | Orders staff | orders, customers, messages, products (view) |
| content@demo.store | Content editor | products, categories, pages, media, homepage |
| designer@demo.store | Website designer | Theme & design (whole look of the site), media library, pages, homepage |

## Same stack as the storefront

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Shadcn · React Hook Form + Zod · jose (login cookie).

## Folder map

```
app/
  layout.tsx              language + direction + fonts for every page
  login/                  staff login
  forgot-password/        reset link request
  (admin)/                every page after login (the brackets don't show in the address)
    layout.tsx            sidebar + top bar + login check
    page.tsx              Overview  (/)
    orders/ customers/ inbox/ custom-requests/ reports/ products/ categories/
    pages/ media/ home-builder/ pricing/ checkout/ settings/ notifications/
  api/
    auth/login  auth/logout  auth/forgot   staff login/logout/reset
    locale                                  switch Arabic/English
components/
  layout/     Sidebar, SidebarNav, MobileNav, Topbar, PageTitle, LanguageSwitch
  overview/   StatCard, RecentOrders, GoldPricesCard, QuickActions
  common/     Card, StatusBadge, NoticePage (placeholder / no access / 404)
  auth/       AuthShell, LoginForm, ForgotForm
  ui/         Shadcn pieces (button, input, label, badge, sheet)
config/
  nav.ts      the sidebar menu (order, icons, permissions)
  store.ts    store name, currency, session length
lib/
  api/        the data layer: types.ts (contract) · mock.ts (sample files) · http.ts (real API)
  auth/       session cookie · roles & permissions · password hashing · login attempt limit
  i18n/       Arabic/English texts (dictionaries/ar.json, en.json)
  validation/ form rules shared by browser and server
  format.ts   money, numbers, dates
mock-data/    sample staff, orders, messages, gold prices, products
types/        data shapes — shared ones are a copy of storefront/types, admin.ts is dashboard-only
proxy.ts      sends logged-out visitors to /login
```

## How it works (short)

- **Login:** `/api/auth/login` checks the email/password (mock file or real API) and saves a signed,
  httpOnly cookie `admin_session` for 8 hours. After 5 wrong tries in a minute the login is paused.
- **Permissions:** each section has a key (orders, products, …) and each staff member has
  `none / view / edit` for it. Ready-made roles are in `lib/auth/permissions.ts`.
  Sections without permission disappear from the menu, and opening them directly shows "no access".
- **Data:** pages only call `api.something()` from `lib/api`. `DATA_SOURCE=mock` uses `mock-data/`,
  `DATA_SOURCE=http` uses the real API at `ADMIN_API_BASE_URL`. Pages don't change when the API arrives.
- **Language:** no `/ar` in addresses. The choice is saved in the `admin_locale` cookie.

## What is built now (step 1: foundation)

| Done | Next steps |
|---|---|
| Project, colours and fonts from the design | Orders list + order page |
| Login, forgot password, logout | Products + categories |
| Roles and permissions | Pricing + coupons, shipping & payment |
| Sidebar, top bar, phone menu | Homepage builder, pages, media |
| Overview page (sample data) | Customers, messages, reports, settings & staff |
| **Orders**: list, filters, search, Excel export, order page, status steps, payment, notes, printable invoice | |
| Every other section has its page with an "under development" notice | Connect to the real API |

## Orders (الطلبات)

| Page | What it does |
|---|---|
| `/orders` | List with status tabs (+ counts), search (order no., name, phone, email), period / payment / delivery filters, 20 per page, **Export Excel** (CSV that opens in Excel with Arabic) |
| `/orders/<id>` | Progress steps, next-step buttons, items with gold rate & making charge at order time, customer (call / WhatsApp / email), delivery or pickup branch, totals, payment, full history + internal notes |
| `/print/orders/<id>` | A4 invoice to print or save as PDF |

- **Order process** (`lib/orders/workflow.ts`): New → Confirmed → Preparing → Shipped *or* Ready for pickup → Delivered → (Return).
  Cancel is possible until the order leaves the store. Cancel / return need a reason. Shipping asks for an optional tracking number.
- **Payment**: "Confirm payment received" for bank transfer / cash; "Record refund" after cancel / return.
  Cash on delivery and pay-at-branch become "paid" automatically when the order is marked delivered.
- The top-bar search opens the orders list filtered by what was typed.
- Staff need `orders: view` to see and `orders: edit` to change (the API checks again on every change).
- With the real API, the API sends the customer email on each status change (in sample mode it's printed in the terminal).

## Customers (العملاء)

| Page | What it does |
|---|---|
| `/customers` | Everyone who has an account **or** ordered as a guest. Tabs: all · with account · guests · repeat customers (2+ orders) · stopped. Search (name, phone, email — Arabic spellings and Arabic digits match), sort (newest, top spenders, most orders, latest order), "accept offers only", **Export Excel** |
| `/customers/<id>` | Totals (orders, total spent, average order, last order), all orders, addresses, account details (sign-up method, offers, order language, coupons used), staff notes, call / WhatsApp / email, **Stop account** / reactivate |

- Orders are linked to a customer by account, then email, then phone. Guests are grouped by phone number.
- "Total spent" doesn't count cancelled or returned orders.
- **Stop account** needs a reason (kept in the staff notes). A stopped customer can't log in on the website; past orders stay.
  Guests have no account, so there's nothing to stop.
- The order page has a **Customer file** button.
- Staff need `customers: view` to see and export, `customers: edit` for notes and stopping accounts.

## Products & categories (المنتجات والأقسام)

| Page | What it does |
|---|---|
| `/products` | Search (Arabic or English name, SKU, tags), category / karat / stock filters, sort, tabs (all · on the website · hidden · out of stock), today's price, stock badge, **show / hide switch**, **Sync with ERP**, **+ Add product** |
| `/products/<id>` | Names, description (Arabic / English), category, link, search words · karat, metal, making charge (per gram / fixed / %), stones · images (from the media library or a link, reorder, first = main) · sizes & stock · **live price preview** with today's gold price · visible / featured / "new" · certificate |
| `/products/new` | Add a piece that isn't in the ERP (everything editable, can be deleted later) |
| `/categories` | Drag (or ↑ ↓) to order them on the website · names, link, parent, descriptions, card image, banner · hide (hides its products too) · delete only when empty |
| `/collections` | Collections (Classic, Bridal…): add, rename, picture (4:3), order, hide, delete (its products stay, without a collection). Shown in the homepage block "Collections" and in the product filter. Put a product in one from the product page → **Collection**. Same permission as categories. Real API: `GET/POST /admin/brands`, `PUT/DELETE /admin/brands/<id>`, `PUT /admin/brands/order`; products carry `brandId`; the website reads `GET /storefront/brands` (visible only, in order, with `logo`) |

- **ERP products**: SKU, sizes, weight and stock (and fixed prices) are grey and locked — they come from the ERP.
  "Sync with ERP" pulls them now. ERP products can't be deleted, only hidden.
- **Stock follows website orders**: a new website order lowers the stock of each size it bought; when the order is
  set to **Cancelled** or **Returned** the pieces go back (once). "Made to order" sizes aren't counted.
  Test mode: `lib/api/mock-stock.ts` (a small ledger in `.mock-db` remembers which orders were counted).
  Real backend: the server does this when it saves the order / changes its status (or the ERP does it).
- The price shown is the same formula as the website (`lib/catalog/pricing.ts` = storefront `lib/pricing.ts`).
- Saving tells the live website to refresh (tags `products`, `product:<slug>`, `categories`).
- While developing, the storefront shows these changes when its `.env.local` has `DASHBOARD_URL=http://localhost:3002`.
- Staff need `products` / `categories`: view to see, edit to change. Product editors can also pick and upload photos.

## Media library: any file, 50 MB, select and delete

`/media`

- **Any file type** up to **50 MB** each: pictures, videos, sound, PDF, Office files, zip… Videos and sound play in the
  details panel; other files show an icon and an "Open / download" button.
- **Select**: tick several files (or "Select all") and delete them together, after a confirmation.
- The picture pickers (logo, slides, product photos…) list and accept **pictures only**.
- Safety: only pictures, videos, sound and PDF open in the browser. SVG is shown but locked so no script in it can run;
  every other file (web pages, scripts, Office, zip…) is sent as a download. The real file host / CDN must do the same.
- Size limit: `lib/media/image-check.ts` → `MAX_UPLOAD_MB`, plus `proxyClientMaxBodySize` in `next.config.ts` (keep it a bit higher).
- For the backend: `mimeType` is now any string; `DELETE /admin/media/<id>` is called once per selected file.

## Heroes anywhere, placed by the client

- **Hero / main slider** and **Wide picture** can now be added to ANY page (Site pages → a page → Add section), not only the homepage.
- **Top of: All products** and **Top of: Categories** (in Site pages) are not pages by themselves: whatever sections are
  added there show at the top of `/products` and `/categories`. Empty = no hero. With a hero or a title banner on top,
  the page's plain title is not repeated.
- Inside each slider slide and inside the **Page title banner** there is **Layout & colours**:
  where the words sit (3 × 3 grid), title size, title / text colours, the shade over the picture (0–80% and its colour), the blur of the picture (0–20, `blur` in the saved style),
  the buttons under the words or in their own place, and for each button filled / outline + its colours.
- Words and buttons are optional: a slide with no title is a picture only; a button with no text is not shown.
- The page title banner also has up to two buttons, a height (small / medium / large), breadcrumb on / off and a
  background colour when there is no picture.
- Nothing changes until the client chooses something: missing values = the original design (`lib/hero-style.ts`).
- For the backend: slides and `page_hero` have an optional `style` object (shape `HeroStyle` in `types/cms.ts`);
  `page_hero` also has `cta`, `cta2`, `height`, `breadcrumb`, `background`; the pages `shop-products` and
  `shop-categories` must exist and be served by `GET /storefront/pages/<slug>`.

## Pictures always keep their shape (image cropper)

Every picture that goes to the website has ONE fixed shape, listed in `config/image-frames.ts`
(homepage slider 16:7, phone slider 3:4, product photo 1:1 or 3:4, category picture 1:1, banners, branch photo 16:9…).

- After choosing a picture anywhere in the dashboard, the cropper opens with that shape: **Fill the frame (crop)** and drag
  to choose the part that shows, or **Fit whole picture** and pick a colour for the empty space. Zoom with the slider.
- "Save" makes a new picture of exactly that size in the media library; the original stays there.
- "Crop & adjust" next to a picture re-opens the cropper. To pick a different part of the original, choose the original
  from the library again.
- Fields with a fixed shape have no "paste a link" box, so a picture can't skip the cropper.
- The logo keeps its own cropper with two shapes (Header page).

## Product filter (فلتر المنتجات)

`/filters` — the filter column of the website's product pages (`/products` and every category page).

- **Sections**: switch each one on / off and move it up / down — category, special offers, price, karat, metal,
  weight, collection, in stock only.
- **Categories in the filter**: all main categories, or only the ones you add, in your order.
- **Undo / redo**: every edit form has the two arrows (theme, header, footer, filter, product page, site pages, homepage, product, category, collection, coupon, gold prices, price lock, shipping & payment, store details, branch, staff). One hook does it all: `lib/hooks/use-undo-redo.ts`; the buttons: `components/common/UndoRedo.tsx`. Quick typing is one step, 100 steps are kept, Ctrl+Z / Ctrl+Y work outside text boxes. Undo only changes the form — Save / Publish as usual.
- **Dark mode** (Theme & design → tab "Dark mode"): a switch to offer dark mode on the website, what visitors see first (light / dark), and a full set of dark colours (top bar and footer included) with a "suggested colours" button. On = a sun / moon button in the website's top bar; the visitor's choice is kept on their device. Saved in `theme.darkMode` (the real API must store and return it with the theme); suggested colours: `lib/theme-chrome.ts` → `suggestedDarkColors`.
- **Product page** (`/product-page`, sidebar → Product page): switches for each part of a product's page (New badge, code, gold-rate note, stock label, quantity, Buy now, WhatsApp, price breakdown, description, specifications, related products), side of the photos, position of the text, 4 or 8 related products. Buttons (Add to cart, Buy now, WhatsApp): order, filled or outline, colour, text colour, icon; all together: side by side or stacked, size, corners. Saved in `theme.productPage` (the real API must store and return it with the theme); form: `components/theme/ProductPagePanel.tsx`; defaults: `lib/theme-chrome.ts` → `DEFAULT_PRODUCT_PAGE`.
  (Creating / renaming / deleting a category is still done in Categories.)
- **Special offers** section: appears by itself only while a product in view has a special offer; ticking it shows
  only the products on offer (`?offer=1`).
- Saved in the theme (`theme.filters`), so it is a draft until **Publish**. Staff need `theme`.
- For the backend: `GET /storefront/products` gets a new filter `onOffer=true`, and the theme has `filters`
  (`{ sections: string[], categoryIds: string[] }`).

## Gold prices & coupons (أسعار الذهب والكوبونات)

`/pricing`

- **Gold prices**: source "Automatic from ERP" (read-only, **Sync now**) or "Manual" (type and save).
  A change over 10% asks "are you sure?" (catches typos). Recent changes are listed with who made them.
  Saving refreshes the website's prices and product pages (tags `gold-prices`, `products`).
- **Price lock at checkout**: how many minutes the cart price stays fixed, and the largest gold-price rise (0–5%)
  absorbed without asking the customer. Price drops always go through at the lower price.
- **Discount codes**: % of making charge (default for gold) · % of the order · fixed amount · free delivery.
  Optional max discount, minimum order, start / end dates, number of uses. Usage and total discount given are
  counted from orders. Pause, edit (even the code), delete. "Suggest text" writes the checkout line in both languages.
- **Special offers** (same form, first choice "Special offer"): no code to type — the website shows the lower price
  on the product itself with the old price crossed out and a "-10%" badge, and the checkout uses that price.
- **Which products?** A code or an offer can be for all products or only chosen ones (search by name or SKU).
  The discount is then taken per chosen piece. A code doesn't stack on a piece that is already on offer,
  and a code used on a cart with none of its products answers "not for these products".
- For the backend: coupons have two new fields, `productIds` (string[]) and `automatic` (boolean), and the
  website needs `GET /storefront/offers` (the running automatic offers, without codes — shape `Offer` in the
  storefront's `types/checkout.ts`). The quote must apply offers the same way as storefront `lib/checkout/quote.ts`.
- The checkout tells customers exactly why a code doesn't work (expired, used up, minimum not reached…).
- Staff need `pricing`: view to see, edit to change.

## Shipping & payment (الشحن والدفع)

`/checkout` — one page, one **Save** button (with "unsaved changes" and **Discard**).

- **Delivery areas**: fee, free delivery over an amount, delivery time (both languages), on/off, order. Add / edit in a small form, delete with confirmation.
  A switched-off area disappears from the checkout; an order sent to it is refused (`zone_unavailable`).
- **Branch pickup**: on/off, and the branches marked as pickup points (branches themselves are in Settings → Branches).
- **VAT & minimum order**: rate, charged on (making charge only · full price · prices include VAT) with a live example, minimum order.
- **Payment methods**: on/off, order, names and short description in both languages, bank-transfer details,
  largest order (e.g. cash on delivery up to 50,000), and whether it works with delivery, pickup or both.
  **+ New payment method** adds one — e.g. InstaPay, a mobile wallet or a second bank account (kind "bank transfer").
  The kinds are fixed (bank transfer · cash on delivery · pay at branch · card) and only one card gateway is allowed. Methods can be deleted (not the last one).
- **Safety rules** (checked on the page and again on the server): there must be a way to receive the order, and each
  way that's on needs at least one payment method. Otherwise saving is refused with a clear message.
- Saving refreshes the website's checkout right away (tag `checkout-options`).
- Staff need `checkout`: view to see, edit to change. Price lock & tolerance stay on the Gold prices page.

## Homepage (الصفحة الرئيسية)

`/home-builder` — the blocks of the store's first page, top to bottom. Same editor as Site pages:
changes are saved automatically as a **draft**, **Preview** opens the draft on the website (30-minute link),
**Publish** puts it live, **Discard changes** goes back to what's live.

- **Shop blocks**: main slider (several slides, optional phone picture, button each), today's gold prices (choose karats),
  categories (all or chosen), product row (featured · new · from a category · pieces you choose and order),
  offer (with an optional end date — it hides by itself after), wide picture, collections, video (paste a normal YouTube / Vimeo link).
- **Content blocks** shared with pages: why us, image & text, numbers, call to action, text, questions, history, branches.
- Move ↑ ↓, hide / show, delete, **+ Add section**. The slider and gold prices can be added once.
- Publish checks that every block has its pictures and texts in both languages; the website refreshes right away (tag `home`).
- Staff need `content`: view to see, edit to change.

## Site pages (صفحات الموقع)

| Page | What it does |
|---|---|
| `/pages` | All pages: About, Contact, FAQ, Terms (main pages) + pages the store adds (returns, privacy, buying guide…) — link, number of sections, menu placement, last change, status · **+ New page** |
| `/pages/<slug>` | Build the page from sections: title bar, text, image & text, numbers, features, timeline, questions & answers, branches, call to action, contact form. Reorder / hide / delete sections. Edit one language at a time (the other shows in grey to help translating) |

- Every change is **saved automatically as a draft** — visitors don't see it until **Publish**.
- **Preview** opens the draft on the storefront with a 30-minute link (signed with `AUTH_SECRET`), with a "draft preview" strip.
- Publish checks that required texts are filled **in both languages** and points to what's missing.
- Page settings: title, link (custom pages), where it shows (top menu / footer / nowhere — applies right away), Google & sharing.
- "Take offline" hides a page; custom pages can be deleted, main pages can't.
- The Contact page's "subjects" list is also what the inbox uses for subject names.
- Staff need `content`: view to see, edit to change.

## Settings (الإعدادات)

Everyone sees Settings; the tabs follow the permissions.

| Tab | What it does | Permission |
|---|---|---|
| `/settings/store` Store details | Email, phone, WhatsApp, address, customer-service hours, social links (Instagram, Facebook, TikTok, X, YouTube, Snapchat). **Website options**: order without an account, show weight, show the gold prices block, email for new-order alerts. The website uses them at once | `settings` |
| `/settings/branches` Branches | Add / edit / delete / reorder branches: name, city, address, phone, WhatsApp, hours, map link, picture, pickup point. Warns when no branch is a pickup point | `settings` |
| `/settings/staff` Staff & permissions | Everyone who can log in: role, custom permissions, last login, status. **Add staff member**, edit, switch off, new temporary password, delete | `staff` |
| `/settings/account` My account | My details, what I can do, change my password | everyone |

**Adding staff** — name (Arabic / English), email and a temporary password (the "Make one" button writes an easy one).
Give it to them yourself; at their first login they must choose their own password before they can do anything.

**What they can do** — two ways:
- **Simple**: pick a ready-made role — Owner, Store manager, Orders staff, Content editor, Website designer, View only.
- **Advanced**: for each of the 12 sections choose *No access / View / Edit*. It starts from a role; changed rows are highlighted and
  "Back to the role's permissions" undoes them.

**Safety rules** (shown on the page and checked again by the server — `lib/staff/rules.ts`):
- nobody can change their own role, permissions or on/off switch, or delete themselves;
- only an owner can add, change or remove an owner;
- nobody can give more than they have themselves (a manager with "view" on reports can't give "edit");
- there is always at least one active owner.

**Changes work at once** — the account is re-read on every click (`lib/auth/session.ts`): switching someone off logs them out,
and new permissions apply from their next click, not at their next login. Wrong current password attempts are limited like the login.

## Notifications (الإشعارات)

The bell in the top bar shows how many are unread; clicking it opens the drop-down list under it (All / Unread,
Today / Yesterday / Earlier, "Show more" for older ones). Each person's notification settings are in **Settings → My account**.

| Kind | When | Who gets it |
|---|---|---|
| New order | an order arrives | staff with `orders` |
| Waiting for confirmation | an order is still "new" after 24 hours | `orders` |
| Cancelled by the customer | the customer cancelled (not staff) | `orders` |
| Contact message | a message from the website's contact form | `inbox` |
| Customization request | a "Design your piece" request from the website | `custom` |
| Out of stock / Low stock | a visible product has 0 / 2 or fewer pieces | `products` |
| New customer | someone creates an account | `customers` |
| Gold price update | the ERP changed the gold prices | `pricing` |

- Clicking one marks it read and opens the order / message / product…; the gold dot marks one read; "Mark all as read".
- Read marks are per person. Everyone can switch kinds off for themselves in Settings → My account ("What to notify me about");
  the link at the bottom of the list goes there.
- The bell checks every minute, when the page changes and when you come back to the tab.
- Rules and numbers (24 hours, last 30 days, icons): `config/notifications.ts`.

## Reports (التقارير)

`/reports` — sales for today, 7 days, 30 days, 3 months, 12 months or any dates you pick.

- Total sales, orders, average order and gold sold (grams + pieces), each with ± % against the period just before.
- Sales chart per day (per month for long periods) — hover or tap a bar for the amount.
- Breakdown: gold value, making charges, stones, discounts, VAT, shipping.
- By category, by karat (grams, pieces, sales), best sellers.
- Orders by status, payment methods, delivery vs pickup, top cities, coupons used, new vs returning customers, cancelled & returned.
- **Export Excel**: one row per day (or month); **Export products**: the best sellers.
- Rules (what counts as a sale, new customer…) are written at the top of `lib/reports/build.ts` — the real API must follow them.
- Days are counted in the store's time zone: `config/store.ts` → `timeZone`.
- Staff need `reports: view`.

## Contact messages (رسائل التواصل)

`/inbox` — messages from the website's "Contact us" form. List on the side, the open message next to it (on phones: full screen with "back").

- Tabs: all · new · awaiting reply · handled. Search (name, phone, email, message number, words in the message) and subject filter.
- Opening a new message marks it as read. The overview card "unread messages" opens the new ones.
- The open message shows the sender, their preferred way to be answered, branch, language, and call / WhatsApp / email / customer file buttons.
- **Reply** by email (the API sends it in the visitor's language), by WhatsApp (opens WhatsApp with the text ready and saves it here)
  or after a phone call (save a short summary). "Ready replies" fill the box in the visitor's language.
- "Handled" / "Reopen", and staff-only notes. Everything is kept in the message history.
- Staff need `inbox: view` to read and `inbox: edit` to reply or change the status.
- Messages sent from the storefront on your computer appear here when `STOREFRONT_MOCK_DB` is set (same line as orders).

## Header & Footer (الهيدر والفوتر)

Two sidebar pages (under "Website") that control the website's top bar and footer. They edit the **same theme** as
Theme & design (saved as `theme.header` / `theme.footer`), so everything is a draft until **Publish**, and needs permission `theme`.

| Page | What can be changed |
|---|---|
| `/header` | Arrangement (logo at the start / in the middle / menu on a second row), menu position, height, width, line / shadow, stays on top · logo (with the cropper), logo size, show the store name · colours + hover colour · which menu links show + extra links · menu text size / weight / CAPITALS · which icons show (search, account, cart, language), filled or outline, cart or bag, size · announcement strip (text AR/EN, link, colours) |
| `/footer` | Arrangement (columns / everything centred), text position, spacing, width, top line · which parts show and their **order** (about · links · contact · social) · logo, logo size, name, tagline · colours (+ column titles, last line) · which links show + extra links · which contact lines show (phone, WhatsApp, email, address, hours) · social icon style · last line: own copyright text (`{year}`, `{store}`), "Powered by", position · "Back to top" |

- **Icon library** (`lib/icon-library.ts`, same file in the storefront): Header → Icons has ready-made sets (filled / thin lines / soft) and a
  picker for each icon (search, account, cart, language, phone menu button). Footer → Contact details has pickers for phone, WhatsApp, email, address, hours.
- **Footer contact details** can show as text, icons only, or icon + text; under each other or in a row; at the start / centre / end.
- **See-through header**: Header → Colours → sits on top of the first big picture of a page (homepage slider, title banner with a picture),
  with an adjustable amount of header colour, optional blur and its own text colour. It returns to normal after scrolling and on other pages.
  The footer can be transparent too (page background shows).
- Header and footer are edited **only** here: the logo, header / footer colours and "stays on top" were removed from Theme & design
  (ready-made colour palettes there no longer change header / footer colours).
- A live sketch at the top of each page follows every change. "Reset" returns only that part to the original design.
- Phone, email, address, hours and social links themselves come from Settings → Store details.
- Themes saved before these pages existed simply use the defaults (`lib/theme-chrome.ts`) — the website looks the same until something is changed.

## Customization requests (طلبات التخصيص)

`/custom-requests` — requests from the website's **"Design your piece"** page (Site pages → `customize`, at `/pages/customize`).
The page is edited like any site page; its **"Design your piece" form** block (+ Add section) can go on any page. The customer uploads
1–4 photos of the piece they want made or changed, picks the type / karat / budget and writes what they want.

- Tabs: all · new · reviewing · quote sent · in work · delivered · rejected. Search (name, phone, email, request number, words) and piece-type filter.
- The list shows the first photo. Opening a new request moves it to "reviewing".
- The open request shows the photos (click = full size), the description, the customer's details and call / WhatsApp / email / customer file buttons.
- **Update the request**: pick the status, add the price when it's "quote sent" (kept with the request), and an optional note. Staff-only notes too.
- The bell shows "New customization request"; each person can switch it off in My account.
- Customers' photos are **private**: shown to staff only (permission `custom`), never put in the public media library.
- Staff need `custom: view` to see and `custom: edit` to update. Ready roles: "Orders" = edit, "Viewer" = view.
- Test mode: requests sent from the storefront on your computer appear here when `STOREFRONT_MOCK_DB` is set (same line as orders).
- Real backend: `GET /admin/custom-requests`, `GET /admin/custom-requests/<id>`, `POST …/<id>/read | status | notes` (see `lib/api/http.ts`).

## Theme & design (المظهر والتصميم)

The website designer controls the whole look of the storefront from `/theme`:

| Tab | What it changes on the website |
|---|---|
| Brand & logo | store name + tagline (AR/EN), logo, footer logo, browser icon, share image. Choosing a logo opens the **cropper** (like a WhatsApp profile picture): pick the frame — **square** (icon + written name) or **wide** (logo with the name, the written name is hidden) — then move / zoom until the right part fills it. "Crop & adjust" re-opens it. |
| Colours | 16 colours (buttons, page, cards, texts, lines, top bar, footer, alerts) + ready palettes, with a readability check |
| Fonts & text | Arabic/English body + heading fonts, base text size, heading weight, line spacing, letter spacing |
| Shape & layout | content width, corner roundness, sticky top bar, product card style, image shape, products per row |
| Website texts | any fixed text of the site (406 texts, AR and EN) — search, filter, reset |

- Changes show instantly in the live preview. **Save draft** keeps them private; **Publish** puts them on the website.
- Images come from the **Media library** (`/media`): PNG/JPG/WebP/GIF up to 5 MB, checked by content (SVG refused for security).
- Only staff with the `theme` permission can open it (owner, manager, website designer). The API checks again on every save.
- **See it on the storefront while developing:** in the storefront's `.env.local` set `DASHBOARD_URL=http://localhost:3002`,
  run both projects, press Publish — refresh the storefront.
- With the real API: the API stores the theme and serves it at `/storefront/theme`; after Publish the dashboard calls the
  storefront's `/api/revalidate` with tag `theme` (set `STOREFRONT_URL` + `REVALIDATE_SECRET`).

## Shared types

`types/common.ts, product.ts, order.ts, cms.ts, checkout.ts, client.ts, theme.ts` are shared with the storefront,
and `config/storefront-texts/*.json` is a copy of `storefront/i18n/dictionaries/*.json` (used by the Website texts tab).
If you change a shape in one project, copy the file to the other. (Later we can move them into one shared package.)

## Before going live

- Set `AUTH_SECRET` (32+ random characters) — the dashboard refuses to log anyone in without it.
- Set `DATA_SOURCE=http` and `ADMIN_API_BASE_URL`.
- Serve it only on `https://admin.<client domain>`.
