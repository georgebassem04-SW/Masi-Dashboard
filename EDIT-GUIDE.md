# Edit guide — "I want to change X, which file?"

## Look

| I want to… | Open this file |
|---|---|
| Change a colour (gold, background, sidebar, status colours) | `app/globals.css` → `:root` |
| Change fonts | `lib/fonts.ts` |
| Change the store name / currency / session length | `config/store.ts` |
| Change the login page design | `components/auth/AuthShell.tsx` (frame), `components/auth/LoginForm.tsx` (form) |

## Menu and pages

| I want to… | Open this file |
|---|---|
| Add / remove / reorder a sidebar item, change its icon | `config/nav.ts` |
| Change sidebar look | `components/layout/SidebarNav.tsx` (links), `components/layout/Sidebar.tsx` (frame) |
| Change the top bar (search, bell, user) | `components/layout/Topbar.tsx` |
| Change the phone menu | `components/layout/MobileNav.tsx` |
| Build a section that says "under development" | its file in `app/(admin)/<section>/page.tsx` — replace `<ModulePlaceholder />` |

## Texts (Arabic / English)

Every fixed text is in `lib/i18n/dictionaries/ar.json` and `en.json` — change both.

| Group | Used for |
|---|---|
| `app` | top bar, logout, menu |
| `nav`, `navGroups` | sidebar |
| `login`, `forgot` | login pages |
| `overview` | overview page |
| `status` | order status names |
| `roles` | role names under the staff name |

## Staff and permissions

| I want to… | Open this file |
|---|---|
| Change what a role can do | `lib/auth/permissions.ts` → `ROLE_PRESETS` |
| Add a new permission area | `PERMISSION_KEYS` in the same file, then use it in `config/nav.ts` |
| Add / edit a demo staff login | `mock-data/staff.json` (the command to make a password hash is in `lib/auth/password.ts`) |
| Change how long a login lasts | `config/store.ts` → `sessionHours` |
| Change the wrong-password limit | `lib/auth/rate-limit.ts` |

## Overview page

| I want to… | Open this file |
|---|---|
| Layout of the page (order of the blocks) | `app/(admin)/page.tsx` |
| Number cards | `components/overview/StatCard.tsx` |
| Latest orders table | `components/overview/RecentOrders.tsx` |
| Gold prices box | `components/overview/GoldPricesCard.tsx` |
| Quick action buttons | the `actions` list in `app/(admin)/page.tsx` |
| Where the numbers come from | real website orders, messages and products (no sample orders) |

## Data / API

| I want to… | Open this file |
|---|---|
| See every data function the dashboard needs | `lib/api/types.ts` |
| Change sample data behaviour | `lib/api/mock.ts` |
| Change real API addresses | `lib/api/http.ts` |
| Switch between sample data and real API | `.env.local` → `DATA_SOURCE=mock` or `http` |

## Theme & design / Media library

