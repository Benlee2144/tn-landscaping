# Hot Sauce Co. — website

Marketing site for a small-batch hot sauce brand in Knoxville, Tennessee.
Static HTML, CSS and JavaScript. No framework, no bundler, no third-party
requests at runtime — it will run on any web host, unchanged.

- **Creative brief and the reasoning behind the build:** [`docs/BRIEF.md`](docs/BRIEF.md)

---

## Run it locally

```bash
npm start          # serves at http://localhost:4000
```

Any static server works — there is no build step required to view the site.
`python3 -m http.server 4000` or `npx serve` do the same job.

---

## Before launch

Everything below is a placeholder. Each one is a single edit, not a
find-and-replace, because every business string lives in one file.

### 1 · Business details — `assets/js/site.config.js`

Open it and replace every value marked `PLACEHOLDER`:

| Field | What it is |
|---|---|
| `name` | **The business name.** Currently "Hot Sauce Co." — appears in the logo, every page title, the footer and all structured data. |
| `legalName` | Full legal entity, used in the copyright line and legal pages |
| `url` | Your live domain, no trailing slash |
| `address`, `geo` | Street address — feeds the LocalBusiness data Google uses for local search |
| `phone`, `phoneHref`, `email` | Contact details |
| `social` | Instagram / Facebook / TikTok URLs. Set any to `null` to hide that icon site-wide |
| `shopUrl` | Your Shopify / Square / Etsy storefront. Set it and every "Buy" button on the site goes live. Leave `null` and they point at Where to Buy instead |
| `defaultPrice`, `defaultSize` | Currently `$12.00` / `5 fl oz` |
| `formEndpoint` | A [Formspree](https://formspree.io) or [Basin](https://usebasin.com) URL. Until this is set, the contact and newsletter forms validate and then tell the visitor they are not connected — they never silently swallow a message |

Then run `npm run build` to push the changes through every page.

### 2 · Logo and photography

| Replace | With | Where |
|---|---|---|
| `assets/img/logo-mark.svg` | Your logo mark, square | Header, footer, favicon |
| `favicon.svg` | Same mark | Browser tab |
| `assets/img/bottles/*.svg` | Real bottle photography, one per sauce, transparent background | Cards and product pages |
| `assets/img/lineup.svg` | All six bottles together | Home hero |
| `assets/img/photos/*.svg` | Real photography | See the shot list below |
| `assets/img/og-default.svg` | 1200 × 630 social share image | Link previews |

Every photo placeholder states on its face what shot belongs there and at what
size, and carries a small `PLACEHOLDER` ribbon in the corner. The ribbon
disappears when you remove the `is-placeholder` class from the wrapper — or
delete the `.is-placeholder` rule at the bottom of `components.css` to clear
them all at once.

**Shot list**

| File | Size | Shot |
|---|---|---|
| `photos/hero-backdrop.svg` | 1920 × 1280 | Hero background — sits behind the headline, so keep it dark and out of focus |
| `photos/story-founders.svg` | 1400 × 1050 | The founders, in the kitchen |
| `photos/story-peppers.svg` | 1200 × 1500 | Crates of fresh peppers |
| `photos/process-blend.svg` | 1200 × 900 | Cooking — pot, steam, hands |
| `photos/process-bottle.svg` | 1200 × 900 | Filling and capping |
| `photos/market-booth.svg` | 1600 × 1000 | Your market booth or storefront |
| `photos/recipe-tacos.svg` | 1200 × 900 | Tacos with Mellow Verda |
| `photos/recipe-boil.svg` | 1200 × 900 | Seafood boil with Ragin Cajun |
| `photos/recipe-wings.svg` | 1200 × 900 | Wings with Zaxe |

Keep the filenames and no HTML needs touching. Swap the extension to `.jpg`
and you will need to update the `src` in the pages that use it.

### 3 · Copy that needs a human decision

Search the HTML for `PLACEHOLDER` — every instance is commented. The ones
that matter:

- **Marketing claims.** The scrolling strip on the home page says "Small
  batch", "Hand bottled", "Whole peppers", "Blended in-house". Confirm each is
  true for your process before launch.
- **Reviews.** The three testimonials on the home page are placeholder text.
  Replace them with real, attributable quotes — a fake review is worse than no
  review.
- **Stockists and market dates** on `where-to-buy.html`.
- **Founded year** (`SITE.founded`) and the origin story on `about.html`.
- **Ingredients** per sauce in `products.js` — these should match the printed
  label exactly.
- **Legal pages.** `privacy.html` and `terms.html` are drafts written to match
  how the site actually behaves. The shipping, returns and allergen sections
  contain business decisions only you can make, and both carry a visible
  "draft for review" notice until you remove it.

### 4 · Deploy

Push the repo to Netlify, Vercel, Cloudflare Pages or GitHub Pages — no build
command, no output directory. Then:

- Update the domain in `robots.txt` and `SITE.url`, and re-run `npm run build`
- Submit `sitemap.xml` in Google Search Console
- Claim the Google Business Profile — the LocalBusiness structured data on the
  home page is what ties the site to it

---

## Adding or changing a sauce

Products live in **one file**: `assets/js/products.js`.

```bash
# 1. Edit assets/js/products.js
# 2. Run:
npm run build
```

That regenerates the product page, the six-card grid on the home and lineup
pages, the heat index (including the open slots), the bottle artwork and
`sitemap.xml`. Commit the output.

Slots **3, 5, 9 and 10** on the heat index are currently shown as open. Add a
sauce with `heat: 3` and it fills itself in.

---

## How the project is laid out

```
index.html                Home
sauces.html               Full lineup, filterable by heat
sauces/<slug>.html        One page per sauce  ← generated
heat-scale.html           The 1–10 heat index explained
about.html                Brand story
where-to-buy.html         Stockists, markets, wholesale
recipes.html              Pairings and recipes
contact.html              Contact form + FAQ
404.html  privacy.html  terms.html

assets/
  css/
    fonts.css             @font-face — self-hosted Fraunces + Inter
    tokens.css            Design system: colour, type, space, motion
    base.css              Reset, elements, layout primitives, utilities
    components.css        Every UI component
  js/
    site.config.js        ← all business details live here
    products.js           ← the sauce catalogue lives here
    main.js               Nav, reveals, filters, accordion, forms
  fonts/                  Self-hosted woff2
  img/                    Generated placeholder artwork

tools/build.mjs           The build (see below)
```

### What `npm run build` does

It is a content build, not a bundler — the site is deployable without ever
running it.

1. Renders the header and footer from `site.config.js` and injects them into
   every page between the `<!-- @chrome:header -->` markers, so navigation
   lives in exactly one place
2. Generates `sauces/<slug>.html` for every product
3. Draws the placeholder bottle and photo artwork
4. Points every form at `SITE.formEndpoint`
5. Writes `sitemap.xml`

```bash
npm run build          # everything
npm run build:art      # artwork only
npm run build:pages    # product pages only
npm run build:chrome   # header/footer sync only
```

**Anything between `@chrome` markers is overwritten by the build.** To change
the navigation, edit the `NAV` array in `tools/build.mjs`, not the HTML.

---

## What was built in

- **Accessibility** — WCAG 2.2 AA. Every text/background pair on every page was
  measured, not eyeballed. Full keyboard support with a focus trap on the
  mobile menu, visible focus rings, skip link, semantic landmarks, and
  `prefers-reduced-motion` honoured throughout.
- **Works without JavaScript** — every page renders and reads with JS disabled.
  JS only adds the mobile menu, scroll reveals, the heat filter and form
  validation.
- **SEO** — unique titles and descriptions, canonicals, Open Graph, and JSON-LD
  for Organization, LocalBusiness, WebSite, Product (with offers),
  BreadcrumbList and FAQPage.
- **Performance** — no framework, no bundler, no runtime third-party requests.
  Fonts are self-hosted and subset; icons are inline SVG; images are lazy-loaded
  with explicit dimensions so nothing shifts as the page loads.
- **Privacy** — no analytics, no trackers, no font CDN. Nothing about a visitor
  leaves your server.

---

## Fonts

[Fraunces](https://fonts.google.com/specimen/Fraunces) (display) and
[Inter](https://fonts.google.com/specimen/Inter) (UI), both SIL Open Font
License 1.1, self-hosted in `assets/fonts/` as variable woff2 covering latin
and latin-ext. Fraunces ships with its optical-size, `SOFT` and `WONK` axes
intact — `tokens.css` drives all three.
