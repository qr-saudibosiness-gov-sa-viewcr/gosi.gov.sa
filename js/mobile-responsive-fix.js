(function () {
  'use strict';

  function isMobile() {
    return window.matchMedia('(max-width: 992px)').matches;
  }

  function drawer() {
    return document.getElementById('slide-out');
  }

  function overlay() {
    var el = document.querySelector('.responsive-menu-overlay');
    if (!el) {
      el = document.createElement('div');
      el.className = 'responsive-menu-overlay';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function setOpen(open) {
    var menu = drawer();
    if (!menu) return;
    var shade = overlay();
    menu.classList.toggle('responsive-menu-open', open);
    shade.classList.toggle('is-open', open);
    document.body.classList.toggle('responsive-menu-lock', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    var trigger = document.getElementById('mobileMenu');
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('click', function (e) {
    if (!isMobile()) return;

    var trigger = e.target.closest && e.target.closest('#mobileMenu');
    if (trigger) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var menu = drawer();
      setOpen(!(menu && menu.classList.contains('responsive-menu-open')));
      return;
    }

    if ((e.target.closest && e.target.closest('.closeMobileMenu')) ||
        (e.target.classList && e.target.classList.contains('responsive-menu-overlay'))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (!isMobile()) setOpen(false);
  });
})();
