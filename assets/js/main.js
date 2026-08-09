/* ==========================================================================
   MAIN — progressive enhancement only.
   Every feature here is additive: with JS disabled the site still renders,
   navigates, and submits. Nothing below is required to read the content.
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Mark that JS is available (base.css uses .no-js as the fallback) -- */
  document.documentElement.classList.remove('no-js');

  /* ======================================================================
     Header: add a solid background once the page scrolls off the hero.
     ====================================================================== */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;

    // Interior pages declare .is-solid up front — leave those alone.
    if (header.classList.contains('is-solid')) return;

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel);

    new IntersectionObserver(
      function (entries) {
        header.classList.toggle('is-stuck', !entries[0].isIntersecting);
      },
      { rootMargin: '-8px 0px 0px 0px' }
    ).observe(sentinel);
  }

  /* ======================================================================
     Mobile menu: focus trap, Escape to close, scroll lock.
     ====================================================================== */
  function initMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-menu]');
    if (!toggle || !menu) return;

    var lastFocused = null;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('is-locked', open);

      if (open) {
        lastFocused = document.activeElement;
        // The panel is visibility:hidden until .is-open lands, and a hidden
        // element cannot take focus. Reading a layout property forces the new
        // style to apply now, so the focus call below always sticks.
        void menu.offsetHeight;
        var first = menu.querySelector('a, button');
        if (first) first.focus({ preventScroll: true });
      } else if (lastFocused) {
        lastFocused.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
    });

    // Keep Tab inside the panel while it is open.
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = menu.querySelectorAll('a[href], button:not([disabled])');
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // Reset when resizing up to the desktop breakpoint.
    window.matchMedia('(min-width: 62em)').addEventListener('change', function (mq) {
      if (mq.matches && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  /* ======================================================================
     Scroll reveal — one observer for the whole page, unobserve after firing.
     ====================================================================== */
  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    // Stagger children of any [data-reveal-group] so rows cascade in.
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.hasAttribute('data-reveal')) {
          child.style.setProperty('--reveal-delay', Math.min(i, 8) * 70 + 'ms');
        }
      });
    });

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ======================================================================
     Stat count-up.
     ====================================================================== */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = el.dataset.count + (el.dataset.suffix || '');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          io.unobserve(el);

          var target = parseFloat(el.dataset.count);
          var suffix = el.dataset.suffix || '';
          var start = performance.now();
          var dur = 1400;

          function tick(now) {
            var p = Math.min((now - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString() + suffix;
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ======================================================================
     Lineup filter — filters by heat band, updates the live count.
     ====================================================================== */
  function initFilters() {
    var bar = document.querySelector('[data-filters]');
    var grid = document.querySelector('[data-lineup]');
    if (!bar || !grid) return;

    var chips = bar.querySelectorAll('[data-filter]');
    var cards = grid.querySelectorAll('[data-heat]');
    var count = document.querySelector('[data-filter-count]');

    function apply(value) {
      var shown = 0;

      cards.forEach(function (card) {
        var heat = parseInt(card.dataset.heat, 10);
        var match =
          value === 'all' ||
          (value === 'mild' && heat <= 2) ||
          (value === 'medium' && heat >= 3 && heat <= 6) ||
          (value === 'hot' && heat >= 7);

        card.hidden = !match;
        if (match) shown++;
      });

      chips.forEach(function (chip) {
        chip.setAttribute('aria-pressed', String(chip.dataset.filter === value));
      });

      if (count) {
        count.textContent = shown + (shown === 1 ? ' sauce' : ' sauces');
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        apply(chip.dataset.filter);
      });
    });

    apply('all');
  }

  /* ======================================================================
     Accordion — one open at a time is NOT enforced; users can compare.
     ====================================================================== */
  function initAccordions() {
    document.querySelectorAll('[data-accordion] .accordion__trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  /* ======================================================================
     Forms — client-side validation, then POST to the configured endpoint.
     With no endpoint set the form explains what is missing instead of
     silently pretending to send.
     ====================================================================== */
  function initForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var status = form.querySelector('[data-form-status]');
      var endpoint = form.getAttribute('action');
      var configured = endpoint && endpoint.indexOf('http') === 0;

      function say(msg, state) {
        if (!status) return;
        status.hidden = false;
        status.textContent = msg;
        status.setAttribute('data-state', state);
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Clear previous field errors.
        form.querySelectorAll('.field__error').forEach(function (el) {
          el.textContent = '';
        });

        var invalid = null;
        form.querySelectorAll('[required]').forEach(function (input) {
          if (input.checkValidity()) return;
          var msg = form.querySelector('#' + input.id + '-error');
          if (msg) msg.textContent = input.validationMessage;
          if (!invalid) invalid = input;
        });

        if (invalid) {
          invalid.focus();
          say('Please fix the highlighted fields and try again.', 'error');
          return;
        }

        if (!configured) {
          say(
            'Form endpoint not connected yet. Add your Formspree/Basin URL to ' +
              'SITE.formEndpoint in assets/js/site.config.js to start receiving these.',
            'error'
          );
          return;
        }

        var btn = form.querySelector('[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.dataset.label = btn.textContent;
          btn.textContent = 'Sending…';
        }

        fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Request failed');
            form.reset();
            say('Thanks — your message is on its way. We reply within one business day.', 'ok');
          })
          .catch(function () {
            say('Something went wrong. Please email us directly and we will pick it up.', 'error');
          })
          .finally(function () {
            if (btn) {
              btn.disabled = false;
              btn.textContent = btn.dataset.label;
            }
          });
      });
    });
  }

  /* ======================================================================
     Hero parallax — cheap transform-only drift, disabled for reduced motion.
     ====================================================================== */
  function initParallax() {
    var layers = document.querySelectorAll('[data-parallax]');
    if (!layers.length || reduceMotion) return;

    var ticking = false;

    function update() {
      var y = window.scrollY;
      layers.forEach(function (el) {
        var speed = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = 'translate3d(0,' + y * speed + 'px,0)';
      });
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* ======================================================================
     Footer year.
     ====================================================================== */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- Boot ------------------------------------------------------------- */
  function boot() {
    initHeader();
    initMenu();
    initReveal();
    initCounters();
    initFilters();
    initAccordions();
    initForms();
    initParallax();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
