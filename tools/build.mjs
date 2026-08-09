#!/usr/bin/env node
/* ==========================================================================
   BUILD  ·  node tools/build.mjs
   --------------------------------------------------------------------------
   This is a *content* build, not a bundler. The site in this repo is already
   deployable as-is — nothing here is required to view it. What it does:

     1. Renders the shared header + footer from site.config.js and injects
        them into every .html file between the @chrome markers, so nav and
        footer live in exactly one place.
     2. Generates /sauces/<slug>.html for every product in products.js.
     3. Draws the placeholder bottle + photo SVGs.
     4. Writes sitemap.xml.

   Run it after editing site.config.js or products.js. Commit the output.
   ========================================================================== */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { SITE, ADDRESS_LINE } from '../assets/js/site.config.js';
import { PRODUCTS, HEAT_MAX, heatBand } from '../assets/js/products.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(ROOT, ...s);

/* ==========================================================================
   Helpers
   ========================================================================== */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Straight-quote a string for use inside JSON-LD. */
const jsonSafe = (s = '') => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/* ---- Contrast ------------------------------------------------------------
   Sauce colours are chosen for the brand, not for legibility, so the text
   colour that sits on top of one is computed rather than hand-picked. Add a
   sauce with any colour and its badge stays readable.
   ------------------------------------------------------------------------ */

