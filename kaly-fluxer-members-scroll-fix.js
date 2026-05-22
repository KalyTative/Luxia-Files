(() => {
  "use strict";

  const STYLE_ID = "kaly-fluxer-members-scroll-fix";
  const PANEL_ID = "kaly-fluxer-members-scroll-panel";
  const MEMBERS_PATH_REGEX = /^\/channels\/[^/]+\/members\/?$/;

  function isMembersPage() {
    return MEMBERS_PATH_REGEX.test(window.location.pathname);
  }

  function removePatch() {
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      html,
      body,
      #root {
        height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      #root,
      #root > * {
        min-height: 0 !important;
      }

      [class*="GuildMembersPage_pageContainer"],
      [class*="GuildMembersPage_content"] {
        height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }

      [class*="GuildMembersPage_tableWrapper"] {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        max-height: calc(100vh - 8.5rem) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }

      [class*="GuildMembersPage_tableWrapper"] > div:first-child {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scrollbar-width: thin !important;
        scrollbar-color: #a855f7 rgba(255, 255, 255, 0.08) !important;
      }

      [class*="GuildMembersPage_tableWrapper"] > div:first-child::-webkit-scrollbar {
        width: 10px !important;
      }

      [class*="GuildMembersPage_tableWrapper"] > div:first-child::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.06) !important;
        border-radius: 999px !important;
      }

      [class*="GuildMembersPage_tableWrapper"] > div:first-child::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #7c3aed, #a855f7, #c084fc) !important;
        border-radius: 999px !important;
        border: 2px solid rgba(15, 8, 26, 0.95) !important;
      }

      [class*="GuildMembersPage_tableWrapper"] > div:first-child::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #8b5cf6, #c084fc, #e9d5ff) !important;
      }

      [class*="GuildMembersPage_tableWrapper"] > div:first-child > div {
        overflow-x: auto !important;
        overflow-y: visible !important;
        min-height: 0 !important;
      }

      [class*="GuildMembersPage_tableHead"] {
        position: sticky !important;
        top: 0 !important;
        z-index: 50 !important;
        background: var(--background-secondary-alt, #160f24) !important;
      }

      [class*="GuildMembersPage_footer"] {
        flex-shrink: 0 !important;
        position: sticky !important;
        bottom: 0 !important;
        z-index: 60 !important;
        background: var(--background-secondary-alt, #160f24) !important;
        border-top: 1px solid rgba(255, 255, 255, .08) !important;
      }

      #kaly-fluxer-members-scroll-panel {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 999999;
        display: flex;
        gap: .5rem;
        font-family: system-ui, sans-serif;
      }

      #kaly-fluxer-members-scroll-panel button {
        border: 1px solid rgba(216, 180, 254, .55);
        border-radius: 999px;
        padding: .55rem .85rem;
        background: linear-gradient(135deg, #4c1d95, #7c3aed, #a855f7);
        color: #ffffff;
        font-weight: 800;
        cursor: pointer;
        box-shadow:
          0 10px 25px rgba(0, 0, 0, .35),
          0 0 18px rgba(168, 85, 247, .35);
        transition:
          transform 140ms ease,
          filter 140ms ease,
          box-shadow 140ms ease;
      }

      #kaly-fluxer-members-scroll-panel button:hover {
        filter: brightness(1.15) saturate(1.18);
        transform: translateY(-1px);
        box-shadow:
          0 12px 28px rgba(0, 0, 0, .42),
          0 0 24px rgba(192, 132, 252, .48);
      }

      #kaly-fluxer-members-scroll-panel button:active {
        transform: translateY(0) scale(.98);
        filter: brightness(1.05);
      }
    `;

    document.head.appendChild(style);
  }

  function findMembersTable() {
    return [...document.querySelectorAll("table")].find((table) => {
      const text = table.textContent?.toLowerCase() ?? "";

      return (
        text.includes("nom") ||
        text.includes("name")
      ) && (
        text.includes("membre depuis") ||
        text.includes("member since")
      ) && (
        text.includes("rôles") ||
        text.includes("roles")
      );
    });
  }

  function getScroller() {
    const table = findMembersTable();

    if (!table) {
      return null;
    }

    const verticalScroller = table.parentElement?.parentElement;

    if (!(verticalScroller instanceof HTMLElement)) {
      return null;
    }

    verticalScroller.style.flex = "1 1 auto";
    verticalScroller.style.minHeight = "0";
    verticalScroller.style.overflowY = "auto";
    verticalScroller.style.overflowX = "hidden";

    return verticalScroller;
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const topButton = document.createElement("button");
    topButton.type = "button";
    topButton.textContent = "↑ Haut";

    const bottomButton = document.createElement("button");
    bottomButton.type = "button";
    bottomButton.textContent = "↓ Bas";

    topButton.onclick = () => {
      const scroller = getScroller();

      if (scroller) {
        scroller.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    };

    bottomButton.onclick = () => {
      const scroller = getScroller();

      if (scroller) {
        scroller.scrollTo({
          top: scroller.scrollHeight,
          behavior: "smooth"
        });
      }
    };

    panel.append(topButton, bottomButton);
    document.body.appendChild(panel);
  }

  function applyPatch() {
    if (!isMembersPage()) {
      removePatch();
      return;
    }

    installStyle();
    createPanel();
    getScroller();
  }

  function hookNavigation() {
    if (window.__kalyFluxerMembersScrollFixNavigationHooked) {
      return;
    }

    window.__kalyFluxerMembersScrollFixNavigationHooked = true;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      setTimeout(applyPatch, 50);
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      setTimeout(applyPatch, 50);
      return result;
    };

    window.addEventListener("popstate", () => {
      setTimeout(applyPatch, 50);
    });
  }

  function observeDom() {
    if (window.__kalyFluxerMembersScrollFixObserver) {
      return;
    }

    const observer = new MutationObserver(() => {
      applyPatch();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.__kalyFluxerMembersScrollFixObserver = observer;
  }

  hookNavigation();
  observeDom();
  applyPatch();

  console.log("[Kaly Fluxer] Scroll membres activé seulement sur la page Membres.");
})();