/**
 * GOSI Chat Widget Loader
 * This script automatically loads and initializes the GOSI chat widget
 *
 * Usage:
 * <script src="https://your-cdn.com/gosi-widget-loader.js"></script>
 */

(function () {
  "use strict";

  // Configuration - will be set based on script location
  const scriptElement =
    document.currentScript ||
    document.querySelector('script[src*="gosi-widget-loader"]');
  const scriptSrc = scriptElement ? scriptElement.src : "";
  const BASE_URL =
    scriptSrc.substring(0, scriptSrc.lastIndexOf("/")) ||
    window.location.origin;

  console.log("[GOSI Widget] Initializing from:", BASE_URL);

  // ✅ CRITICAL: Set global base URL for widget to use for assets
  window.GOSI_WIDGET_BASE_URL = BASE_URL;

  // Prevent multiple initializations
  if (window.__GOSI_WIDGET_LOADED__) {
    console.warn("[GOSI Widget] Already loaded, skipping initialization");
    return;
  }
  window.__GOSI_WIDGET_LOADED__ = true;

  /**
   * Load CSS stylesheet
   */
  function loadStyles() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = BASE_URL + "/styles.css";
    link.onerror = function () {
      console.error("[GOSI Widget] Failed to load styles.css");
    };
    document.head.appendChild(link);
    console.log("[GOSI Widget] Loading styles.css");
  }

  /**
   * Load JavaScript module
   */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = src;
      script.onload = function () {
        console.log("[GOSI Widget] Loaded:", src);
        resolve();
      };
      script.onerror = function (err) {
        console.error("[GOSI Widget] Failed to load:", src);
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Insert widget element into DOM
   */
  function insertWidget() {
    // Check if widget already exists
    if (document.querySelector("gosi-chat-widget")) {
      console.log("[GOSI Widget] Element already exists in DOM");
      return;
    }

    // Create and insert widget element
    const widget = document.createElement("gosi-chat-widget");
    document.body.appendChild(widget);
    console.log("[GOSI Widget] Element inserted into DOM");
  }

  /**
   * Initialize the widget
   */
  function init() {
    console.log("[GOSI Widget] Starting initialization...");

    // Load styles immediately
    loadStyles();

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadWidgetScripts);
    } else {
      loadWidgetScripts();
    }
  }

  /**
   * Load eGain library (if needed)
   */
  function loadEgainLibrary() {
    return new Promise(function (resolve) {
      const script = document.createElement("script");
      script.src = BASE_URL + "/assets/js/egain-client-library.0.1.33.js"; // ✅ Correct path: js folder, not img
      script.onload = function () {
        console.log("[GOSI Widget] ✅ eGain library loaded");
        resolve();
      };
      script.onerror = function () {
        console.warn(
          "[GOSI Widget] ⚠️ eGain library failed to load (optional)"
        );
        resolve(); // Don't fail if eGain doesn't load
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load widget scripts and insert element
   */
  function loadWidgetScripts() {
    // Insert widget element first
    insertWidget();

    // Load eGain library first (before Angular)
    console.log("[GOSI Widget] Loading eGain library...");
    loadEgainLibrary()
      .then(function () {
        // Load Angular polyfills
        console.log("[GOSI Widget] Loading polyfills.js...");
        return loadScript(BASE_URL + "/polyfills.js");
      })
      .then(function () {
        console.log("[GOSI Widget] Loading main.js...");
        return loadScript(BASE_URL + "/main.js");
      })
      .then(function () {
        console.log("[GOSI Widget] Waiting for custom element registration...");
        return customElements.whenDefined("gosi-chat-widget");
      })
      .then(function () {
        console.log("[GOSI Widget] ✅ Successfully loaded and initialized!");

        // Trigger custom event for client applications
        const event = new CustomEvent("gosi-widget-ready", {
          detail: { version: "1.0.0" },
        });
        window.dispatchEvent(event);
      })
      .catch(function (err) {
        console.error("[GOSI Widget] ❌ Failed to initialize:", err);
      });
  }

  // Start initialization
  init();
})();