function relLuminance(hex) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/../g)
    .map((h) => {
      const c = parseInt(h, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [l1, l2] = [relLuminance(a), relLuminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Whichever of ink/paper reads better on this background. */
function bestInk(bg) {
  return contrast('#ffffff', bg) > contrast('#12100e', bg) ? '#ffffff' : '#12100e';
}

/**
 * Prefix for links inside a page, based on how deep the file sits.
 * 404.html is the exception: the server can serve it in place of any URL at
 * any depth, so its links have to be absolute or they resolve against
 * whatever path the visitor mistyped.
 */
const prefixFor = (relPath) =>
  relPath === '404.html' ? '/' : '../'.repeat(relPath.split(path.sep).length - 1) || './';

/* ==========================================================================
   Navigation model
   ========================================================================== */

const NAV = [
  { id: 'sauces', href: 'sauces.html', label: 'The Sauces' },
  { id: 'heat', href: 'heat-scale.html', label: 'Heat Index' },
  { id: 'about', href: 'about.html', label: 'Our Story' },
  { id: 'where', href: 'where-to-buy.html', label: 'Where to Buy' },
  { id: 'contact', href: 'contact.html', label: 'Contact' },
];

const NAV_MOBILE = [
  ...NAV.slice(0, 3),
  { id: 'recipes', href: 'recipes.html', label: 'Recipes' },
  ...NAV.slice(3),
];

/* ==========================================================================
   Icons (inline, so there is no icon-font request)
   ========================================================================== */

const ICON = {
  arrow: '<svg class="icon icon--arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  instagram:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V3h-2.2A4 4 0 0 0 11 7v1.5H9V11h2v10h3V11h2.3l.7-2.5H14Z" fill="currentColor"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.5 3v11.2a2.8 2.8 0 1 1-2.3-2.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 3c.4 2.4 2 4 4.5 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

/** The wordmark. Swap this whole block when the real logo file arrives. */
const logoLockup = (pre, extraClass = '') => `<a class="logo ${extraClass}" href="${pre}index.html" aria-label="${esc(SITE.name)} — home">
          <img class="logo__mark" src="${pre}assets/img/logo-mark.svg" alt="" width="38" height="38" />
          <span class="logo__text">
            <span class="logo__name">${esc(SITE.name)}</span>
            <span class="logo__desc">${esc(SITE.descriptor)}</span>
          </span>
        </a>`;

/* ==========================================================================
   Shared chrome
   ========================================================================== */

function renderHeader(pre, active, solid) {
  const navItems = NAV.map(
    (item) =>
      `<li><a class="nav__link" href="${pre}${item.href}"${
        item.id === active ? ' aria-current="page"' : ''
      }>${esc(item.label)}</a></li>`
  ).join('\n              ');

  const menuItems = NAV_MOBILE.map(
    (item, i) =>
      `<li><a class="menu__link" href="${pre}${item.href}"${
        item.id === active ? ' aria-current="page"' : ''
      }><span class="menu__num">0${i + 1}</span>${esc(item.label)}</a></li>`
  ).join('\n            ');

  const buy = SITE.shopUrl
    ? `<a class="btn btn--primary btn--sm header__cta" href="${SITE.shopUrl}">${esc(SITE.shopLabel)}</a>`
    : `<a class="btn btn--primary btn--sm header__cta" href="${pre}where-to-buy.html">Where to Buy</a>`;

  return `
    <div class="announce">
      <p>
        <span>Small batch &amp; hand bottled in Knoxville, TN</span>
        <a href="${pre}where-to-buy.html">Find a bottle near you</a>
      </p>
    </div>

    <header class="header${solid ? ' is-solid' : ''}" data-header>
      <div class="container header__inner">
        ${logoLockup(pre)}

        <nav class="nav" aria-label="Primary">
          <ul class="nav__list">
              ${navItems}
          </ul>
        </nav>

        <div class="header__actions">
          ${buy}
          <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-menu" aria-label="Open menu">
            <span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
          </button>
        </div>
      </div>
    </header>

    <div class="menu" id="site-menu" data-menu aria-hidden="true">
      <nav aria-label="Mobile">
        <ul class="menu__list">
            ${menuItems}
        </ul>
      </nav>
      <div class="menu__foot">
        <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
        <a href="tel:${esc(SITE.phoneHref)}">${esc(SITE.phone)}</a>
        <p>${esc(ADDRESS_LINE)}</p>
      </div>
    </div>`;
}

function renderFooter(pre) {
  const socials = Object.entries(SITE.social)
    .filter(([, url]) => Boolean(url))
    .map(
      ([key, url]) =>
        `<a href="${esc(url)}" aria-label="${key[0].toUpperCase() + key.slice(1)}" rel="noopener">${ICON[key] || ''}</a>`
    )
    .join('\n            ');

  const sauceLinks = PRODUCTS.map(
    (s) => `<li><a href="${pre}sauces/${s.slug}.html">${esc(s.name)}</a></li>`
  ).join('\n            ');

  return `
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            ${logoLockup(pre)}
            <p>${esc(SITE.blurb)}</p>
            <div class="socials">
            ${socials}
            </div>
          </div>

          <div>
            <h4>The Sauces</h4>
            <ul>
            ${sauceLinks}
              <li><a href="${pre}sauces.html">View all</a></li>
            </ul>
          </div>

          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="${pre}heat-scale.html">Heat Index</a></li>
              <li><a href="${pre}recipes.html">Recipes &amp; Pairings</a></li>
              <li><a href="${pre}about.html">Our Story</a></li>
              <li><a href="${pre}where-to-buy.html">Where to Buy</a></li>
              <li><a href="${pre}where-to-buy.html#wholesale">Wholesale</a></li>
            </ul>
          </div>

          <div>
            <h4>Get in Touch</h4>
            <ul>
              <li><a href="${pre}contact.html">Contact us</a></li>
              <li><a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></li>
              <li><a href="tel:${esc(SITE.phoneHref)}">${esc(SITE.phone)}</a></li>
              <li><span>${esc(SITE.address.city)}, ${esc(SITE.address.region)}</span></li>
              <li><span>${esc(SITE.hours)}</span></li>
            </ul>
          </div>
        </div>

        <div class="footer__bottom">
          <p>&copy; <span data-year>2026</span> ${esc(SITE.legalName)}. All rights reserved.</p>
          <div class="footer__legal">
            <a href="${pre}privacy.html">Privacy</a>
            <a href="${pre}terms.html">Terms</a>
            <a href="${pre}where-to-buy.html#wholesale">Wholesale</a>
          </div>
        </div>
      </div>
    </footer>`;
}

/* ==========================================================================
   Placeholder artwork
   ========================================================================== */

/**
 * Break a name into at most two label lines, choosing the split that keeps
 * the longest line as short as possible, then size the type to fit the band.
 */
function fitLabel(name, maxWidth = 150, maxSize = 25) {
  const words = name.toUpperCase().split(' ');

  let lines = [words.join(' ')];
  if (words.length > 1) {
    let best = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const longest = Math.max(a.length, b.length);
      if (longest < best) {
        best = longest;
        lines = [a, b];
      }
    }
  }

  // Georgia bold caps average ~0.62em per character; 0.66 buys margin for
  // wide-letter names so nothing kisses the edge of the label band.
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.max(14, Math.min(maxSize, Math.floor(maxWidth / (0.66 * longest))));
  return { lines, size };
}

/** A woozy-style bottle drawn in the sauce's own colour. */
function bottleSvg(s) {
  const { lines, size } = fitLabel(s.nameplain);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 660" role="img" aria-label="${esc(
    s.nameplain
  )} bottle">
  <defs>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${s.color}" stop-opacity=".55"/>
      <stop offset=".18" stop-color="${s.color}"/>
      <stop offset=".62" stop-color="${s.color}"/>
      <stop offset="1" stop-color="#000" stop-opacity=".45"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3a332e"/>
      <stop offset=".22" stop-color="#1d1a17"/>
      <stop offset=".75" stop-color="#141210"/>
      <stop offset="1" stop-color="#0a0908"/>
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fbf6ec"/>
      <stop offset=".6" stop-color="#f2e9da"/>
      <stop offset="1" stop-color="#ddd0bb"/>
    </linearGradient>
    <clipPath id="bodyClip">
      <path d="M100 120v45c0 25-60 50-60 103v332c0 22 18 40 40 40h100c22 0 40-18 40-40V268c0-53-60-78-60-103v-45Z"/>
    </clipPath>
  </defs>

  <!-- glass -->
  <path d="M100 120v45c0 25-60 50-60 103v332c0 22 18 40 40 40h100c22 0 40-18 40-40V268c0-53-60-78-60-103v-45Z"
        fill="url(#glass)"/>
  <g clip-path="url(#bodyClip)">
    <rect x="52" y="120" width="18" height="520" fill="#fff" opacity=".22" rx="9"/>
    <rect x="196" y="120" width="10" height="520" fill="#000" opacity=".28" rx="5"/>
  </g>
  <path d="M100 120v45c0 25-60 50-60 103v332c0 22 18 40 40 40h100c22 0 40-18 40-40V268c0-53-60-78-60-103v-45Z"
        fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>

  <!-- cap -->
  <rect x="93" y="16" width="74" height="108" rx="7" fill="url(#cap)"/>
  <g fill="#000" opacity=".35">
    <rect x="93" y="34" width="74" height="3"/><rect x="93" y="46" width="74" height="3"/>
    <rect x="93" y="58" width="74" height="3"/><rect x="93" y="70" width="74" height="3"/>
    <rect x="93" y="82" width="74" height="3"/><rect x="93" y="94" width="74" height="3"/>
  </g>
  <rect x="93" y="16" width="12" height="108" rx="6" fill="#fff" opacity=".12"/>

  <!-- label -->
  <rect x="46" y="318" width="168" height="238" rx="5" fill="url(#paper)"/>
  <rect x="46" y="318" width="168" height="46" rx="5" fill="${s.color}"/>
  <rect x="46" y="352" width="168" height="12" fill="${s.color}"/>
  <text x="130" y="349" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="15" font-weight="700" letter-spacing="4" fill="#fff" opacity=".92">NO. ${s.number}</text>

  ${lines
    .map(
      (line, i) =>
        `<text x="130" y="${418 + i * (size + 5)}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif"
        font-size="${size}" font-weight="700" fill="#1b1816">${esc(line)}</text>`
    )
    .join('\n  ')}

  <line x1="76" y1="${lines.length > 1 ? 452 : 434}" x2="184" y2="${lines.length > 1 ? 452 : 434}"
        stroke="#1b1816" stroke-opacity=".28" stroke-width="1.5"/>
  <text x="130" y="${lines.length > 1 ? 478 : 460}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="12" letter-spacing="2.4" fill="#5c5348">${esc(s.base.toUpperCase())}</text>

  <!-- heat pips -->
  ${Array.from({ length: HEAT_MAX })
    .map(
      (_, i) =>
        `<rect x="${62 + i * 14}" y="${lines.length > 1 ? 498 : 484}" width="8" height="16" rx="2" fill="${
          i < s.heat ? s.color : '#c9bcaa'
        }"/>`
    )
    .join('\n  ')}

  <text x="130" y="${lines.length > 1 ? 538 : 528}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="11" letter-spacing="2" fill="#7d7267">KNOXVILLE · TENNESSEE · ${esc(SITE.defaultSize.toUpperCase())}</text>
</svg>
`;
}

/** A labelled slot showing exactly which photo belongs here. */
function photoSvg({ w, h, title, note }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#221e1b"/>
      <stop offset=".55" stop-color="#171412"/>
      <stop offset="1" stop-color="#2a201a"/>
    </linearGradient>
    <radialGradient id="glow" cx=".7" cy=".25" r=".8">
      <stop offset="0" stop-color="#e85d1f" stop-opacity=".28"/>
      <stop offset="1" stop-color="#e85d1f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect x="14" y="14" width="${w - 28}" height="${h - 28}" fill="none"
        stroke="#ffffff" stroke-opacity=".16" stroke-width="1.5" stroke-dasharray="9 7" rx="6"/>

  <g transform="translate(${w / 2} ${h / 2 - 44})" opacity=".5">
    <path d="M-16 6c0-14 11-25 25-25 3 0 6 .5 8 1.5C13-24 6-28 0-28c-14 0-25 12-25 26 0 16 14 30 25 34 11-4 25-18 25-34"
          fill="none" stroke="#e8a33d" stroke-width="2.4" stroke-linecap="round" transform="scale(1.15)"/>
  </g>

  <text x="${w / 2}" y="${h / 2 + 22}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="${Math.max(13, Math.round(w / 42))}" font-weight="700" letter-spacing="2.5"
        fill="#f4ece0" opacity=".92">${esc(title.toUpperCase())}</text>
  <text x="${w / 2}" y="${h / 2 + 48}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="${Math.max(11, Math.round(w / 62))}" letter-spacing="1.2" fill="#b3a698" opacity=".8">${esc(note)}</text>
  <text x="${w / 2}" y="${h - 26}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="11" letter-spacing="2" fill="#877d71" opacity=".8">PLACEHOLDER · ${w} × ${h}</text>
</svg>
`;
}

/**
 * Hero backdrop. Unlike the labelled photo slots this one carries no text —
 * it sits behind the headline, so it has to read as atmosphere, not as a
 * to-do note. Swap the <img> src for the real hero photograph when it lands.
 */
function heroBackdropSvg(w = 1920, h = 1280) {
  const rays = Array.from({ length: 7 })
    .map((_, i) => {
      const x = 300 + i * 260;
      return `<path d="M${x} -200 L${x + 190} -200 L${x - 320} ${h + 200} L${x - 510} ${h + 200} Z"
          fill="#ffb066" opacity="${0.035 + (i % 3) * 0.014}"/>`;
    })
    .join('\n    ');

  // Soft out-of-focus pepper shapes, the kind a shallow depth of field gives you.
  const pepper = (cx, cy, s, rot, op) =>
    `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})" opacity="${op}">
      <path d="M0 -40c26 0 46 22 46 52 0 34-28 66-58 78-30-12-58-44-58-78 0-30 20-52 46-52 8 0 16 3 24 8z"
            fill="#e85d1f"/>
      <path d="M-6 -42c-2-14 6-24 18-26" stroke="#7cae4a" stroke-width="9" fill="none" stroke-linecap="round"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2=".7" y2="1">
      <stop offset="0" stop-color="#1a1512"/>
      <stop offset=".45" stop-color="#241a13"/>
      <stop offset="1" stop-color="#0f0c0a"/>
    </linearGradient>
    <radialGradient id="warm" cx=".72" cy=".34" r=".62">
      <stop offset="0" stop-color="#f4832a" stop-opacity=".34"/>
      <stop offset=".55" stop-color="#a82c08" stop-opacity=".13"/>
      <stop offset="1" stop-color="#a82c08" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cool" cx=".08" cy=".85" r=".55">
      <stop offset="0" stop-color="#2b3a2a" stop-opacity=".3"/>
      <stop offset="1" stop-color="#2b3a2a" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#base)"/>
  <g>
    ${rays}
  </g>
  <g filter="url(#soft)">
    ${pepper(w * 0.14, h * 0.72, 2.1, -22, 0.16)}
    ${pepper(w * 0.3, h * 0.85, 1.5, 14, 0.11)}
    ${pepper(w * 0.87, h * 0.24, 1.8, 34, 0.1)}
    ${pepper(w * 0.62, h * 0.92, 1.3, -8, 0.09)}
  </g>
  <rect width="${w}" height="${h}" fill="url(#warm)"/>
  <rect width="${w}" height="${h}" fill="url(#cool)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity=".16"/>
</svg>
`;
}

/** Hero image: the full lineup standing together. */
function lineupSvg() {
  const n = PRODUCTS.length;
  const gap = 176;
  const w = 240 + gap * (n - 1);
  const h = 760;

  const bottles = PRODUCTS.map((s, i) => {
    const x = i * gap;
    const lift = i % 2 === 0 ? 0 : 26;
    return `  <g transform="translate(${x} ${60 + lift}) scale(0.92)">
    <path d="M100 120v45c0 25-60 50-60 103v332c0 22 18 40 40 40h100c22 0 40-18 40-40V268c0-53-60-78-60-103v-45Z"
          fill="${s.color}" fill-opacity=".92"/>
    <path d="M100 120v45c0 25-60 50-60 103v332c0 22 18 40 40 40h100c22 0 40-18 40-40V268c0-53-60-78-60-103v-45Z"
          fill="none" stroke="#000" stroke-opacity=".4" stroke-width="2.5"/>
    <rect x="52" y="230" width="16" height="380" fill="#fff" opacity=".2" rx="8"/>
    <rect x="93" y="16" width="74" height="108" rx="7" fill="#16130f"/>
    <rect x="46" y="330" width="168" height="200" rx="5" fill="#f6efe3"/>
    <rect x="46" y="330" width="168" height="42" rx="5" fill="${s.color}"/>
    <rect x="46" y="360" width="168" height="12" fill="${s.color}"/>
    <text x="130" y="360" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
          font-size="15" font-weight="700" letter-spacing="4" fill="#fff">NO. ${s.number}</text>
    <text x="130" y="422" text-anchor="middle" font-family="Georgia,serif"
          font-size="21" font-weight="700" fill="#1b1816">${esc(s.nameplain.split(' ')[0])}</text>
    <line x1="76" y1="442" x2="184" y2="442" stroke="#1b1816" stroke-opacity=".25" stroke-width="1.5"/>
    <text x="130" y="466" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
          font-size="12" letter-spacing="2" fill="#5c5348">${esc(s.base.toUpperCase())}</text>
  </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="The full ${
    SITE.name
  } lineup">
  <defs>
    <radialGradient id="floor" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#e85d1f" stop-opacity=".4"/>
      <stop offset="1" stop-color="#e85d1f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${w / 2}" cy="${h - 74}" rx="${w / 2.1}" ry="62" fill="url(#floor)"/>
${bottles}
</svg>
`;
}

/** Brand mark — a flame/pepper hybrid. Replace with the real logo file. */
function logoMarkSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="${esc(SITE.name)} mark">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4832a"/>
      <stop offset=".55" stop-color="#e85d1f"/>
      <stop offset="1" stop-color="#a82c08"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="13" fill="#141210"/>
  <rect x="1" y="1" width="46" height="46" rx="12" fill="none" stroke="#fff" stroke-opacity=".1"/>
  <path d="M24 9c1.6 4.2.6 7-1.6 9.6-2.7 3.2-4.6 5.4-4.6 9.3A10.2 10.2 0 0 0 34.2 28c0-5.3-2.9-8.2-5-11.4-.6 1.9-1.6 3-3 3.8 1.4-4.6.6-8.4-2.2-11.4Z"
        fill="url(#m)"/>
  <path d="M24 24c1.4 2.2 2.2 3.7 2.2 5.3a2.4 2.4 0 0 1-4.8.2c0-1.7 1.1-3.4 2.6-5.5Z" fill="#ffd9a8" opacity=".92"/>
  <path d="M14 34c3.5 3 7 4.4 10 4.4S30.5 37 34 34" fill="none" stroke="#e8a33d" stroke-opacity=".55"
        stroke-width="2" stroke-linecap="round"/>
</svg>
`;
}

/* ==========================================================================
   Product detail page template
   ========================================================================== */

function heatPips(heat, cls = '') {
  return `<span class="heat ${cls}"><span class="heat__pips" role="img" aria-label="Heat ${heat} out of ${HEAT_MAX}">${Array.from(
    { length: HEAT_MAX }
  )
    .map((_, i) => `<span class="heat__pip${i < heat ? ' is-on' : ''}"></span>`)
    .join('')}</span><span class="heat__label">${esc(heatBand(heat).label)} &middot; ${heat}/${HEAT_MAX}</span></span>`;
}

function productPage(s) {
  const pre = '../';
  const band = heatBand(s.heat);
  const idx = PRODUCTS.indexOf(s);
  const prev = PRODUCTS[(idx - 1 + PRODUCTS.length) % PRODUCTS.length];
  const next = PRODUCTS[(idx + 1) % PRODUCTS.length];
  const others = PRODUCTS.filter((x) => x.slug !== s.slug).slice(0, 3);
  const url = `${SITE.url}/sauces/${s.slug}.html`;

  const buyBtn = SITE.shopUrl
    ? `<a class="btn btn--primary btn--lg" href="${SITE.shopUrl}">${esc(SITE.shopLabel)} ${ICON.arrow}</a>`
    : `<a class="btn btn--primary btn--lg" href="${pre}where-to-buy.html">Where to Buy ${ICON.arrow}</a>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: jsonSafe(s.nameplain),
    image: [`${SITE.url}/assets/img/bottles/${s.slug}.svg`],
    description: jsonSafe(s.description),
    brand: { '@type': 'Brand', name: jsonSafe(SITE.name) },
    sku: `HS-${String(s.number).padStart(2, '0')}`,
    category: 'Hot Sauce',
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: SITE.currency,
      price: SITE.defaultPrice,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: jsonSafe(SITE.name) },
    },
  };

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
      { '@type': 'ListItem', position: 2, name: 'The Sauces', item: `${SITE.url}/sauces.html` },
      { '@type': 'ListItem', position: 3, name: jsonSafe(s.nameplain), item: url },
    ],
  };

  const title = `${s.nameplain} — ${band.label} ${s.base} Hot Sauce | ${SITE.name}`;
  const desc = `${s.short} Small-batch ${s.base.toLowerCase()} hot sauce, made by hand in Knoxville, Tennessee.`;

  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${url}" />

<meta property="og:type" content="product" />
<meta property="og:site_name" content="${esc(SITE.name)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE.url}/assets/img/og-default.svg" />
<meta name="twitter:card" content="summary_large_image" />

<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml" />
<link rel="manifest" href="${pre}site.webmanifest" />
<meta name="theme-color" content="#0d0b09" />

<link rel="preload" href="${pre}assets/fonts/fraunces-normal-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="${pre}assets/fonts/inter-normal-latin.woff2" as="font" type="font/woff2" crossorigin />

<link rel="stylesheet" href="${pre}assets/css/fonts.css" />
<link rel="stylesheet" href="${pre}assets/css/tokens.css" />
<link rel="stylesheet" href="${pre}assets/css/base.css" />
<link rel="stylesheet" href="${pre}assets/css/components.css" />

<script type="application/ld+json">${JSON.stringify(schema)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
</head>

<body data-page="sauces" style="--sauce: ${s.color}; --sauce-ink: ${bestInk(s.color)};">
<div class="grain" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>

<!-- @chrome:header -->
<!-- /@chrome:header -->

<main id="main">

  <!-- ===== Product ===== -->
  <section class="section" style="padding-top: calc(var(--header-h) + 3rem);">
    <div class="container">

      <ol class="crumbs">
        <li><a href="${pre}index.html">Home</a></li>
        <li><a href="${pre}sauces.html">The Sauces</a></li>
        <li><span aria-current="page">${esc(s.nameplain)}</span></li>
      </ol>

      <div class="pdp">
        <div class="pdp__media is-placeholder" data-reveal>
          <span class="pdp__badge">NO. ${s.number} / ${HEAT_MAX}</span>
          <img src="${pre}assets/img/bottles/${s.slug}.svg" alt="${esc(s.nameplain)} hot sauce bottle"
               width="260" height="660" />
        </div>

        <div data-reveal>
          ${s.superTag ? `<p class="pdp__super">${esc(s.superTag)}</p>` : ''}
          <h1 class="pdp__title">${esc(s.name)}</h1>
          <p class="pdp__tagline">${esc(s.tagline)}</p>
          <p class="pdp__desc">${esc(s.description)}</p>

          <div class="pdp__buy">
            <div class="pdp__price">
              ${esc(SITE.currencySymbol)}${esc(SITE.defaultPrice)}
              <small>${esc(SITE.defaultSize)} bottle &middot; price placeholder</small>
            </div>
            ${buyBtn}
          </div>

          <dl class="spec">
            <div class="spec__row">
              <dt>Heat</dt>
              <dd>${heatPips(s.heat)}</dd>
            </div>
            <div class="spec__row">
              <dt>Pepper base</dt>
              <dd>${esc(s.base)}</dd>
            </div>
            <div class="spec__row">
              <dt>Peppers</dt>
              <dd><ul class="tags">${s.peppers.map((x) => `<li class="tag">${esc(x)}</li>`).join('')}</ul></dd>
            </div>
            <div class="spec__row">
              <dt>Heat reference</dt>
              <dd>${esc(s.shuNote)}</dd>
            </div>
            <div class="spec__row">
              <dt>Goes well on</dt>
              <dd><ul class="tags">${s.pairings.map((x) => `<li class="tag">${esc(x)}</li>`).join('')}</ul></dd>
            </div>
            <div class="spec__row">
              <dt>Size</dt>
              <dd>${esc(SITE.defaultSize)}</dd>
            </div>
            <div class="spec__row">
              <dt>Made in</dt>
              <dd>${esc(SITE.address.city)}, ${esc(SITE.address.regionName)}</dd>
            </div>
          </dl>

          <p class="form-note" style="margin-top: var(--sp-6);">
            Full ingredient and nutrition panel to be added from the printed label.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== Prev / next ===== -->
  <section class="section--sm" style="border-top: 1px solid var(--line);">
    <div class="container">
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:var(--sp-6); padding-block:var(--sp-8);">
        <a class="link" href="${pre}sauces/${prev.slug}.html">&larr;&nbsp; No. ${prev.number} · ${esc(prev.nameplain)}</a>
        <a class="link" href="${pre}sauces/${next.slug}.html">No. ${next.number} · ${esc(next.nameplain)} &nbsp;&rarr;</a>
      </div>
    </div>
  </section>

  <!-- ===== You might also like ===== -->
  <section class="section section--raised">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Keep going</p>
        <h2>Try these next</h2>
      </div>
      <div class="lineup" data-reveal-group>
${others.map((o) => cardHtml(o, pre)).join('\n')}
      </div>
    </div>
  </section>

</main>

<!-- @chrome:footer -->
<!-- /@chrome:footer -->

<script src="${pre}assets/js/main.js" defer></script>
</body>
</html>
`;
}

/** Product card — used on the home page, lineup page and related rails. */
function cardHtml(s, pre) {
  return `        <article class="card" data-heat="${s.heat}" data-reveal
                 style="--sauce: ${s.color}; --sauce-ink: ${bestInk(s.color)};">
          <div class="card__media">
            <span class="card__num">NO. ${s.number}</span>
            ${s.bestseller ? '<span class="card__flag">Bestseller</span>' : ''}
            ${s.originStory && !s.bestseller ? '<span class="card__flag">Original</span>' : ''}
            <img src="${pre}assets/img/bottles/${s.slug}.svg" alt="${esc(s.nameplain)} hot sauce bottle"
                 width="260" height="660" loading="lazy" />
          </div>
          <div class="card__body">
            <h3 class="card__name"><a href="${pre}sauces/${s.slug}.html">${esc(s.name)}</a></h3>
            ${heatPips(s.heat, 'heat--sm')}
            <p class="card__desc">${esc(s.short)}</p>
            <div class="card__foot">
              <span class="card__price">${esc(SITE.currencySymbol)}${esc(SITE.defaultPrice)} <span>/ ${esc(
                SITE.defaultSize
              )}</span></span>
              <span class="link">View ${ICON.arrow}</span>
            </div>
          </div>
        </article>`;
}

/* ==========================================================================
   Generated content blocks
   Anything the catalog drives lives here, so adding a sauce to products.js
   updates every page that shows one.
   ========================================================================== */

/** The full six-card grid. */
function renderLineup(pre) {
  return '\n' + PRODUCTS.map((s) => cardHtml(s, pre)).join('\n') + '\n      ';
}

/** The 1–10 heat index: every slot, filled or waiting. */
function renderScale(pre) {
  const bySlot = new Map(PRODUCTS.map((s) => [s.heat, s]));

  const ticks = Array.from({ length: HEAT_MAX })
    .map(
      (_, i) =>
        `<span class="scale__tick${bySlot.has(i + 1) ? ' is-filled' : ''}">${i + 1}</span>`
    )
    .join('\n            ');

  const rows = Array.from({ length: HEAT_MAX })
    .map((_, i) => {
      const n = i + 1;
      const s = bySlot.get(n);
      const band = heatBand(n);

      if (!s) {
        return `          <div class="scale-row scale-row--empty">
            <span class="scale-row__num">${n}</span>
            <div class="scale-row__body">
              <span class="scale-row__name">Open slot</span>
              <span class="scale-row__note">${esc(band.label)} — nothing here yet.</span>
            </div>
          </div>`;
      }

      return `          <a class="scale-row" href="${pre}sauces/${s.slug}.html" style="--sauce: ${s.color};">
            <span class="scale-row__num">${n}</span>
            <div class="scale-row__body">
              <span class="scale-row__name">${esc(s.name)}</span>
              <span class="scale-row__note">${esc(band.label)} &middot; ${esc(s.base)} base &middot; ${esc(
                s.shuNote
              )}</span>
            </div>
          </a>`;
    })
    .join('\n');

  return `
        <div class="scale">
          <div class="scale__bar" role="img" aria-label="Heat gradient from mild to extreme"></div>
          <div class="scale__ticks">
            ${ticks}
          </div>
        </div>

        <div class="scale-list">
${rows}
        </div>
      `;
}

/* ==========================================================================
   Chrome injection
   ========================================================================== */

async function htmlFiles(dir = ROOT, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'tools', 'assets', 'docs'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await htmlFiles(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function replaceBlock(html, marker, content) {
  const re = new RegExp(
    `<!-- @chrome:${marker} -->[\\s\\S]*?<!-- /@chrome:${marker} -->`,
    'g'
  );
  return html.replace(re, `<!-- @chrome:${marker} -->${content}\n<!-- /@chrome:${marker} -->`);
}

async function injectChrome(files) {
  let touched = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let html = await readFile(file, 'utf8');
    if (!html.includes('@chrome:header') && !html.includes('@chrome:footer')) continue;

    const pre = prefixFor(rel);
    const active = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || '';
    const solid = !/data-page="home"/.test(html);

    const before = html;
    html = replaceBlock(html, 'header', renderHeader(pre, active, solid));
    html = replaceBlock(html, 'footer', renderFooter(pre));
    html = replaceBlock(html, 'lineup', renderLineup(pre));
    html = replaceBlock(html, 'scale', renderScale(pre));

    // Point every form at the configured endpoint (or back to '#', which
    // makes main.js tell the visitor the form is not connected yet).
    html = html.replace(
      /(<form\b[^>]*\bdata-form\b[^>]*\baction=")[^"]*(")/g,
      `$1${SITE.formEndpoint || '#'}$2`
    );

    if (html !== before) {
      await writeFile(file, html);
      touched++;
    }
  }

  return touched;
}

/* ==========================================================================
   Sitemap
   ========================================================================== */

async function writeSitemap(files) {
  const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);

  const urls = files
    .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
    .filter((f) => !f.startsWith('404'))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .map((f) => {
      const loc = f === 'index.html' ? `${SITE.url}/` : `${SITE.url}/${f}`;
      const priority = f === 'index.html' ? '1.0' : f.startsWith('sauces') ? '0.9' : '0.7';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  await writeFile(
    p('sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
}

/* ==========================================================================
   Run
   ========================================================================== */

async function main() {
  const only = process.argv[2];

  /* --- artwork --------------------------------------------------------- */
  if (!only || only === 'art') {
    await mkdir(p('assets/img/bottles'), { recursive: true });
    await mkdir(p('assets/img/photos'), { recursive: true });

    for (const s of PRODUCTS) {
      await writeFile(p('assets/img/bottles', `${s.slug}.svg`), bottleSvg(s));
    }
    await writeFile(p('assets/img/lineup.svg'), lineupSvg());
    await writeFile(p('assets/img/logo-mark.svg'), logoMarkSvg());
    await writeFile(p('favicon.svg'), logoMarkSvg());

    await writeFile(p('assets/img/photos/hero-backdrop.svg'), heroBackdropSvg());

    const photos = [
      ['story-founders', 1400, 1050, 'Founders portrait', 'The people behind the sauce, in the kitchen'],
      ['story-peppers', 1200, 1500, 'Fresh peppers', 'Crates of serrano, habanero, jalapeño'],
      ['process-blend', 1200, 900, 'Blending', 'Pot on the stove, steam, hands stirring'],
      ['process-bottle', 1200, 900, 'Bottling', 'Filling and capping the line by hand'],
      ['market-booth', 1600, 1000, 'Market booth', 'Your table at a Knoxville market'],
      ['recipe-wings', 1200, 900, 'Recipe photo', 'Wings tossed in Zaxe'],
      ['recipe-tacos', 1200, 900, 'Recipe photo', 'Tacos with Mellow Verda'],
      ['recipe-boil', 1200, 900, 'Recipe photo', 'Shrimp boil with Ragin Cajun'],
      ['og-default', 1200, 630, `${SITE.name}`, 'Social share image — 1200 × 630'],
    ];

    for (const [name, w, h, title, note] of photos) {
      const out = name === 'og-default' ? p('assets/img/og-default.svg') : p('assets/img/photos', `${name}.svg`);
      await writeFile(out, photoSvg({ w, h, title, note }));
    }

    console.log(`✓ artwork  — ${PRODUCTS.length} bottles, ${photos.length} photo slots, 1 lineup, 1 mark`);
  }

  /* --- product pages ---------------------------------------------------- */
  if (!only || only === 'pages') {
    await mkdir(p('sauces'), { recursive: true });
    for (const s of PRODUCTS) {
      await writeFile(p('sauces', `${s.slug}.html`), productPage(s));
    }
    console.log(`✓ pages    — ${PRODUCTS.length} product pages`);
  }

  /* --- chrome + sitemap ------------------------------------------------- */
  const files = await htmlFiles();
  if (!only || only === 'chrome') {
    const n = await injectChrome(files);
    console.log(`✓ chrome   — header/footer synced into ${n} of ${files.length} pages`);
  }
  if (!only || only === 'sitemap') {
    await writeSitemap(files);
    console.log(`✓ sitemap  — ${files.length} urls`);
  }

  if (!existsSync(p('index.html'))) {
    console.warn('! index.html not found — run this from the project root');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { cardHtml, heatPips, ICON };
