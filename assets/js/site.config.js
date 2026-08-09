/* ==========================================================================
   SITE CONFIG — single source of truth for every brand string on this site.
   --------------------------------------------------------------------------
   ⚑ EVERYTHING MARKED "PLACEHOLDER" IS SAFE TO EDIT. Change it here once and
     it updates across the whole site (headers, footers, schema.org, contact).
   ========================================================================== */

export const SITE = {
  /* ---- Identity -------------------------------------------------------- */
  // PLACEHOLDER — swap in the real business name. This is the ONE string that
  // appears most often. Update it here, then run `node tools/build.mjs`.
  name: 'Hot Sauce Co.',
  nameShort: 'HSC',
  legalName: 'Hot Sauce Co. LLC', // PLACEHOLDER
  tagline: 'Small-batch hot sauce from Knoxville, Tennessee',
  descriptor: 'Knoxville · Tennessee',
  founded: '2019', // PLACEHOLDER

  // One-line elevator pitch. Used in meta descriptions and the footer.
  blurb:
    'Six small-batch hot sauces built on real peppers and real flavor — ' +
    'made by hand in Knoxville, Tennessee.',

  /* ---- Where people find you ------------------------------------------ */
  url: 'https://example.com', // PLACEHOLDER — your live domain, no trailing slash

  address: {
    street: '000 Placeholder Ave', // PLACEHOLDER
    city: 'Knoxville',
    region: 'TN',
    regionName: 'Tennessee',
    postal: '37902', // PLACEHOLDER
    country: 'US',
  },

  geo: { lat: '35.9606', lng: '-83.9207' }, // Knoxville city center — refine to your address

  phone: '(865) 000-0000', // PLACEHOLDER
  phoneHref: '+18650000000', // PLACEHOLDER
  email: 'hello@example.com', // PLACEHOLDER

  hours: 'Orders ship Monday–Friday', // PLACEHOLDER

  /* ---- Social ---------------------------------------------------------- */
  // Set any of these to null to hide the icon site-wide.
  social: {
    instagram: 'https://instagram.com/', // PLACEHOLDER
    facebook: 'https://facebook.com/', // PLACEHOLDER
    tiktok: 'https://tiktok.com/', // PLACEHOLDER
    x: null,
  },

  /* ---- Commerce -------------------------------------------------------- */
  // Point this at your Shopify / Square / Etsy storefront and every "Buy"
  // button on the site goes live. Leave as null to show "Where to Buy" instead.
  shopUrl: null, // PLACEHOLDER e.g. 'https://shop.example.com'
  shopLabel: 'Order Online',

  currency: 'USD',
  currencySymbol: '$',
  defaultPrice: '12.00', // PLACEHOLDER — per 5 oz bottle
  defaultSize: '5 fl oz',

  freeShippingThreshold: '50', // PLACEHOLDER

  /* ---- Form endpoint ---------------------------------------------------- */
  // The contact + newsletter forms POST here. Drop in a Formspree / Basin /
  // Netlify Forms endpoint. Until then the forms validate and show a notice.
  formEndpoint: null, // PLACEHOLDER e.g. 'https://formspree.io/f/xxxxxxx'
};

/* Convenience: full one-line address used in schema + footer. */
export const ADDRESS_LINE = `${SITE.address.street}, ${SITE.address.city}, ${SITE.address.region} ${SITE.address.postal}`;

export default SITE;
