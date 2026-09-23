(function () {
  'use strict';


  function isArabic() {
    return (document.documentElement.lang || '').toLowerCase().indexOf('ar') === 0 ||
           (document.documentElement.dir || '').toLowerCase() === 'rtl';
  }


  function overlay() {
    var el = document.querySelector('.demo-mobile-overlay');
    if (!el && document.body) {
      el = document.createElement('div');
      el.className = 'demo-mobile-overlay';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function setFallbackMenu(open) {
    var drawer = document.getElementById('slide-out');
    if (!drawer) return;
    drawer.classList.toggle('demo-mobile-menu-open', !!open);
    var o = overlay();
    if (o) o.classList.toggle('is-open', !!open);
    var trigger = document.getElementById('mobileMenu');
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeAppBanner(target) {
    var close = target.closest && target.closest('.TaminatyMessage .remove-icon');
    if (!close) return false;
    var banner = close.closest('.TaminatyMessage');
    if (banner) banner.style.setProperty('display', 'none', 'important');
    return true;
  }

  function toggleMobileSubmenu(target) {
    var trigger = target.closest && target.closest('.mobileHasSub');
    if (!trigger || window.matchMedia('(min-width: 993px)').matches) return false;
    var menu = trigger.nextElementSibling;
    if (!menu || menu.tagName !== 'UL') return false;
    var open = menu.getAttribute('data-demo-open') === '1';
    menu.setAttribute('data-demo-open', open ? '0' : '1');
    menu.style.display = open ? 'none' : 'block';
    trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
    return true;
  }

  /* Fallbacks only for controls that were inert in the static capture. Angular
     can still handle the rest of the interface normally. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (closeAppBanner(t)) {
      e.preventDefault();
      return;
    }

    if (t.closest('.closeMobileMenu') || t.closest('.demo-mobile-overlay')) {
      e.preventDefault();
      setFallbackMenu(false);
      return;
    }

    if (t.closest('#mobileMenu') && window.matchMedia('(max-width: 992px)').matches) {
      /* Let Angular/Materialize run first. If it did not visibly open the
         drawer, the fallback class guarantees that the control still works. */
      setTimeout(function () {
        var drawer = document.getElementById('slide-out');
        if (!drawer) return;
        var style = window.getComputedStyle(drawer);
        var matrix = style.transform || '';
        var apparentlyClosed = style.display === 'none' || /matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*[+-]?\d{2,}/.test(matrix);
        if (apparentlyClosed) setFallbackMenu(true);
      }, 50);
      return;
    }

    if (toggleMobileSubmenu(t)) {
      e.preventDefault();
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setFallbackMenu(false);
  });

  
})();