| I want to… | Open this file |
|---|---|
| Change the theme page layout (tabs, toolbar) | `components/theme/ThemeStudio.tsx` |
| Change the live preview | `components/theme/ThemePreview.tsx` |
| Colour pickers, sliders, switches | `components/theme/fields.tsx` |
| Default theme, font list, ready colour palettes | `config/theme-defaults.ts` |
| Add a font | `config/theme-defaults.ts` + `types/theme.ts` (both projects) + `storefront/lib/fonts.ts` |
| Allowed ranges (sizes, widths) and checks | `lib/validation/theme.ts` |
| Add a new theme setting | `types/theme.ts` (both projects) → `config/theme-defaults.ts` → `lib/validation/theme.ts` → `ThemeStudio.tsx` → storefront `lib/site-theme.ts` + `lib/theme.ts` + `app/globals.css` |
| Product page options (what shows, photo side, main button) | `components/theme/ProductPagePanel.tsx` · defaults: `lib/theme-chrome.ts` → `DEFAULT_PRODUCT_PAGE` · texts: dictionaries → `theme.productPage` |
| Undo / redo buttons (all edit forms) | `components/common/UndoRedo.tsx` (look, keyboard) · `lib/hooks/use-undo-redo.ts` (how many steps: `MAX_STEPS`, typing grouped: `GROUP_MS`) · texts: dictionaries → `history` |
| Website texts list | `config/storefront-texts/*.json` (copy the storefront dictionaries here when they change) |
| Media library screen | `components/media/MediaBrowser.tsx` |
| Header / Footer pages: the options shown | `components/theme/HeaderPanel.tsx`, `FooterPanel.tsx` (shared pieces: `chrome-fields.tsx`) |
| Header / Footer: default values + safety checks | `lib/theme-chrome.ts` (same file in the storefront) |
| Add an icon to the icon library (header icons, footer contact icons) | `lib/icon-library.ts` — one line per icon; copy the same file to the storefront. Needs `npm install` once (package `react-icons`) |
| Header / Footer: live sketch | `components/theme/ChromePreview.tsx` |
| Add a header / footer option | `types/theme.ts` (both projects) → `lib/theme-chrome.ts` (both) → `lib/validation/theme.ts` → the panel → storefront `components/layout/Header.tsx` / `Footer.tsx` |
| Logo cropper (frame shapes, saved size, zoom) | `components/theme/LogoCropper.tsx` → `FRAME`, `OUTPUT`, `MAX_ZOOM` (opened from `ImageField.tsx` with `crop`) |
| Upload rules (types, 5 MB) | `lib/media/image-check.ts` |
| Who can design | `lib/auth/permissions.ts` → `designer` role, key `theme` |
| Texts of these screens | dictionaries → `"theme"`, `"media"` |

## Products & categories

| I want to… | Open this file |
|---|---|
| Products list: columns, tabs, page size | `app/(admin)/products/page.tsx`, `PRODUCTS_PAGE_SIZE` in `lib/catalog/query.ts` |
| Product form sections and fields | `components/catalog/ProductForm.tsx` |
| Starting values of a new product (karat 21, per-gram making…) | `app/(admin)/products/new/page.tsx` → `EMPTY` |
| Form rules (required fields, limits) | `lib/validation/catalog.ts` |
| Price formula (must match the storefront) | `lib/catalog/pricing.ts` |
| "Limited quantity" threshold (2 pieces) | `lib/catalog/helpers.ts` → `LOW_STOCK_AT` |
| Categories page (drag order, form) | `components/catalog/CategoriesManager.tsx` |
| Texts | dictionaries → `"products"`, `"categories"` |
| Sample products / categories ("the ERP") | `mock-data/products.json`, `mock-data/categories.json` |

## Gold prices & coupons

| I want to… | Open this file |
|---|---|
| "Are you sure?" threshold for price changes (10%) | `components/pricing/GoldPricesCard.tsx` → `BIG_CHANGE_PCT` |
| Limits for price lock (1–120 min) and tolerance (0–5%) | `lib/validation/pricing.ts` |
| Coupon rules (code format, percent 1–100…) | `lib/validation/pricing.ts` → `couponSchema` |
| How a coupon is checked at checkout | storefront `lib/checkout/quote.ts` → `couponProblem` (the real API must match) |
| Coupon / special offer form, product picker | `components/pricing/CouponsManager.tsx` → `CouponForm`, `ProductPicker` |
| How a special offer changes a product's price | storefront `lib/checkout/offer-math.ts` (the real API must match) |
| Product filter page (sections on / off, order, categories) | `app/(admin)/filters/page.tsx`, `components/theme/FiltersPanel.tsx` |
| Shape / saved size of a website picture (slider, product, banner…) | `config/image-frames.ts` (and the matching shape in the storefront file named next to it) |
| The cropper (crop or fit, background colours, zoom limits) | `components/media/ImageCropper.tsx` · texts: dictionaries → `media.crop` |
| Give another picture field a fixed shape | add `frame="…"` to its `<ImageField>` (`components/theme/ImageField.tsx`) |
| Hero "Layout & colours" editor (position grids, colours, shade, buttons) | `components/pages/HeroStyleEditor.tsx` · texts: dictionaries → `sitePages.fields.hero` |
| Button editor: what a button does and where it goes (page, category, product, WhatsApp, call, email, website) | `components/pages/fields.tsx` → `LinkEditor` (`KINDS`, `SITE_PLACES`) · texts: `sitePages.fields.linkKinds` / `places` |
| Original hero design (default positions, shade strength) | `lib/hero-style.ts` → `HERO_DEFAULTS` (same file in the storefront) |
| Which blocks can be added to a page / the homepage | `lib/pages/templates.ts` → `SECTION_TYPES` / `HOME_SECTION_TYPES` |
| "Top of: All products / Categories" entries (add one for another shop page) | `lib/pages/paths.ts` → `SHOP_PAGES`, `SHOP_PAGE_TITLES` (+ storefront `lib/site-pages.ts` and the shop page file) |
| Looks of the open page's link in the website menu (Header → Menu style) | list: `lib/theme-chrome.ts` → `ACTIVE_LINK_STYLES` · how each one is drawn: storefront `app/globals.css` → "ACTIVE LINK" |
| Picking which pages show in the website's top menu (Header → Menu links) | `components/theme/HeaderPanel.tsx` → `MenuPagesPicker` · saved in `theme.header.menu.pageSlugs` (null = automatic) · used by storefront `components/layout/Header.tsx` → `chosenPages` |
| Add a new filter section / change the default order | `lib/theme-chrome.ts` → `FILTER_SECTIONS`, `DEFAULT_FILTERS` (same file in the storefront), then storefront `components/catalog/FilterPanel.tsx` → `blocks` |
| Tolerance rule when the price rises during checkout | storefront `lib/api/mock.ts` → `placeOrder` (the real API must match) |
| Texts | dictionaries → `"pricing"` |
| Sample prices ("the ERP feed") and coupons | `mock-data/gold-prices.json`, `mock-data/coupons.json` |

