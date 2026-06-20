(() => {
  "use strict";

  const VERSION = "kaly-memberlist-loader-1.0.0";
  const SCRIPT_URL = "/kaly-fluxer-memberlist.js?v=24";
  const SCRIPT_ID = "kaly-fluxer-memberlist-runtime-script";

  if (window.__KALY_MEMBERLIST_EXTERNAL_LOADER__?.stop) {
    try {
      window.__KALY_MEMBERLIST_EXTERNAL_LOADER__.stop();
    } catch (_) {}
  }

  const controller = new AbortController();
  let loaded = false;

  function log(...args) {
    console.log("[KalyMemberListLoader]", ...args);
  }

  function removeOldRuntimeScripts() {
    document
      .querySelectorAll('script[data-kaly-memberlist-runtime="1"], script[src*="/kaly-fluxer-memberlist.js"]')
      .forEach((script) => {
        if (script.id === SCRIPT_ID) return;
        script.remove();
      });
  }

  function stopOldRuntime() {
    try {
      if (window.KalyFluxerMemberListFix?.stop) {
        window.KalyFluxerMemberListFix.stop();
      }
    } catch (error) {
      console.warn("[KalyMemberListLoader] stop ancien runtime KO :", error);
    }
  }

  function loadRuntime() {
    if (loaded || controller.signal.aborted) return;
    loaded = true;

    removeOldRuntimeScripts();
    stopOldRuntime();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = false;
    script.defer = false;
    script.dataset.kalyMemberlistRuntime = "1";

    script.onload = () => {
      log("runtime chargé", SCRIPT_URL);

      setTimeout(() => {
        try {
          if (window.KalyFluxerMemberListFix?.refresh) {
            window.KalyFluxerMemberListFix.refresh("external-loader");
          }
        } catch (error) {
          console.warn("[KalyMemberListLoader] refresh post-load KO :", error);
        }
      }, 800);
    };

    script.onerror = () => {
      loaded = false;
      console.error("[KalyMemberListLoader] impossible de charger", SCRIPT_URL);
    };

    document.head.appendChild(script);
  }

  function waitThenLoad() {
    const start = Date.now();

    const timer = setInterval(() => {
      if (controller.signal.aborted) {
        clearInterval(timer);
        return;
      }

      const hasBody = Boolean(document.body);
      const appLooksMounted = Boolean(
        document.querySelector("#root, #app, [data-reactroot], main, [role='main']")
      );
      const waitedEnough = Date.now() - start >= 2500;

      if (hasBody && (appLooksMounted || waitedEnough)) {
        clearInterval(timer);
        loadRuntime();
      }
    }, 100);
  }

  if (document.readyState === "complete") {
    setTimeout(waitThenLoad, 800);
  } else {
    window.addEventListener("load", () => {
      setTimeout(waitThenLoad, 800);
    }, { once: true, signal: controller.signal });
  }

  window.__KALY_MEMBERLIST_EXTERNAL_LOADER__ = {
    version: VERSION,
    loadNow: loadRuntime,
    stop() {
      controller.abort();
      delete window.__KALY_MEMBERLIST_EXTERNAL_LOADER__;
    }
  };

  log("actif", VERSION);
})();
