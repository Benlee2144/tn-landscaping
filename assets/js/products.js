/* ==========================================================================
   PRODUCT CATALOG — the single source of truth for the sauce lineup.
   --------------------------------------------------------------------------
   Add a sauce by appending an object here, then run:  node tools/build.mjs
   That regenerates /sauces/<slug>.html, the lineup grid and sitemap.xml.

   `number` is the brand's own sauce number, which doubles as its position on
   the 1–10 heat index. Slots 3, 5, 9 and 10 are open — drop them in when
   those sauces exist and everything downstream updates itself.
   ========================================================================== */

export const HEAT_MAX = 10;

export const HEAT_BANDS = [
  { max: 2, label: 'Mild', note: 'Flavor first. Everyone at the table can use it.' },
  { max: 4, label: 'Medium', note: 'A real warmth that builds, then backs off.' },
  { max: 6, label: 'Medium-Hot', note: 'You will notice it. You will keep going.' },
  { max: 7, label: 'Hot', note: 'Built for people who reach for the hot stuff.' },
  { max: 8, label: 'Very Hot', note: 'Superhot peppers. Start with one drop.' },
  { max: 10, label: 'Extreme', note: 'The top of the scale. Respect the drop count.' },
];

export function heatBand(n) {
  return HEAT_BANDS.find((b) => n <= b.max) || HEAT_BANDS[HEAT_BANDS.length - 1];
}

export const PRODUCTS = [
  {
    number: 1,
    slug: 'ryns-mellow-verda',
    name: "Ryn’s Mellow Verda",
    nameplain: "Ryn's Mellow Verda",
    tagline: 'The green sauce you already know, done right',
    // Verbatim from the client's product sheet.
    description:
      'A hint of Jalapeño, with Tomatillo and Poblano peppers. Made to be a green sauce that you will find at any Mexican restaurant. Full of flavor without the bite.',
    short: 'Tomatillo and poblano with just a whisper of jalapeño. All flavor, no burn.',
    base: 'Jalapeño',
    peppers: ['Jalapeño', 'Poblano'],
    ingredients: ['Tomatillo', 'Poblano', 'Jalapeño'], // PLACEHOLDER — add full label ingredients
    heat: 1,
    shuNote: 'Jalapeño reference: 2,500–8,000 SHU',
    color: '#4F9142',
    pairings: ['Street tacos', 'Eggs & migas', 'Carnitas', 'Grilled chicken'],
    featured: true,
  },
  {
    number: 2,
    slug: 'zaxe',
    name: 'Zaxe',
    nameplain: 'Zaxe',
    superTag: 'The Nation’s #1 Taste Improver',
    tagline: 'The one that goes on everything',
    description:
      'Jalapeño based, full of flavor, a little heat but most people can handle it.',
    short: 'Our everyday bottle. Jalapeño-forward, endlessly usable, barely any burn.',
    base: 'Jalapeño',
    peppers: ['Jalapeño'],
    ingredients: ['Jalapeño'], // PLACEHOLDER
    heat: 2,
    shuNote: 'Jalapeño reference: 2,500–8,000 SHU',
    color: '#C7A11A',
    pairings: ['Pizza', 'Wings', 'Burgers', 'Anything, honestly'],
    featured: true,
    bestseller: true,
  },
  {
    number: 4,
    slug: 'ragin-cajun',
    name: 'Ragin Cajun',
    nameplain: 'Ragin Cajun',
    tagline: 'Seafood’s best friend',
    description:
      'Serrano based, with a hint of Habanero, which is blended with our own cajun seasoning. Great on any seafood and have also had people inject their turkeys for Thanksgiving.',
    short: 'Serrano and habanero cut with our own cajun blend. Built for the boil.',
    base: 'Serrano',
    peppers: ['Serrano', 'Habanero'],
    ingredients: ['Serrano', 'Habanero', 'House cajun seasoning'], // PLACEHOLDER
    heat: 4,
    shuNote: 'Serrano reference: 10,000–23,000 SHU',
    color: '#9E2A1E',
    pairings: ['Shrimp boil', 'Blackened fish', 'Gumbo', 'Thanksgiving turkey'],
    featured: true,
  },
  {
    number: 6,
    slug: 'shine-the-light',
    name: 'Shine the Light',
    nameplain: 'Shine the Light',
    tagline: 'Heat that arrives, then gets out of the way',
    description:
      'Serrano based, with even parts Jalapeño and Habanero. Has a bite to it but also has a hint of Ginger to clean up the heat quickly.',
    short: 'Three peppers in balance, with ginger on the finish to clear the burn.',
    base: 'Serrano',
    peppers: ['Serrano', 'Jalapeño', 'Habanero'],
    ingredients: ['Serrano', 'Jalapeño', 'Habanero', 'Ginger'], // PLACEHOLDER
    heat: 6,
    shuNote: 'Habanero reference: 100,000–350,000 SHU',
    color: '#E2761F',
    pairings: ['Stir fry', 'Ramen', 'Pork belly', 'Roasted vegetables'],
    featured: true,
  },
  {
    number: 7,
    slug: 'ichiban',
    name: 'Ichiban',
    nameplain: 'Ichiban',
    tagline: 'The first sauce we ever made',
    description:
      'Habanero based, same profile as Zaxe’s but a lot more heat. First sauce we ever made and the recipe has not changed.',
    short: 'Where it all started. Zaxe’s flavor with the habanero turned all the way up.',
    base: 'Habanero',
    peppers: ['Habanero'],
    ingredients: ['Habanero'], // PLACEHOLDER
    heat: 7,
    shuNote: 'Habanero reference: 100,000–350,000 SHU',
    color: '#C4161C',
    pairings: ['Tacos al pastor', 'Jerk chicken', 'Chili', 'Breakfast burritos'],
    featured: true,
    originStory: true,
  },
  {
    number: 8,
    slug: 'amys-sweet-heat',
    name: 'Amy’s Sweet Heat',
    nameplain: "Amy's Sweet Heat",
    tagline: 'Mango up front. Scorpion right behind it.',
    description:
      'Scorpion based, wanted to make a Mango sauce but Habanero Mango is made by everyone. Lots of sweet Mango but lots of bite from the 3rd hottest pepper in the world.',
    short: 'Sweet mango, then the scorpion pepper arrives. Not a beginner bottle.',
    base: 'Scorpion',
    peppers: ['Trinidad Scorpion'],
    ingredients: ['Trinidad Scorpion', 'Mango'], // PLACEHOLDER
    heat: 8,
    shuNote: 'Trinidad Scorpion reference: 1,200,000–2,000,000 SHU',
    color: '#F2A03B',
    pairings: ['Mango salsa', 'Grilled pineapple', 'Wings', 'Cream cheese & crackers'],
    featured: true,
  },
];

/** Sauces sorted coolest → hottest (already in order, but explicit is better). */
export const BY_HEAT = [...PRODUCTS].sort((a, b) => a.heat - b.heat);

export function getProduct(slug) {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

export default PRODUCTS;