## Shipping & payment

| I want to… | Open this file |
|---|---|
| The page layout | `app/(admin)/checkout/page.tsx` |
| Areas table, pickup, VAT, payment methods, save bar | `components/checkout-settings/CheckoutSettingsEditor.tsx` |
| Kinds of payment method you can add, max number (10) | `components/checkout-settings/CheckoutSettingsEditor.tsx` → `PAYMENT_KINDS`, `MAX_PAYMENT_METHODS` |
| Safety rules (way to receive, payment for each way) | `lib/checkout-settings/rules.ts` → `checkoutProblem` (the real API must match) |
| Field rules (lengths, VAT 0–100, at least one "available with") | `lib/validation/checkout-settings.ts` |
| What happens to an order for a switched-off area / pickup | storefront `lib/checkout/quote.ts` → blockers |
| Texts | dictionaries → `"checkoutSettings"` |
| Starting values (before the first save) | `mock-data/checkout-options.json` |

## Homepage

| I want to… | Open this file |
|---|---|
| The page (what lists it loads) | `app/(admin)/home-builder/page.tsx` |
| The editor (same as Site pages, with `home`) | `components/pages/PageEditor.tsx` |
| Blocks offered in "+ Add section", and their order | `lib/pages/templates.ts` → `HOME_SECTION_TYPES` |
| What a new block contains when added | `lib/pages/templates.ts` → `newSection` (bottom part) |
| Fields of each block (slider, product row, offer…) | `components/pages/SectionForm.tsx` (bottom part) · product picker: `ProductPicker.tsx` |
| Blocks that can be added only once (slider, gold prices) | `components/pages/PageEditor.tsx` → `ONLY_ONCE` |
| What must be filled before publishing | `lib/pages/content.ts` → `publishProblems` |
| YouTube / Vimeo link conversion | `lib/pages/video.ts` |
| Texts | dictionaries → `"sitePages"` → `home`, `types`, `fields` |
| Starting homepage / starting collections (edited afterwards in Homepage and Collections) | `mock-data/home.json`, `mock-data/brands.json` |
| Collections page (list + form) | `components/catalog/CollectionsManager.tsx` · texts: dictionaries → `collections` |

## Site pages

