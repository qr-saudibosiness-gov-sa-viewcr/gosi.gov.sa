(function () {
  'use strict';

  function isMobileLayout() {
    return window.matchMedia('(max-width: 992px)').matches;
  }

  function drawer() {
    return document.getElementById('slide-out');
  }

  function jq() {
    return window.jQuery || window.$ || null;
  }

  function removeLocalLanguageList() {
    var list = document.querySelector('#langsList[data-local-language-list="1"]');
    if (list) list.remove();
    var trigger = document.querySelector('#slide-out li.language .mobileHasSub');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  /* This is the same submenu rule used by the compiled Header component:
     only one span.mobileHasSub submenu is open at a time. */
  function toggleSubmenu(trigger) {
    if (!trigger || !isMobileLayout()) return false;
    if (trigger.closest('li.language')) return false; // handled by the language state

    var d = drawer();
    if (!d || !d.contains(trigger)) return false;
    var menu = trigger.nextElementSibling;
    if (!menu || menu.tagName !== 'UL') return false;

    var open = window.getComputedStyle(menu).display === 'block';
    Array.prototype.forEach.call(d.querySelectorAll('li > span.mobileHasSub + ul'), function (ul) {
      ul.style.display = 'none';
      var prev = ul.previousElementSibling;
      if (prev) prev.setAttribute('aria-expanded', 'false');
    });

    if (!open) {
      menu.style.display = 'block';
      trigger.setAttribute('aria-expanded', 'true');
    }
    return true;
  }

  function resetDrawerTop() {
    var d = drawer();
    if (!d) return;

    /* The captured DOM already contains these four original Angular blocks.
       Never allow a previous internal drawer scroll position or a stale
       inline display rule to make the drawer start from websiteControls. */
    var fixedTop = d.querySelectorAll(':scope > .topLiMobileMenu, :scope > .mobileMainLinks, :scope > .websiteControls, :scope > .language');
    Array.prototype.forEach.call(fixedTop, function (el) {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
    });

    d.scrollTop = 0;
    window.requestAnimationFrame(function () { d.scrollTop = 0; });
  }

  function nativeCloseSubmenus() {
    var d = drawer();
    if (!d) return;
    Array.prototype.forEach.call(d.querySelectorAll('li > a.mobileHasSub + ul, li > span.mobileHasSub + ul'), function (ul) {
      ul.style.display = 'none';
      var prev = ul.previousElementSibling;
      if (prev) prev.setAttribute('aria-expanded', 'false');
    });
    removeLocalLanguageList();
  }

  var usingNativeSidenav = false;

  function initNativeSidenav() {
    var $ = jq();
    var d = drawer();
    if (!d || !$ || !$.fn || typeof $.fn.sidenav !== 'function') return false;

    try {
      /* Recreate exactly the options used by Header.MobileSideNav() in the
         bundled Angular main file instead of imitating Materialize. */
      try {
        var old = window.M && window.M.Sidenav && window.M.Sidenav.getInstance ? window.M.Sidenav.getInstance(d) : null;
        if (old && typeof old.destroy === 'function') old.destroy();
      } catch (_) {}

      $('.sidenav').sidenav({
        edge: 'right',
        closeOnClick: false,
        draggable: true,
        onOpen: function () {
          $('header').addClass('headerStyle');
          resetDrawerTop();
        },
        onClose: function () {
          $('header').removeClass('headerStyle');
          $('.sidenav li > a').next('ul').slideUp();
          $('.sidenav li > span').next('ul').slideUp();
          window.setTimeout(function () {
            removeLocalLanguageList();
            resetDrawerTop();
          }, 310);
        }
      });

      $('a.mobileHasSub + ul>li>a, span.mobileHasSub + ul>li>a')
        .off('click.gosiLocalNative')
        .on('click.gosiLocalNative', function () { $('.sidenav').sidenav('close'); });

      d.setAttribute('aria-hidden', 'true');
      var trigger = document.getElementById('mobileMenu');
      if (trigger) {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('aria-controls', 'slide-out');
      }

      usingNativeSidenav = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  /* Fallback is only used if the bundled Materialize plugin cannot initialize.
     It is deliberately isolated behind a class so it cannot override the
     native sidenav's transform/width/gesture behavior. */
  function fallbackSetOpen(open) {
    var d = drawer();
    if (!d) return;
    open = !!open && isMobileLayout();
    d.classList.add('local-sidenav-fallback');
    d.classList.toggle('demo-mobile-menu-open', open);
    d.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.querySelector('header')?.classList.toggle('headerStyle', open);
    document.body.classList.toggle('bodyHideScroll', open);
    if (open) resetDrawerTop();
    else nativeCloseSubmenus();
  }

  function openDrawer() {
    var $ = jq();
    if (usingNativeSidenav && $) {
      resetDrawerTop();
      $('.sidenav').sidenav('open');
    } else fallbackSetOpen(true);
  }

  function closeDrawer() {
    var $ = jq();
    if (usingNativeSidenav && $) $('.sidenav').sidenav('close');
    else fallbackSetOpen(false);
  }

  function init() {
    var d = drawer();
    if (!d) return;
    nativeCloseSubmenus();
    resetDrawerTop();
    if (!initNativeSidenav()) {
      d.classList.add('local-sidenav-fallback');
      d.setAttribute('aria-hidden', 'true');
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest('.TaminatyMessage .remove-icon')) {
      var banner = t.closest('.TaminatyMessage');
      if (banner) banner.style.setProperty('display', 'none', 'important');
      return;
    }

    /* Materialize handles #mobileMenu itself when available. Only intercept
       it in fallback mode. */
    if (!usingNativeSidenav && t.closest('#mobileMenu') && isMobileLayout()) {
      e.preventDefault();
      var d = drawer();
      fallbackSetOpen(!(d && d.classList.contains('demo-mobile-menu-open')));
      return;
    }

    if (t.closest('.closeMobileMenu')) {
      e.preventDefault();
      closeDrawer();
      return;
    }

    var d = drawer();
    if (d && d.contains(t)) {
      var spanTrigger = t.closest('span.mobileHasSub');
      if (spanTrigger && toggleSubmenu(spanTrigger)) {
        e.preventDefault();
        return;
      }
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer()) closeDrawer();
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'mobileMenu' && !usingNativeSidenav) {
      e.preventDefault();
      var d = drawer();
      fallbackSetOpen(!(d && d.classList.contains('demo-mobile-menu-open')));
    }
  });

  window.addEventListener('resize', function () {
    if (!isMobileLayout()) closeDrawer();
  }, {passive:true});

  window.GosiLocalMobileNav = {
    open: openDrawer,
    close: closeDrawer,
    toggle: function () {
      var d = drawer();
      if (!d) return;
      if (usingNativeSidenav && window.M && window.M.Sidenav) {
        var inst = window.M.Sidenav.getInstance(d);
        if (inst && inst.isOpen) closeDrawer(); else openDrawer();
      } else {
        fallbackSetOpen(!d.classList.contains('demo-mobile-menu-open'));
      }
    },
    closeSubmenus: nativeCloseSubmenus,
    resetTop: resetDrawerTop
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
