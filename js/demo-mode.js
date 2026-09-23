(function () {
  'use strict';

  var OPEN_CLASS = 'demo-mobile-menu-open';

  function isMobile() {
    return window.matchMedia('(max-width: 992px)').matches;
  }

  function drawer() {
    return document.getElementById('slide-out');
  }

  function overlay(create) {
    var el = document.querySelector('.sidenav-overlay[data-local-mobile-overlay="1"]');
    if (!el && create && document.body) {
      el = document.createElement('div');
      el.className = 'sidenav-overlay';
      el.setAttribute('data-local-mobile-overlay', '1');
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function closeSubmenus() {
    var d = drawer();
    if (!d) return;
    Array.prototype.forEach.call(d.querySelectorAll('li > a + ul, li > span + ul'), function (ul) {
      var trigger = ul.previousElementSibling;
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (ul.getAttribute('data-local-language-list') === '1') {
        ul.remove();
        return;
      }
      ul.style.display = 'none';
      ul.removeAttribute('data-demo-open');
    });
  }

  function setOpen(open) {
    var d = drawer();
    if (!d) return;
    open = !!open && isMobile();

    d.classList.toggle(OPEN_CLASS, open);
    d.setAttribute('aria-hidden', open ? 'false' : 'true');

    var o = overlay(open);
    if (o) {
      o.classList.toggle('is-open', open);
      o.style.display = open ? 'block' : 'none';
      o.style.opacity = open ? '1' : '0';
    }

    var trigger = document.getElementById('mobileMenu');
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');

    var header = document.querySelector('header');
    if (header) header.classList.toggle('headerStyle', open);

    if (document.body) {
      if (open) {
        if (!document.body.hasAttribute('data-local-prev-overflow'))
          document.body.setAttribute('data-local-prev-overflow', document.body.style.overflow || '');
        document.body.style.overflow = 'hidden';
      } else if (!document.getElementById('loginPopUpBtns')) {
        var prev = document.body.getAttribute('data-local-prev-overflow');
        document.body.style.overflow = prev || '';
        document.body.removeAttribute('data-local-prev-overflow');
      }
    }

    if (!open) closeSubmenus();
  }

  function toggleSubmenu(target) {
    var trigger = target && target.closest ? target.closest('.mobileHasSub') : null;
    if (!trigger || !isMobile()) return false;
    var d = drawer();
    if (!d || !d.contains(trigger)) return false;
    var menu = trigger.nextElementSibling;
    if (!menu || menu.tagName !== 'UL') return false;

    var wasOpen = window.getComputedStyle(menu).display === 'block';
    Array.prototype.forEach.call(d.querySelectorAll('li > span + ul'), function (ul) {
      ul.style.display = 'none';
      ul.removeAttribute('data-demo-open');
      var prev = ul.previousElementSibling;
      if (prev) prev.setAttribute('aria-expanded', 'false');
    });

    if (!wasOpen) {
      menu.style.display = 'block';
      menu.setAttribute('data-demo-open', '1');
      trigger.setAttribute('aria-expanded', 'true');
    }
    return true;
  }

  function initDrawer() {
    var d = drawer();
    if (!d) return;
    d.setAttribute('aria-hidden', 'true');
    closeSubmenus();

    var trigger = document.getElementById('mobileMenu');
    if (trigger) {
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-controls', 'slide-out');
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var bannerClose = t.closest('.TaminatyMessage .remove-icon');
    if (bannerClose) {
      var banner = bannerClose.closest('.TaminatyMessage');
      if (banner) banner.style.setProperty('display', 'none', 'important');
      return;
    }

    if (t.closest('#mobileMenu') && isMobile()) {
      e.preventDefault();
      e.stopPropagation();
      var d = drawer();
      setOpen(!(d && d.classList.contains(OPEN_CLASS)));
      return;
    }

    if (t.closest('.closeMobileMenu') || t.closest('.sidenav-overlay[data-local-mobile-overlay="1"]')) {
      e.preventDefault();
      setOpen(false);
      return;
    }

    var d = drawer();
    if (d && d.contains(t)) {
      var childLink = t.closest('a');
      if (childLink && childLink.closest('ul') && childLink.closest('ul').parentElement !== d &&
          !childLink.classList.contains('mobileHasSub')) {
        setOpen(false);
        return;
      }

      if (toggleSubmenu(t)) {
        e.preventDefault();
        return;
      }
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'mobileMenu') {
      e.preventDefault();
      var d = drawer();
      setOpen(!(d && d.classList.contains(OPEN_CLASS)));
    }
  });

  var touchStartX = null;
  var touchMode = '';
  document.addEventListener('touchstart', function (e) {
    if (!isMobile() || !e.touches || e.touches.length !== 1) return;
    var d = drawer();
    if (!d) return;
    var x = e.touches[0].clientX;
    if (d.classList.contains(OPEN_CLASS) && d.contains(e.target)) {
      touchStartX = x;
      touchMode = 'close';
    } else if (!d.classList.contains(OPEN_CLASS) && x >= window.innerWidth - 24) {
      touchStartX = x;
      touchMode = 'open';
    }
  }, {passive:true});

  document.addEventListener('touchend', function (e) {
    if (touchStartX == null || !touchMode || !e.changedTouches || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (touchMode === 'close' && dx > 55) setOpen(false);
    if (touchMode === 'open' && dx < -55) setOpen(true);
    touchStartX = null;
    touchMode = '';
  }, {passive:true});

  window.addEventListener('resize', function () {
    if (!isMobile()) setOpen(false);
  }, {passive:true});

  window.GosiLocalMobileNav = {
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () {
      var d = drawer();
      setOpen(!(d && d.classList.contains(OPEN_CLASS)));
    },
    closeSubmenus: closeSubmenus
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDrawer, {once:true});
  else initDrawer();
})();