| I want to… | Open this file |
|---|---|
| Add a new kind of section | `types/cms.ts` (both projects) → `lib/pages/templates.ts` → `lib/validation/pages.ts` → `lib/pages/content.ts` → `components/pages/SectionForm.tsx` → storefront `components/sections/` + `SectionRenderer.tsx` |
| What a new section contains when added | `lib/pages/templates.ts` |
| Which fields must be filled before publishing | `lib/pages/content.ts` → `publishProblems` |
| Auto-save delay (1.2 s) | `components/pages/PageEditor.tsx` → `setTimeout(…, 1200)` |
| Preview link lifetime (30 min) | `lib/pages/preview-token.ts` |
| Pages with their own address (/about, /contact, /faq, /terms) | `lib/pages/paths.ts` (same list in the storefront: `lib/site-pages.ts`) |
| Text editor buttons (bold, headings, lists, link) | `components/pages/RichTextEditor.tsx` |
| Texts | dictionaries → `"sitePages"` |
| Starting pages | `mock-data/pages/*.json` |

## Settings, staff & permissions

| I want to… | Open this file |
|---|---|
| Ready-made roles and what each can do | `lib/auth/permissions.ts` → `ROLE_PRESETS` |
| Add a new permission section | `lib/auth/permissions.ts` → `PERMISSION_KEYS`, then its name in dictionaries → `settings.permissions` |
| Safety rules (self, owners, "not more than you", password rule) | `lib/staff/rules.ts` (the real API must match) |
| Temporary password style (e.g. "Gold-4827-mx") | `lib/staff/rules.ts` → `makeTempPassword` |
| Where someone with a temporary password is sent | `lib/auth/session.ts` → `CHANGE_PASSWORD_PATH` |
| Staff form (simple / advanced) | `components/settings/StaffForm.tsx` |
| Staff list | `app/(admin)/settings/staff/page.tsx` |
| New temporary password / delete | `components/settings/StaffAccountActions.tsx` |
| Change my password | `components/settings/ChangePasswordForm.tsx` |
| Store details form · social networks list | `components/settings/StoreSettingsForm.tsx` · `lib/settings/store.ts` |
| Branches | `components/settings/BranchesManager.tsx` |
| Field rules (email, phone, links, passwords) | `lib/validation/settings.ts` |
| Tabs | `app/(admin)/settings/layout.tsx` |
| Texts | dictionaries → `"settings"` (role names: `"roles"`) |
| Starting staff / branches / store details | `mock-data/staff.json`, `branches.json`, `store.json` |

## Notifications

| I want to… | Open this file |
|---|---|
| Kinds, who gets them, icons and colours, "waiting" hours, how far back, bell refresh time | `config/notifications.ts` |
| How each kind is worked out (mock) | `lib/api/mock-notifications.ts` → `build` |
| The sentence of each kind | dictionaries → `notifications.types` (names: `notifications.names`) |
| Bell and its drop-down list (size, how many load at a time) | `components/notifications/NotificationBell.tsx` → `PAGE_SIZE` |
| "What to notify me about" (in Settings → My account) | `components/notifications/NotificationSettings.tsx` · page: `app/(admin)/settings/account/page.tsx` |

## Reports

| I want to… | Open this file |
|---|---|
| Change what counts as a sale / new customer | `lib/reports/build.ts` (the real API must match) |
| Add or change a period (e.g. "this year") | `lib/reports/period.ts` + dictionaries → `reports.periods` |
| Store time zone for "today" and each day | `config/store.ts` → `timeZone` |
| Page layout and cards | `app/(admin)/reports/page.tsx` |
| Chart look (colours, height, tooltip) | `components/reports/SalesChart.tsx` |
| Excel export columns | `app/api/reports/export/route.ts` |
| Texts | dictionaries → `"reports"` |

## Contact messages

| I want to… | Open this file |
|---|---|
| Ready replies (add / edit, Arabic + English) | `config/reply-templates.ts` |
| Subject names (must match the storefront contact page) | `config/contact-subjects.ts` |
| Inbox layout, tabs, list | `app/(admin)/inbox/page.tsx` |
| Reply box (email / WhatsApp / call) | `components/inbox/ReplyBox.tsx` |
| Texts | dictionaries → `"inbox"` |
| Where messages come from | the website's contact form (`STOREFRONT_MOCK_DB` in `.env.local`) |

## Customization requests

| I want to… | Open this file |
|---|---|
| Statuses (add / rename) | `types/admin.ts` → `CUSTOM_STATUSES` + dictionaries → `"custom.status"` |
| Piece types | `lib/custom/query.ts` → `PIECE_TYPES` + dictionaries → `"custom.types"` (same list as the storefront) |
| Page layout, list, open request | `app/(admin)/custom-requests/page.tsx` |
| Status + price box | `components/custom/CustomStatusForm.tsx` |
| Texts | dictionaries → `"custom"` |
| Where requests come from | the website's "Design your piece" page / form block (`STOREFRONT_MOCK_DB` in `.env.local`); test data: `lib/api/mock-custom.ts` |

