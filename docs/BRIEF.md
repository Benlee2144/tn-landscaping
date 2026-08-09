# The brief

You asked what prompt I'd write if I were you. Here it is — the one that
produced this site — followed by why it's shaped the way it is.

---

## The prompt

> Build a production-ready marketing website for a small-batch hot sauce brand
> in Knoxville, Tennessee. Six sauces, each numbered — the number is its
> position on a 1–10 heat index. Product names and descriptions come from the
> attached sheet; use that copy verbatim where it's customer-facing.
>
> **Treat this like an agency engagement, not a template fill.** Work in this
> order and show the thinking at each step:
>
> 1. **Positioning first.** Read the product descriptions and find the actual
>    brand truth in them, then write every headline against it. Don't reach
>    for generic hot-sauce language.
> 2. **Design system before pages.** Colour, type scale, spacing scale,
>    elevation and motion as named tokens in one file. Every page composes
>    from that vocabulary. Pick real typefaces with a point of view and
>    self-host them.
> 3. **Information architecture.** Home, full catalogue, one page per product,
>    a page that explains the heat scale, brand story, where to buy including
>    wholesale, recipes/pairings, contact with FAQ, 404, privacy, terms.
> 4. **Data-driven catalogue.** Products live in one file. Adding a seventh
>    sauce means editing that file and running a build — it should regenerate
>    the product page, the grid, the heat index and the sitemap. Never
>    hand-maintain the same product in six places.
> 5. **Build it properly.** Semantic HTML, WCAG 2.2 AA (verify contrast with
>    real numbers, don't eyeball it), full keyboard support, `prefers-reduced-
>    motion` honoured, and every page readable with JavaScript disabled.
> 6. **Technical SEO as a first-class deliverable.** Unique title and meta
>    description per page, canonicals, Open Graph, JSON-LD for Organization,
>    LocalBusiness, Product with offers, BreadcrumbList and FAQPage,
>    `sitemap.xml`, `robots.txt`.
> 7. **Performance.** No framework, no bundler, no third-party requests at
>    runtime. Self-hosted fonts, inline SVG icons, lazy images with explicit
>    dimensions so nothing shifts as it loads.
>
> I don't have the logo, photography or final prices yet. **Build every one of
> those as a designed placeholder** — real bottle renders in each sauce's
> colour, labelled photo slots that state exactly what shot goes there and at
> what dimensions, and every business string in a single config file so
> swapping in the real details is one edit, not a find-and-replace.
>
> Verify your work before you call it done: open every page in a real browser,
> check for horizontal overflow at 390px, click every interactive element,
> and prove the contrast ratios rather than assuming them.

---

## Why the prompt is shaped this way

**Order matters more than detail.** A prompt that lists twenty features
produces twenty disconnected features. A prompt that says *tokens before
components, components before pages* produces a system, and a system is what
makes a site feel expensive. Everything on this site draws from
`assets/css/tokens.css`; nothing hardcodes a colour or a spacing value.

**"Professionally done" is not a style, it's a set of constraints.** What
actually separates a serious build from a template is invisible in a
screenshot: contrast that's been measured, focus states that exist, a page
that still works with JS off, structured data that search engines can read.
So the prompt names those as deliverables rather than hoping for them.

**Placeholders are a deliverable too.** "Use placeholder for what you don't
have" gets you grey boxes. Specifying *designed* placeholders — bottle renders
in each sauce's colour, photo slots labelled with the shot and its dimensions
— means you can show the site to the client today and the shot list writes
itself.

**Ask for verification explicitly.** The single highest-leverage line in that
prompt is the last paragraph. It's what turned up the four real bugs that were
in the first pass: the hero content pushed off-screen by a CSS conflict, a
34-pixel overflow at mobile width, an accordion whose selector could never
match, and six colour pairs that failed WCAG.

---

## Decisions made on your behalf

These were judgement calls. Any of them can be reversed.

| Decision | Reasoning | Reverse it by |
|---|---|---|
| The sauce numbers double as the heat scale | Your sheet numbers them 1, 2, 4, 6, 7, 8 — read in order, that's a heat ranking with gaps. Making it explicit turned a quirk into the site's signature feature. | Editing `heat` separately from `number` in `assets/js/products.js` |
| Slots 3, 5, 9, 10 shown as "open" | Honest, and it makes the lineup look like a system rather than an incomplete list. | Deleting the empty-slot branch in `renderScale()` |
| Catalogue site, not a checkout | You asked for a site that "shows their products and info". Every Buy button reads from one config value, so pointing it at Shopify/Square/Etsy is a one-line change. | Setting `SITE.shopUrl` |
| Static HTML, no framework | Deploys anywhere, loads instantly, and any developer can pick it up in ten years. | — |
| Dark, warm, editorial art direction | Hot sauce is a warmth-and-fire category; a dark ground makes the six label colours the loudest thing on the page. | The palette in `tokens.css` |
| Typos in the source sheet corrected | "without the bit" → "without the bite" in two places. Everything else is verbatim. | `assets/js/products.js` |

---

## What I could not decide for you

Listed in `README.md` under **Before launch**. The short version: the business
name, the logo, photography, prices, real contact details, and whether the
marketing claims on the home page are ones you can stand behind.