## Homepage slider buttons

Each slide has **Button** and **Second button** (Homepage → Main slider). The second one shows next to the first with an outline —
e.g. "صمّم قطعتك / Design your piece" → `/pages/customize`. Leave it empty to hide it.

The "Design your piece" page itself is **Site pages → صمّم قطعتك** (sample: `mock-data/pages/customize.json`). Its form block:
editor fields in `components/pages/SectionForm.tsx` (case `custom_order`), new-block defaults in `lib/pages/templates.ts`.

## Customers

| I want to… | Open this file |
|---|---|
| Customers list: columns, tabs, page size | `app/(admin)/customers/page.tsx`, `SEGMENTS` / `CUSTOMERS_PAGE_SIZE` in `lib/customers/query.ts` |
| What counts as a "repeat customer" | `inSegment` in `lib/api/mock-customers.ts` (the real API must use the same rule) |
| Filter bar (search, sort, offers, export) | `components/customers/CustomersFilters.tsx` |
| Excel export columns | `app/api/customers/export/route.ts` |
| Customer file layout | `app/(admin)/customers/[id]/page.tsx` |
| Stop / reactivate pop-up | `components/customers/CustomerAccountAction.tsx` |
| Search spelling rules (أ/ا, ة/ه, ى/ي, Arabic digits) | `lib/search.ts` |
| Texts | dictionaries → `"customers"` |
| Where customers come from | accounts and guest orders on the website (`STOREFRONT_MOCK_DB`) |

## Orders

| I want to… | Open this file |
|---|---|
| Change which status can follow which (e.g. allow cancelling a shipped order) | `lib/orders/workflow.ts` → `NEXT_STATUSES` |
| Change what happens on a status/payment change | `lib/orders/changes.ts` (sample data) — the real API must follow the same rules |
| Orders list: columns, tabs, page size | `app/(admin)/orders/page.tsx`, `PAGE_SIZE` in `lib/orders/query.ts` |
| Filter bar (search, period, payment, delivery, export) | `components/orders/OrdersFilters.tsx` |
| Excel export columns | `app/api/orders/export/route.ts` |
| Order page layout | `app/(admin)/orders/[id]/page.tsx` |
| Next-step buttons + cancel/ship pop-ups | `components/orders/OrderActions.tsx` |
| Invoice design | `app/print/orders/[id]/page.tsx` (tax number text: dictionaries → `orders.invoice.taxNo`) |
| Status colours | `components/common/StatusBadge.tsx`, `components/orders/PaymentBadge.tsx` |
| Texts | dictionaries → `"orders"`, `"status"` |
| Where orders come from | orders placed on the website (`STOREFRONT_MOCK_DB`) |

## King Gold additions

| What | Where in the code |
|---|---|
| New block "Social feed" (fields, rules, template) | `components/pages/SectionForm.tsx` → `case "social_feed"` · `lib/validation/pages.ts` · `lib/pages/templates.ts` · `lib/pages/content.ts` · picture shape `config/image-frames.ts` → `socialPost` |
| Slider height, categories look, image+text look, video strip | `components/pages/SectionForm.tsx` (cases `hero`, `categories`, `image_text`, `cta`) · rules `lib/validation/pages.ts` |
| Product card options | `components/theme/ThemeStudio.tsx` (Layout tab) · rules `lib/validation/theme.ts` · defaults `lib/theme-chrome.ts` (same file in the storefront) |
| Menu drop-downs, icons as words, strip position | `components/theme/HeaderPanel.tsx` · sketch `ChromePreview.tsx` |
| Own footer columns, social row, bottom links, title size | `components/theme/FooterPanel.tsx` · sketch `ChromePreview.tsx` |
| Texts of all the above | `lib/i18n/dictionaries/*.json` → `theme.layout.card`, `theme.header.dd`, `theme.footer.x`, `sitePages.fields.k` |
| King Gold's starting look | `config/theme-defaults.ts` |
