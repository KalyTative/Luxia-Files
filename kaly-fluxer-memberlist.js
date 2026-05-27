(async function () {
  "use strict";

  var VERSION = "console-6.8.25-loader-low-layer-profile-direct";
  var ORIGIN = location.origin;

  function installKalyFluxerSpaNavigator() {
    window.KALY_FLUXER_SPA_NAVIGATE = function (path, mode) {
      try {
        var url = new URL(String(path || ""), location.origin);

        if (url.origin !== location.origin) {
          return false;
        }

        var nextPath = url.pathname + url.search + url.hash;
        var currentPath = location.pathname + location.search + location.hash;

        if (!nextPath || nextPath === currentPath) {
          return true;
        }

        if (mode === "replace") {
          window.history.replaceState(window.history.state || null, "", nextPath);
        } else {
          window.history.pushState(window.history.state || null, "", nextPath);
        }

        try {
          window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
        } catch (errorPopState) {
          var event = document.createEvent("Event");
          event.initEvent("popstate", true, true);
          window.dispatchEvent(event);
        }

        try {
          window.dispatchEvent(new Event("kaly-fluxer-spa-navigation"));
        } catch (errorNavigationEvent) {}

        return true;
      } catch (error) {
        console.error("[KalySpaNavigate] Navigation SPA impossible :", error);
        return false;
      }
    };

    window.KALY_FLUXER_SPA_NAVIGATE.version = "spa-navigation-no-page-reload-1.0.0";
  }

  installKalyFluxerSpaNavigator();

  var STORAGE_AVATAR = "kaly_fluxer_avatar_cache_v2_no_native_guess";
  var STORAGE_PRESENCE = "kaly_console_presence_cache_v1";
  var STORAGE_SELF_ID = "kaly_fluxer_self_member_id";
  var STORAGE_ROLE_MODE = "kaly_fluxer_memberlist_role_order_mode";
  var STORAGE_ROLE_MANUAL = "kaly_fluxer_memberlist_role_order";

  if (window.__KALY_ML_ABORT__ && typeof window.__KALY_ML_ABORT__.abort === "function") {
    window.__KALY_ML_ABORT__.abort();
  }

  if (Array.isArray(window.__KALY_ML_INTERVALS__)) {
    window.__KALY_ML_INTERVALS__.forEach(function (id) {
      clearInterval(id);
    });
  }

  window.__KALY_ML_INTERVALS__ = [];

  [
    "#kaly-fluxer-memberlist-fix",
    "#kaly-fluxer-memberlist-popout",
    "#kaly-fluxer-memberlist-style"
  ].forEach(function (selector) {
    var el = document.querySelector(selector);
    if (el) el.remove();
  });

  var abortController = new AbortController();
  window.__KALY_ML_ABORT__ = abortController;

  function firstValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function uniq(values) {
    var seen = new Set();
    var out = [];

    values.forEach(function (value) {
      if (!value) return;
      value = String(value);

      if (!seen.has(value)) {
        seen.add(value);
        out.push(value);
      }
    });

    return out;
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, "");
  }

  function parseCookie(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function isLikelyUserId(value) {
    return typeof value === "string" && /^[1-9][0-9]{14,24}$/.test(value);
  }

  function normalizeColor(value) {
    if (value && typeof value === "object") {
      value = firstValue(
        value.primary_color,
        value.primaryColor,
        value.secondary_color,
        value.secondaryColor,
        value.color,
        value.colour,
        value.hex,
        value.hex_color,
        value.hexColor,
        ""
      );
    }

    if (value === undefined || value === null || value === "") return "";

    if (typeof value === "number") {
      if (!Number.isFinite(value) || value <= 0) return "";
      return "#" + Math.floor(value).toString(16).padStart(6, "0").slice(-6);
    }

    var raw = String(value).trim();

    if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";

    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();

    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return "#" + raw.slice(1).split("").map(function (char) {
        return char + char;
      }).join("").toUpperCase();
    }

    if (/^0x[0-9a-fA-F]{6}$/.test(raw)) {
      return "#" + raw.slice(2).toUpperCase();
    }

    if (/^[0-9a-fA-F]{6}$/.test(raw)) {
      return "#" + raw.toUpperCase();
    }

    if (/^[0-9]+$/.test(raw)) {
      var number = Number(raw);
      if (!Number.isFinite(number) || number <= 0) return "";
      return "#" + Math.floor(number).toString(16).padStart(6, "0").slice(-6).toUpperCase();
    }

    return "";
  }

  function normalizeStatus(value) {
    var raw = value;

    if (raw && typeof raw === "object") {
      raw = firstValue(
        raw.status,
        raw.state,
        raw.type,
        raw.name,
        raw.presence,
        raw.online_status,
        raw.onlineStatus,
        raw.client_status,
        raw.clientStatus,
        raw.desktop,
        raw.mobile,
        raw.web,
        ""
      );
    }

    if (raw === true) return "online";
    if (raw === false) return "offline";

    var status = String(raw || "unknown").toLowerCase();

    if (["online", "active", "available", "connected", "connecte", "connecté", "en ligne"].indexOf(status) !== -1) return "online";
    if (["idle", "away", "absent", "afk"].indexOf(status) !== -1) return "idle";
    if (["dnd", "do_not_disturb", "do-not-disturb", "busy", "occupé", "occupe", "ne pas déranger"].indexOf(status) !== -1) return "dnd";
    if (["offline", "invisible", "hidden", "disconnected", "hors ligne"].indexOf(status) !== -1) return "offline";

    return "unknown";
  }

  function statusRank(status) {
    if (status === "online") return 1;
    if (status === "idle") return 2;
    if (status === "dnd") return 3;
    if (status === "offline") return 4;
    return 5;
  }

  function statusLabel(status) {
    if (status === "online") return "En ligne";
    if (status === "idle") return "Absent";
    if (status === "dnd") return "Ne pas déranger";
    if (status === "offline") return "Hors ligne";
    return "Statut inconnu";
  }

  function detectStatusFromText(text) {
    var t = String(text || "").toLowerCase();

    if (t.indexOf("ne pas déranger") !== -1 || t.indexOf("do not disturb") !== -1 || t.indexOf("dnd") !== -1) return "dnd";
    if (t.indexOf("absent") !== -1 || t.indexOf("idle") !== -1 || t.indexOf("away") !== -1 || t.indexOf("afk") !== -1) return "idle";
    if (t.indexOf("hors ligne") !== -1 || t.indexOf("offline") !== -1 || t.indexOf("invisible") !== -1) return "offline";
    if (t.indexOf("en ligne") !== -1 || t.indexOf("online") !== -1 || t.indexOf("available") !== -1) return "online";

    return "unknown";
  }

  function cleanBase(value) {
    if (!value || typeof value !== "string") return "";

    try {
      var url = new URL(value.trim(), location.href).href;
      url = url.replace(/\/+$/, "");
      url = url.replace(/\/api\/v1\/.*$/, "/api/v1");
      url = url.replace(/\/api\/.*$/, "/api");
      url = url.replace(/\/(guilds|channels|users|members|roles|media|avatars|files|attachments|presence|presences)\/.*$/, "");
      return url;
    } catch (error) {
      return "";
    }
  }

  function forceApiBase(value) {
    var base = cleanBase(value || ORIGIN);

    if (!base) return ORIGIN + "/api/v1";
    if (/\/api\/v1$/.test(base)) return base;
    if (/\/api$/.test(base)) return base + "/v1";

    base = base.replace(/\/v1$/, "");
    return base + "/api/v1";
  }

  function isSameOriginUrl(url) {
    try {
      return new URL(url, location.href).origin === ORIGIN;
    } catch (error) {
      return false;
    }
  }

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function collectStrings(value, path, out) {
    path = path || "";
    out = out || [];

    if (typeof value === "string") {
      out.push({ path: path, value: value });
      return out;
    }

    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        collectStrings(item, path + "[" + index + "]", out);
      });
      return out;
    }

    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        collectStrings(value[key], path ? path + "." + key : key, out);
      });
    }

    return out;
  }

  var CONFIG = {
    apiBase: forceApiBase(localStorage.getItem("kaly_fluxer_memberlist_api_base") || ORIGIN),
    mediaBase: ORIGIN + "/media",
    guildId: localStorage.getItem("kaly_fluxer_memberlist_guild_id") || "",
    roleOrderMode: localStorage.getItem(STORAGE_ROLE_MODE) || "api",
    panelWidth: 260,
    topOffset: 48,
    avatarTimeoutMs: 1200,
    avatarCandidateLimit: 16,
    debug: true
  };

  localStorage.setItem("kaly_fluxer_memberlist_api_base", CONFIG.apiBase);
  localStorage.setItem("kaly_fluxer_memberlist_cdn_base", CONFIG.mediaBase);
  localStorage.setItem(STORAGE_ROLE_MODE, CONFIG.roleOrderMode);

  var avatarCache = loadJson(STORAGE_AVATAR, {});
  var presenceCache = loadJson(STORAGE_PRESENCE, {
    map: {},
    sources: {},
    rawByUserId: {}
  });

  var state = {
    version: VERSION,
    base: CONFIG.apiBase,
    mediaBase: CONFIG.mediaBase,
    guildId: "",
    goodHeaders: null,
    panel: null,
    popout: null,
    membersRaw: [],
    rolesRaw: [],
    members: [],
    roles: [],
    groups: [],
    rolesById: new Map(),
    roleOrderMode: CONFIG.roleOrderMode,
    nativeAvatars: [],
    avatarCache: avatarCache,
    presenceMap: presenceCache.map || {},
    presenceSources: presenceCache.sources || {},
    rawPresenceByUserId: presenceCache.rawByUserId || {},
    gatewayPresenceMap: {},
    domPresenceMap: {},
    memberStatusMemory: {},
    selfMemberId: localStorage.getItem(STORAGE_SELF_ID) || "",
    hasPresence: false,
    refreshing: false,
    resolvingAvatars: false,
    pendingRefresh: false,
    routeVisible: false,
    routeKey: "",
    lastHref: location.href,
    routeDebounceTimer: null,
    routeDomObserver: null,
    hardGuardLastHiddenReason: "",
    hardGuardTicks: 0,
    lastRouteReason: "",
    lastRouteVerdict: "",
    lastChannelInfo: null,
    lastError: "",
    attempted: [],
    presenceStats: {
      messageEventHooked: false,
      futureWebSocketHooked: false,
      messagesSeen: 0,
      jsonSeen: 0,
      presencesSeen: 0,
      domScans: 0,
      selfForced: false
    }
  };

  window.KalyFluxerMemberListFix = {
    version: VERSION,
    state: state,
    config: CONFIG,
    refresh: function () {},
    render: function () {},
    stop: function () {},
    dump: function () {
      return {
        version: VERSION,
        status: "initialisation en cours",
        state: state
      };
    }
  };

  function log() {
    if (!CONFIG.debug) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[KalyMemberList]");
    console.log.apply(console, args);
  }

  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[KalyMemberList]");
    console.warn.apply(console, args);
  }

  function saveAvatarCache() {
    saveJson(STORAGE_AVATAR, state.avatarCache);
  }

  function savePresenceCache() {
    saveJson(STORAGE_PRESENCE, {
      version: VERSION,
      updatedAt: Date.now(),
      map: state.presenceMap,
      sources: state.presenceSources,
      rawByUserId: state.rawPresenceByUserId
    });
  }

  function objectHasAnyKeyDeep(value, keys, depth, seen) {
    if (!value || typeof value !== "object" || depth > 5) return false;

    if (!seen) seen = new WeakSet();
    if (seen.has(value)) return false;
    seen.add(value);

    var wanted = {};
    keys.forEach(function (key) {
      wanted[String(key).toLowerCase()] = true;
    });

    var names = Object.keys(value);

    for (var i = 0; i < names.length; i += 1) {
      if (wanted[String(names[i]).toLowerCase()]) return true;
    }

    for (var j = 0; j < names.length; j += 1) {
      if (objectHasAnyKeyDeep(value[names[j]], keys, depth + 1, seen)) return true;
    }

    return false;
  }

  function rawLooksLikeRealPresencePayload(raw) {
    return objectHasAnyKeyDeep(raw, [
      "presence",
      "presences",
      "online_status",
      "onlineStatus",
      "client_status",
      "clientStatus",
      "client_state",
      "clientState",
      "activities",
      "activity"
    ], 0);
  }

  function sourceLooksLikeRealPresence(source) {
    var lower = String(source || "").toLowerCase();

    return (
      lower.indexOf("presence") !== -1 ||
      lower.indexOf("client_status") !== -1 ||
      lower.indexOf("clientstatus") !== -1 ||
      lower.indexOf("status_update") !== -1 ||
      lower.indexOf("presence_update") !== -1
    );
  }

  function sourceLooksLikeMemberOrRoleMutation(source, raw) {
    var lower = String(source || "").toLowerCase();

    if (
      lower.indexOf("guild_member") !== -1 ||
      lower.indexOf("member_update") !== -1 ||
      lower.indexOf("member:update") !== -1 ||
      lower.indexOf("role") !== -1
    ) {
      return true;
    }

    if (!raw || typeof raw !== "object") return false;
    if (rawLooksLikeRealPresencePayload(raw)) return false;

    return objectHasAnyKeyDeep(raw, [
      "roles",
      "role_ids",
      "roleIds",
      "guild_roles",
      "guildRoles",
      "member_roles",
      "memberRoles"
    ], 0);
  }

  function isTrustedOfflinePresence(source, raw) {
    source = String(source || "");

    if (source === "self-ui-forced-online") return true;
    if (source === "console-fallback-offline") return true;

    if (sourceLooksLikeMemberOrRoleMutation(source, raw)) return false;
    if (sourceLooksLikeRealPresence(source)) return true;
    if (rawLooksLikeRealPresencePayload(raw)) return true;

    return false;
  }

  function cleanCachedPresence(userId) {
    userId = String(userId || "");

    var status = normalizeStatus(state.presenceMap[userId]);
    if (status === "unknown") return "unknown";

    if (status === "offline" && !isTrustedOfflinePresence(state.presenceSources[userId], state.rawPresenceByUserId[userId])) {
      return "unknown";
    }

    return status;
  }

  function cleanApiMemberPresence(memberRaw, userRaw) {
    var status = normalizeStatus(firstValue(
      memberRaw && memberRaw.presence,
      memberRaw && memberRaw.status,
      memberRaw && memberRaw.online_status,
      memberRaw && memberRaw.onlineStatus,
      userRaw && userRaw.presence,
      userRaw && userRaw.status,
      userRaw && userRaw.online_status,
      userRaw && userRaw.onlineStatus,
      ""
    ));

    /*
      Fluxer self-host peut renvoyer un member payload après changement de rôle.
      Ce payload décrit l'état membre/rôles, pas forcément la vraie présence.
      Si on y lit un "offline" faible, on ne le laisse pas balayer une présence déjà connue.
    */
    if (
      status === "offline" &&
      !rawLooksLikeRealPresencePayload(memberRaw) &&
      !rawLooksLikeRealPresencePayload(userRaw)
    ) {
      return "unknown";
    }

    return status;
  }

  function rememberMemberStatus(userId, status) {
    userId = String(userId || "");
    status = normalizeStatus(status);

    if (!isLikelyUserId(userId)) return;
    if (!status || status === "unknown") return;

    if (!state.memberStatusMemory) state.memberStatusMemory = {};
    state.memberStatusMemory[userId] = status;
  }

  function mergePresence(userId, status, source, raw) {
    userId = String(userId || "");
    status = normalizeStatus(status);

    if (!isLikelyUserId(userId)) return false;
    if (!status || status === "unknown") return false;

    if (state.selfMemberId && userId === state.selfMemberId && source !== "self-ui-forced-online" && status !== "online") {
      return false;
    }

    var current = state.presenceMap[userId];
    var trustedOffline = status !== "offline" || isTrustedOfflinePresence(source, raw);

    if (status === "offline" && !trustedOffline) {
      return false;
    }

    var replace = false;

    if (!current) replace = trustedOffline;
    else if (current === "unknown") replace = trustedOffline;
    else if (statusRank(status) < statusRank(current)) replace = true;
    else if (status === "offline" && current !== "offline") replace = trustedOffline;

    if (!replace) return false;

    state.presenceMap[userId] = status;
    state.presenceSources[userId] = source || "console";
    state.rawPresenceByUserId[userId] = raw || null;
    state.presenceStats.presencesSeen += 1;
    rememberMemberStatus(userId, status);

    savePresenceCache();
    return true;
  }

  function extractUserId(entry) {
    if (!entry || typeof entry !== "object") return "";

    var user = firstValue(entry.user, entry.account, entry.member, entry.profile, entry.author, {});
    var member = firstValue(entry.member, entry.guild_member, entry.guildMember, {});

    var id = String(firstValue(
      entry.user_id,
      entry.userId,
      entry.userID,
      entry.user_id_str,
      entry.uid,
      entry.id,
      entry._id,
      user.id,
      user._id,
      user.user_id,
      user.userId,
      member.user_id,
      member.userId,
      member.id,
      ""
    ));

    return isLikelyUserId(id) ? id : "";
  }

  function extractStatus(entry) {
    if (!entry || typeof entry !== "object") return "unknown";

    var user = firstValue(entry.user, entry.account, entry.member, entry.profile, entry.author, {});

    return normalizeStatus(firstValue(
      entry.status,
      entry.presence,
      entry.state,
      entry.online_status,
      entry.onlineStatus,
      entry.client_status,
      entry.clientStatus,
      entry.clientState,
      entry.client_state,
      entry.type,
      entry.availability,
      entry.connection_status,
      entry.connectionStatus,
      user.status,
      user.presence,
      user.online_status,
      user.onlineStatus,
      user.client_status,
      user.clientStatus,
      ""
    ));
  }

  function extractObjectKeyedPresence(object, source) {
    if (!object || typeof object !== "object" || Array.isArray(object)) return false;

    var changed = false;

    Object.keys(object).forEach(function (key) {
      if (!isLikelyUserId(key)) return;

      var value = object[key];
      var status = normalizeStatus(value);

      if (status !== "unknown") {
        if (mergePresence(key, status, source + ":keyed", value)) changed = true;
        return;
      }

      if (value && typeof value === "object") {
        var nestedStatus = extractStatus(value);

        if (nestedStatus !== "unknown") {
          if (mergePresence(key, nestedStatus, source + ":keyed-object", value)) changed = true;
        }
      }
    });

    return changed;
  }

  function deepExtractPresence(value, source, depth, seen) {
    if (!value || depth > 16) return false;

    if (!seen) seen = new WeakSet();

    var changed = false;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        if (deepExtractPresence(item, source, depth + 1, seen)) changed = true;
      });
      return changed;
    }

    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;

    seen.add(value);

    var userId = extractUserId(value);
    var status = extractStatus(value);

    if (userId && status !== "unknown") {
      if (mergePresence(userId, status, source, value)) changed = true;
    }

    if (extractObjectKeyedPresence(value, source)) changed = true;

    var eventName = String(firstValue(value.event, value.type, value.t, value.op, value.name, "")).toLowerCase();
    var nextSource = eventName ? source + ":" + eventName : source;

    Object.keys(value).forEach(function (key) {
      if (key.length > 100) return;

      var lower = key.toLowerCase();

      if (
        lower.indexOf("presence") !== -1 ||
        lower.indexOf("status") !== -1 ||
        lower.indexOf("online") !== -1 ||
        lower.indexOf("member") !== -1 ||
        lower.indexOf("user") !== -1 ||
        lower.indexOf("guild") !== -1 ||
        lower === "d" ||
        lower === "data" ||
        lower === "payload"
      ) {
        if (deepExtractPresence(value[key], nextSource + "." + key, depth + 1, seen)) changed = true;
        return;
      }

      if (depth < 8) {
        if (deepExtractPresence(value[key], nextSource + "." + key, depth + 1, seen)) changed = true;
      }
    });

    return changed;
  }

  function parseMaybeJson(text) {
    if (!text || typeof text !== "string") return null;

    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function handlePresencePayload(payload, source) {
    if (!payload) return;

    state.presenceStats.jsonSeen += 1;

    if (deepExtractPresence(payload, source || "payload", 0)) {
      applyPresenceToMembers();
      forceSelfOnline();
      buildGroups();
      render();
    }
  }

  function decodeArrayBuffer(buffer) {
    try {
      return new TextDecoder("utf-8").decode(buffer);
    } catch (error) {
      return "";
    }
  }

  function handleGatewayData(data, source) {
    state.presenceStats.messagesSeen += 1;

    if (typeof data === "string") {
      handlePresencePayload(parseMaybeJson(data), source);
      return;
    }

    if (data instanceof Blob) {
      data.text().then(function (text) {
        handleGatewayData(text, source + ":blob");
      }).catch(function () {});
      return;
    }

    if (data instanceof ArrayBuffer) {
      handleGatewayData(decodeArrayBuffer(data), source + ":arraybuffer");
      return;
    }

    if (ArrayBuffer.isView(data)) {
      handleGatewayData(decodeArrayBuffer(data), source + ":arraybuffer-view");
      return;
    }

    if (data && typeof data === "object") {
      handlePresencePayload(data, source + ":object");
    }
  }

  function installMessageEventDataHook() {
    if (window.__KALY_CONSOLE_PRESENCE_MESSAGEEVENT_HOOKED__) return;

    var descriptor = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");

    if (!descriptor || typeof descriptor.get !== "function") {
      state.presenceStats.messageEventHooked = false;
      return;
    }

    window.__KALY_CONSOLE_PRESENCE_MESSAGEEVENT_HOOKED__ = true;

    Object.defineProperty(MessageEvent.prototype, "data", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: function () {
        var value = descriptor.get.call(this);

        try {
          var ctorA = this.currentTarget && this.currentTarget.constructor ? String(this.currentTarget.constructor.name || "") : "";
          var ctorB = this.target && this.target.constructor ? String(this.target.constructor.name || "") : "";

          if (ctorA.indexOf("WebSocket") !== -1 || ctorB.indexOf("WebSocket") !== -1) {
            handleGatewayData(value, "messageevent-existing-websocket");
          }
        } catch (error) {}

        return value;
      }
    });

    state.presenceStats.messageEventHooked = true;
  }

  function installFutureWebSocketHook() {
    if (window.__KALY_CONSOLE_PRESENCE_WS_HOOKED__) return;

    var NativeWebSocket = window.WebSocket;
    if (!NativeWebSocket) return;

    window.__KALY_CONSOLE_PRESENCE_WS_HOOKED__ = true;

    function PatchedWebSocket(url, protocols) {
      var ws = arguments.length > 1 ? new NativeWebSocket(url, protocols) : new NativeWebSocket(url);

      try {
        ws.addEventListener("message", function (event) {
          handleGatewayData(event.data, "future-websocket:" + String(url || ""));
        });
      } catch (error) {}

      return ws;
    }

    Object.keys(NativeWebSocket).forEach(function (key) {
      try {
        PatchedWebSocket[key] = NativeWebSocket[key];
      } catch (error) {}
    });

    PatchedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = NativeWebSocket.OPEN;
    PatchedWebSocket.CLOSING = NativeWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = NativeWebSocket.CLOSED;
    PatchedWebSocket.prototype = NativeWebSocket.prototype;

    try {
      Object.setPrototypeOf(PatchedWebSocket, NativeWebSocket);
    } catch (error) {}

    window.WebSocket = PatchedWebSocket;
    state.presenceStats.futureWebSocketHooked = true;
  }

  function getTokenCandidates() {
    var tokens = [];

    ["session", "token", "access_token", "auth", "authorization", "session_token"].forEach(function (cookieName) {
      var value = parseCookie(cookieName);
      if (value) tokens.push(value);
    });

    [localStorage, sessionStorage].forEach(function (storage) {
      if (!storage) return;

      for (var i = 0; i < storage.length; i += 1) {
        var key = storage.key(i) || "";
        var raw = storage.getItem(key) || "";
        var lowerKey = key.toLowerCase();

        if (
          lowerKey.indexOf("token") !== -1 ||
          lowerKey.indexOf("auth") !== -1 ||
          lowerKey.indexOf("session") !== -1 ||
          lowerKey.indexOf("access") !== -1
        ) {
          tokens.push(raw);
        }

        try {
          var parsed = JSON.parse(raw);

          collectStrings(parsed, key, []).forEach(function (item) {
            var path = String(item.path || "").toLowerCase();
            var value = String(item.value || "").trim();

            if (
              value.length >= 16 &&
              value.length <= 4096 &&
              (
                path.indexOf("token") !== -1 ||
                path.indexOf("auth") !== -1 ||
                path.indexOf("session") !== -1 ||
                path.indexOf("access") !== -1
              ) &&
              path.indexOf("csrf") === -1
            ) {
              tokens.push(value);
            }
          });
        } catch (error) {}
      }
    });

    return uniq(tokens.map(function (token) {
      return String(token || "").trim();
    }).filter(function (token) {
      return token.length >= 16 && token.length <= 4096;
    }));
  }

  function buildHeaderSets() {
    if (state.goodHeaders) return [state.goodHeaders];

    var sets = [];
    var csrf = parseCookie("csrf_token") || parseCookie("csrftoken") || "";
    var tokens = getTokenCandidates();

    tokens.forEach(function (token) {
      if (!token) return;

      if (token.indexOf("Bearer ") === 0 || token.indexOf("Bot ") === 0) {
        sets.push({ Authorization: token });
      } else {
        sets.push({ Authorization: token });
        sets.push({ Authorization: "Bearer " + token });
        sets.push({ Authorization: "Session " + token });
        sets.push({ "X-Session-Token": token });
        sets.push({ "X-Auth-Token": token });
      }
    });

    if (csrf) sets.push({ "X-CSRF-Token": csrf });

    sets.push({});

    return uniq(sets.map(function (headers) {
      return JSON.stringify(headers);
    })).map(function (headers) {
      return JSON.parse(headers);
    });
  }

  async function fetchJsonWithHeaders(url, headers) {
    var response = await fetch(url, {
      method: "GET",
      credentials: "include",
      signal: abortController.signal,
      headers: Object.assign({ Accept: "application/json" }, headers || {})
    });

    var contentType = response.headers.get("content-type") || "";
    var text = await response.text();
    var json = null;
    var html = text.slice(0, 80).toLowerCase().indexOf("<!doctype html") !== -1;

    if (!html) {
      try {
        json = text ? JSON.parse(text) : null;
      } catch (error) {
        json = null;
      }
    }

    return {
      response: response,
      contentType: contentType,
      text: text,
      json: json,
      html: html
    };
  }

  async function apiGet(path) {
    var url = state.base + path;
    var headersList = buildHeaderSets();
    var lastError = null;

    for (var i = 0; i < headersList.length; i += 1) {
      try {
        var result = await fetchJsonWithHeaders(url, headersList[i]);

        state.attempted.push({
          url: url,
          status: result.response.status,
          contentType: result.contentType,
          html: result.html
        });

        if (result.response.ok && result.json !== null && !result.html) {
          state.goodHeaders = headersList[i];
          return result.json;
        }

        lastError = new Error("HTTP " + result.response.status + " " + url + ": " + result.text.slice(0, 160));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Requête impossible : " + url);
  }

  function arrayFromResponse(response, keys) {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== "object") return [];

    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(response[keys[i]])) return response[keys[i]];
    }

    for (var j = 0; j < keys.length; j += 1) {
      var obj = response[keys[j]];

      if (obj && typeof obj === "object") {
        var nested = Object.values(obj);

        if (nested.length && nested.every(function (item) {
          return item && typeof item === "object";
        })) {
          return nested;
        }
      }
    }

    var values = Object.values(response);

    if (values.length && values.every(function (item) {
      return item && typeof item === "object";
    })) {
      return values;
    }

    return [];
  }

  function routeKey() {
    return location.pathname + location.search + location.hash;
  }

  function getRouteInfoFromLocation() {
    var pathname = location.pathname || "";
    var match = pathname.match(/^\/channels\/([^\/?#]+)(?:\/([1-9][0-9]{14,24}))?(?:\/|$)/);
    var guildId = "";
    var channelId = "";

    if (match) {
      guildId = decodeURIComponent(match[1] || "");
      channelId = String(match[2] || "");
    }

    var isDmRoute = Boolean(match && (guildId === "@me" || guildId === "me"));
    var isGuildChannelRoute = Boolean(match && isLikelyUserId(guildId) && isLikelyUserId(channelId));

    return {
      key: routeKey(),
      href: location.href,
      pathname: pathname,
      guildId: guildId,
      channelId: channelId,
      isDmRoute: isDmRoute,
      isChannelRoute: Boolean(match && channelId),
      isGuildChannelRoute: isGuildChannelRoute,
      isGuildTextCandidate: isGuildChannelRoute
    };
  }

  function getGuildIdGuess() {
    var route = getRouteInfoFromLocation();

    if (route.isGuildTextCandidate && route.guildId) return route.guildId;
    if (CONFIG.guildId) return CONFIG.guildId;

    var href = location.href;
    var channelMatch = href.match(/\/channels\/([1-9][0-9]{14,24})\/([1-9][0-9]{14,24})/);

    if (channelMatch && channelMatch[1]) return channelMatch[1];

    var matches = href.match(/\b[1-9][0-9]{14,24}\b/g) || [];
    return uniq(matches)[0] || "";
  }

  function getChannelIdGuess() {
    var route = getRouteInfoFromLocation();

    if (route.isGuildTextCandidate && route.channelId) return route.channelId;

    var href = location.href;
    var channelMatch = href.match(/\/channels\/([1-9][0-9]{14,24})\/([1-9][0-9]{14,24})/);

    return channelMatch && channelMatch[2] ? channelMatch[2] : "";
  }

  function forceHidePanelDom(reason) {
    var why = reason || "route";

    state.routeVisible = false;
    state.lastRouteReason = why;
    state.lastRouteVerdict = "hidden-force:" + why;
    state.hardGuardLastHiddenReason = why;

    try {
      document.documentElement.setAttribute("data-kaly-ml-route-visible", "0");
      if (document.body) document.body.setAttribute("data-kaly-ml-route-visible", "0");
    } catch (errorAttr) {}

    closePopout();

    Array.prototype.slice.call(document.querySelectorAll("#kaly-fluxer-memberlist-fix,#kaly-fluxer-memberlist-popout")).forEach(function (element) {
      try {
        element.setAttribute("data-kaly-force-hidden", "1");
        element.style.setProperty("display", "none", "important");
        element.style.setProperty("visibility", "hidden", "important");
        element.style.setProperty("pointer-events", "none", "important");
      } catch (errorStyle) {}
    });

    return false;
  }

  function releasePanelDom(reason) {
    try {
      document.documentElement.setAttribute("data-kaly-ml-route-visible", "1");
      if (document.body) document.body.setAttribute("data-kaly-ml-route-visible", "1");
    } catch (errorAttr) {}

    if (state.panel) {
      try {
        state.panel.removeAttribute("data-kaly-force-hidden");
        state.panel.style.removeProperty("display");
        state.panel.style.removeProperty("visibility");
        state.panel.style.removeProperty("pointer-events");
      } catch (errorStyle) {
        state.panel.style.display = "";
      }
    }

    state.lastRouteVerdict = "visible:" + (reason || "route");
    return true;
  }

  function setPanelVisible(visible, reason) {
    if (!visible) {
      return forceHidePanelDom(reason || "route");
    }

    state.routeVisible = true;
    state.lastRouteReason = reason || "";

    ensurePanel();
    return releasePanelDom(reason || "route");
  }

  function clearMemberState(reason) {
    closePopout();
    setPanelVisible(false, reason || "not-text-channel");

    state.membersRaw = [];
    state.rolesRaw = [];
    state.members = [];
    state.roles = [];
    state.groups = [];
    state.lastGroupsHtml = "";

    return false;
  }

  function channelPayloadRoot(payload) {
    if (!payload || typeof payload !== "object") return payload;

    return firstValue(
      payload.channel,
      payload.channel_info,
      payload.channelInfo,
      payload.data,
      payload.result,
      payload.item,
      payload
    );
  }

  function channelTypeVerdict(payload) {
    var channel = channelPayloadRoot(payload);

    if (!channel || typeof channel !== "object") return "unknown";

    var raw = firstValue(
      channel.type,
      channel.channel_type,
      channel.channelType,
      channel.kind,
      channel.channel_kind,
      channel.channelKind,
      channel.name_type,
      ""
    );

    if (typeof raw === "number") {
      if ([0, 5, 10, 11, 12, 15, 16].indexOf(raw) !== -1) return "text";
      if ([1, 2, 3, 4, 13, 14].indexOf(raw) !== -1) return "nontext";
      return "unknown";
    }

    var type = String(raw || "").toLowerCase().replace(/[\s_-]+/g, "");

    if (type) {
      if (
        type.indexOf("voice") !== -1 ||
        type.indexOf("vocal") !== -1 ||
        type.indexOf("voix") !== -1 ||
        type.indexOf("stage") !== -1 ||
        type.indexOf("audio") !== -1 ||
        type.indexOf("call") !== -1 ||
        type.indexOf("stream") !== -1 ||
        type.indexOf("category") !== -1 ||
        type.indexOf("categorie") !== -1 ||
        type === "dm" ||
        type.indexOf("directmessage") !== -1 ||
        type.indexOf("groupdm") !== -1
      ) {
        return "nontext";
      }

      if (
        type.indexOf("text") !== -1 ||
        type.indexOf("texte") !== -1 ||
        type.indexOf("chat") !== -1 ||
        type.indexOf("message") !== -1 ||
        type.indexOf("announcement") !== -1 ||
        type.indexOf("annonce") !== -1 ||
        type.indexOf("news") !== -1 ||
        type.indexOf("forum") !== -1 ||
        type.indexOf("thread") !== -1 ||
        type.indexOf("media") !== -1
      ) {
        return "text";
      }
    }

    var flags = [
      channel.is_text,
      channel.isText,
      channel.text,
      channel.can_send_messages,
      channel.canSendMessages,
      channel.messageable,
      channel.is_messageable,
      channel.isMessageable
    ];

    for (var i = 0; i < flags.length; i += 1) {
      if (flags[i] === true) return "text";
      if (flags[i] === false && i >= 3) return "nontext";
    }

    if (
      channel.voice === true ||
      channel.is_voice === true ||
      channel.isVoice === true ||
      channel.voice_channel === true ||
      channel.voiceChannel === true ||
      channel.call === true ||
      channel.is_call === true ||
      channel.isCall === true
    ) {
      return "nontext";
    }

    return "unknown";
  }

  async function fetchChannelInfo(guildId, channelId) {
    var paths = uniq([
      "/channels/" + encodeURIComponent(channelId),
      "/guilds/" + encodeURIComponent(guildId) + "/channels/" + encodeURIComponent(channelId)
    ]);

    for (var i = 0; i < paths.length; i += 1) {
      try {
        var response = await apiGet(paths[i]);
        if (response && typeof response === "object") return response;
      } catch (error) {}
    }

    try {
      var list = await apiGet("/guilds/" + encodeURIComponent(guildId) + "/channels");
      var channels = arrayFromResponse(list, ["channels", "items", "data", "results"]);

      for (var j = 0; j < channels.length; j += 1) {
        if (String(firstValue(channels[j].id, channels[j].channel_id, channels[j].channelId, "")) === String(channelId)) {
          return channels[j];
        }
      }
    } catch (errorList) {}

    return null;
  }

  function isVisibleElement(node) {
    if (!node || !node.getBoundingClientRect) return false;

    var rect = node.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;

    var style = null;

    try {
      style = window.getComputedStyle(node);
    } catch (error) {
      style = null;
    }

    if (style && (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)) return false;

    return true;
  }

  function nodeBlob(node) {
    if (!node) return "";

    return [
      node.textContent || "",
      node.className || "",
      node.getAttribute ? node.getAttribute("aria-label") || "" : "",
      node.getAttribute ? node.getAttribute("title") || "" : "",
      node.getAttribute ? node.getAttribute("placeholder") || "" : "",
      node.getAttribute ? node.getAttribute("href") || "" : "",
      node.getAttribute ? node.getAttribute("data-channel-id") || "" : "",
      node.getAttribute ? node.getAttribute("data-id") || "" : "",
      node.getAttribute ? node.getAttribute("role") || "" : ""
    ].join(" ");
  }

  function hasVisibleMessageComposer() {
    var selectors = [
      "textarea",
      "[contenteditable='true']",
      "[role='textbox']",
      "input[type='text']"
    ].join(",");

    var nodes = [];

    try {
      nodes = Array.prototype.slice.call(document.querySelectorAll(selectors));
    } catch (error) {
      nodes = [];
    }

    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];

      if (!node || !isVisibleElement(node)) continue;
      if (node.closest && (node.closest("#kaly-fluxer-memberlist-fix") || node.closest("#kaly-fluxer-native-look-profile-root"))) continue;

      var raw = nodeBlob(node);
      var parent = node.parentElement;
      var depth = 0;

      while (parent && depth < 5) {
        raw += " " + nodeBlob(parent);
        parent = parent.parentElement;
        depth += 1;
      }

      raw = raw.toLowerCase();

      if (
        raw.indexOf("message") !== -1 ||
        raw.indexOf("envoyer") !== -1 ||
        raw.indexOf("écrire") !== -1 ||
        raw.indexOf("ecrire") !== -1 ||
        raw.indexOf("send") !== -1 ||
        raw.indexOf("chat") !== -1 ||
        raw.indexOf("textbox") !== -1
      ) {
        return true;
      }
    }

    return false;
  }

  function hasNonTextViewMarkers(route) {
    var pathname = location.pathname || "";

    if (!route) route = getRouteInfoFromLocation();
    if (!route.isGuildTextCandidate) return true;
    if (pathname.indexOf("/channels/@me") === 0) return true;

    var selectors = [
      "main",
      "[role='main']",
      "[class*='Call']",
      "[class*='call']",
      "[class*='Voice']",
      "[class*='voice']",
      "[class*='Stage']",
      "[class*='stage']",
      "[class*='Video']",
      "[class*='video']",
      "[class*='Stream']",
      "[class*='stream']",
      "[class*='RTC']",
      "[class*='rtc']"
    ].join(",");

    var nodes = [];

    try {
      nodes = Array.prototype.slice.call(document.querySelectorAll(selectors));
    } catch (error) {
      nodes = [];
    }

    var blob = "";

    for (var i = 0; i < nodes.length && i < 80; i += 1) {
      var node = nodes[i];

      if (!node || !isVisibleElement(node)) continue;
      if (node.closest && node.closest("#kaly-fluxer-memberlist-fix")) continue;

      blob += " " + nodeBlob(node).slice(0, 1200);
    }

    blob = blob.toLowerCase();

    var callScore = 0;

    [
      "quitter l'appel",
      "quitter appel",
      "leave call",
      "appel en cours",
      "call ongoing",
      "voice connected",
      "connecté au vocal",
      "connecte au vocal",
      "salon vocal",
      "voice channel",
      "microphone",
      "micro",
      "caméra",
      "camera",
      "partager l'écran",
      "partager l’ecran",
      "screen share",
      "stream",
      "deafen",
      "sourdine",
      "rejoindre l'appel",
      "join call"
    ].forEach(function (needle) {
      if (blob.indexOf(needle) !== -1) callScore += 1;
    });

    if (callScore >= 2 && !hasVisibleMessageComposer()) return true;

    return false;
  }

  function inferTextChannelFromDom(route) {
    if (!route || !route.channelId || !route.isGuildTextCandidate) return null;

    if (hasNonTextViewMarkers(route)) return false;

    var nodes = [];

    try {
      nodes = Array.prototype.slice.call(document.querySelectorAll(
        'a[href*="/channels/' + CSS.escape(route.guildId) + '/' + CSS.escape(route.channelId) + '"],button[aria-label],div[aria-label],[role="treeitem"],[role="listitem"]'
      ));
    } catch (error) {
      nodes = [];
    }

    var needle = route.channelId;

    nodes = nodes.filter(function (node) {
      if (!node) return false;

      var blob = nodeBlob(node);

      if (blob.indexOf(needle) !== -1) return true;
      if (node.matches && node.matches('a[href*="/' + needle + '"]')) return true;

      return false;
    });

    if (!nodes.length) {
      return hasVisibleMessageComposer() ? true : null;
    }

    for (var i = 0; i < nodes.length; i += 1) {
      var raw = nodeBlob(nodes[i]).toLowerCase();

      if (
        raw.indexOf("voice") !== -1 ||
        raw.indexOf("vocal") !== -1 ||
        raw.indexOf("voix") !== -1 ||
        raw.indexOf("stage") !== -1 ||
        raw.indexOf("audio") !== -1 ||
        raw.indexOf("call") !== -1
      ) {
        return false;
      }

      if (
        raw.indexOf("text") !== -1 ||
        raw.indexOf("texte") !== -1 ||
        raw.indexOf("chat") !== -1 ||
        raw.indexOf("#") !== -1 ||
        raw.indexOf("message") !== -1
      ) {
        return true;
      }
    }

    return hasVisibleMessageComposer() ? true : null;
  }

  async function isCurrentRouteTextChannel(route) {
    if (!route || !route.isGuildTextCandidate) return false;

    if (hasNonTextViewMarkers(route)) {
      state.lastChannelInfo = { source: "dom", verdict: "nontext-view" };
      return false;
    }

    var domVerdict = inferTextChannelFromDom(route);

    if (domVerdict === false) {
      state.lastChannelInfo = { source: "dom", verdict: "nontext" };
      return false;
    }

    var channelInfo = await fetchChannelInfo(route.guildId, route.channelId);
    state.lastChannelInfo = channelInfo;

    var verdict = channelTypeVerdict(channelInfo);

    if (verdict === "text") return true;
    if (verdict === "nontext") return false;
    if (domVerdict === true) return true;

    /*
      Strict : si l'API ne prouve pas que c'est textuel et que le DOM ne montre pas
      clairement une zone de message, on cache. Sinon les MP/appels/vues vocales restent
      collés comme un chewing-gum sous le bureau.
    */
    return false;
  }

  function handleImmediateRouteHide(reason) {
    var route = getRouteInfoFromLocation();

    state.lastHref = location.href;
    state.routeKey = route.key;

    if (!route.isGuildTextCandidate) {
      clearMemberState(reason || (route.isDmRoute ? "dm-route" : "not-text-channel"));
      return true;
    }

    if (state.routeVisible && hasNonTextViewMarkers(route)) {
      clearMemberState(reason || "non-text-view");
      return true;
    }

    return false;
  }

  function hardRouteVisualGuard(reason) {
    var route = getRouteInfoFromLocation();
    var why = reason || "hard-guard";

    state.hardGuardTicks += 1;

    if (!route.isGuildTextCandidate) {
      state.lastHref = location.href;
      state.routeKey = route.key;

      if (state.routeVisible || state.members.length || state.roles.length || document.querySelector("#kaly-fluxer-memberlist-fix")) {
        clearMemberState(route.isDmRoute ? "dm-route-hard-hide" : why + ":not-text-channel");
      } else {
        forceHidePanelDom(route.isDmRoute ? "dm-route-hard-hide" : why + ":not-text-channel");
      }

      return false;
    }

    if (hasNonTextViewMarkers(route)) {
      state.lastHref = location.href;
      state.routeKey = route.key;

      if (state.routeVisible || state.members.length || state.roles.length || document.querySelector("#kaly-fluxer-memberlist-fix")) {
        clearMemberState(why + ":non-text-view");
      } else {
        forceHidePanelDom(why + ":non-text-view");
      }

      return false;
    }

    return true;
  }

  function scheduleRouteRefresh(reason) {
    if (handleImmediateRouteHide(reason || "route")) return;

    if (state.routeDebounceTimer) {
      clearTimeout(state.routeDebounceTimer);
      state.routeDebounceTimer = null;
    }

    state.routeDebounceTimer = setTimeout(function () {
      state.routeDebounceTimer = null;

      if (abortController.signal.aborted) return;

      refresh(reason || "route");
    }, 90);
  }

  function dispatchKalyRouteChange(reason) {
    try {
      window.dispatchEvent(new CustomEvent("kaly-fluxer-route-change", {
        detail: {
          reason: reason || "history",
          href: location.href
        }
      }));
    } catch (error) {
      try {
        window.dispatchEvent(new Event("kaly-fluxer-route-change"));
      } catch (errorEvent) {}
    }
  }

  function installRouteChangeWatchers() {
    if (!window.__KALY_FLUXER_ROUTE_HISTORY_PATCHED__) {
      window.__KALY_FLUXER_ROUTE_HISTORY_PATCHED__ = true;

      var nativePushState = history.pushState;
      var nativeReplaceState = history.replaceState;

      history.pushState = function () {
        var result = nativePushState.apply(this, arguments);
        dispatchKalyRouteChange("pushState");
        return result;
      };

      history.replaceState = function () {
        var result = nativeReplaceState.apply(this, arguments);
        dispatchKalyRouteChange("replaceState");
        return result;
      };
    }

    ["popstate", "hashchange", "kaly-fluxer-spa-navigation", "kaly-fluxer-route-change"].forEach(function (eventName) {
      window.addEventListener(eventName, function () {
        scheduleRouteRefresh(eventName);
      }, { signal: abortController.signal });
    });

    var routePollInterval = setInterval(function () {
      if (abortController.signal.aborted) return;

      if (location.href !== state.lastHref || routeKey() !== state.routeKey) {
        scheduleRouteRefresh("url-poll");
        return;
      }

      if (state.routeVisible && hasNonTextViewMarkers(getRouteInfoFromLocation())) {
        clearMemberState("non-text-dom-poll");
      }
    }, 350);

    window.__KALY_ML_INTERVALS__.push(routePollInterval);

    try {
      state.routeDomObserver = new MutationObserver(function () {
        if (abortController.signal.aborted) return;

        if (location.href !== state.lastHref || routeKey() !== state.routeKey) {
          scheduleRouteRefresh("dom-route-change");
          return;
        }

        if (state.routeVisible && hasNonTextViewMarkers(getRouteInfoFromLocation())) {
          clearMemberState("non-text-dom-mutation");
        }
      });

      state.routeDomObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (errorObserver) {}

    var hardGuardInterval = setInterval(function () {
      if (abortController.signal.aborted) return;

      var route = getRouteInfoFromLocation();
      var currentRouteKey = route.key;
      var hrefChanged = location.href !== state.lastHref || currentRouteKey !== state.routeKey;

      if (!hardRouteVisualGuard("hard-visual-guard")) {
        return;
      }

      if (hrefChanged) {
        scheduleRouteRefresh("hard-url-poll");
      }
    }, 120);

    window.__KALY_ML_INTERVALS__.push(hardGuardInterval);
  }

  function nextCursor(response, items) {
    if (!response || typeof response !== "object" || Array.isArray(response)) return "";

    var pagination = response.pagination || {};
    var last = items && items.length ? items[items.length - 1] : null;
    var user = last && last.user ? last.user : {};

    return String(firstValue(
      response.next_cursor,
      response.nextCursor,
      response.next,
      response.after,
      response.cursor,
      pagination.next_cursor,
      pagination.nextCursor,
      last && last.id,
      last && last.user_id,
      user && user.id
    ));
  }

  async function fetchMembers(guildId) {
    var all = [];
    var after = "";

    for (var guard = 0; guard < 20; guard += 1) {
      var path = "/guilds/" + guildId + "/members?limit=1000" + (after ? "&after=" + encodeURIComponent(after) : "");
      var response = await apiGet(path);
      var items = arrayFromResponse(response, ["members", "items", "data", "results"]);

      all = all.concat(items);

      if (items.length < 1000) break;

      var next = nextCursor(response, items);
      if (!next || next === after) break;

      after = next;
    }

    return all;
  }

  async function fetchRoles(guildId) {
    try {
      var response = await apiGet("/guilds/" + guildId + "/roles");
      return arrayFromResponse(response, ["roles", "items", "data", "results"]);
    } catch (error) {
      warn("Rôles API KO, fallback depuis membres.", error && error.message ? error.message : error);
      return [];
    }
  }

  function normalizeRole(role, apiIndex) {
    if (!role || typeof role !== "object") {
      return {
        id: String(role || ""),
        name: String(role || "Rôle"),
        hoist: false,
        position: null,
        apiIndex: apiIndex,
        order: apiIndex,
        color: "",
        raw: role
      };
    }

    var id = String(firstValue(role.id, role.role_id, role.roleId, ""));
    var name = String(firstValue(role.name, role.title, role.label, id, "Rôle"));

    var hoist = Boolean(firstValue(
      role.hoist,
      role.show_separately,
      role.showSeparately,
      role.separate,
      role.display_separately,
      role.displaySeparately,
      false
    ));

    var posRaw = firstValue(
      role.hoist_position,
      role.hoistPosition,
      role.position,
      role.rank,
      role.order,
      role.sort,
      ""
    );

    var position = posRaw === "" ? null : Number(posRaw);

    if (!Number.isFinite(position)) {
      position = null;
    }

    var color = normalizeColor(firstValue(
      role.color,
      role.colour,
      role.color_value,
      role.colorValue,
      role.colour_value,
      role.colourValue,
      role.hex_color,
      role.hexColor,
      role.role_color,
      role.roleColor,
      role.colors,
      ""
    ));

    return {
      id: id,
      name: name,
      hoist: hoist,
      position: position,
      apiIndex: apiIndex,
      order: apiIndex,
      color: color,
      raw: role
    };
  }

  function mergeRoleData(existing, incoming) {
    if (!existing || !incoming) return existing || incoming;

    if (!existing.color && incoming.color) existing.color = incoming.color;
    if (existing.position === null && incoming.position !== null) existing.position = incoming.position;
    if (!existing.hoist && incoming.hoist) existing.hoist = incoming.hoist;
    if (!existing.name && incoming.name) existing.name = incoming.name;

    return existing;
  }

  function roleFromObject(value) {
    if (!value || typeof value !== "object") return null;

    var role = normalizeRole(value, 999999);
    if (!role.id) return null;

    return role;
  }

  function extractRolesFromMember(member) {
    var containers = [
      member.roles,
      member.role_ids,
      member.roleIds,
      member.guild_roles,
      member.guildRoles,
      member.member_roles,
      member.memberRoles
    ].filter(Boolean);

    var ids = [];
    var objects = [];

    containers.forEach(function (raw) {
      if (Array.isArray(raw)) {
        raw.forEach(function (item) {
          if (item && typeof item === "object") {
            var role = roleFromObject(item);

            if (role) {
              ids.push(role.id);
              objects.push(role);
              return;
            }
          }

          ids.push(String(item));
        });
      } else if (raw && typeof raw === "object") {
        Object.keys(raw).forEach(function (key) {
          var item = raw[key];

          if (item && typeof item === "object") {
            var role = roleFromObject(item);

            if (role) {
              ids.push(role.id);
              objects.push(role);
              return;
            }
          }

          ids.push(String(key || item));
        });
      }
    });

    return {
      ids: uniq(ids.filter(function (id) {
        return id && id !== "[object Object]";
      })),
      objects: objects
    };
  }

  function parseManualRoleOrder() {
    var raw = String(localStorage.getItem(STORAGE_ROLE_MANUAL) || "").trim();

    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map(function (value) {
          return String(value).toLowerCase();
        }).filter(Boolean);
      }
    } catch (error) {
      return raw.split(",").map(function (value) {
        return value.trim().toLowerCase();
      }).filter(Boolean);
    }

    return [];
  }

  function sortRoles(roles) {
    var manual = parseManualRoleOrder();
    var mode = state.roleOrderMode || "api";

    var sorted = roles.slice().sort(function (a, b) {
      var ai = manual.indexOf(String(a.name || "").toLowerCase());
      var bi = manual.indexOf(String(b.name || "").toLowerCase());

      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }

      if (mode === "api_reverse") {
        return b.apiIndex - a.apiIndex;
      }

      if (mode === "position_desc") {
        if (a.position !== null || b.position !== null) {
          return (b.position === null ? -999999 : b.position) - (a.position === null ? -999999 : a.position) || a.apiIndex - b.apiIndex;
        }

        return a.apiIndex - b.apiIndex;
      }

      if (mode === "position_asc") {
        if (a.position !== null || b.position !== null) {
          return (a.position === null ? 999999 : a.position) - (b.position === null ? 999999 : b.position) || a.apiIndex - b.apiIndex;
        }

        return a.apiIndex - b.apiIndex;
      }

      return a.apiIndex - b.apiIndex;
    });

    sorted.forEach(function (role, index) {
      role.order = index;
    });

    return sorted;
  }

  function isDefaultRole(role) {
    var name = String(role.name || "").toLowerCase();

    return (
      name === "everyone" ||
      name === "@everyone" ||
      name === "default" ||
      name === "member" ||
      name === "members" ||
      name === "membre" ||
      name === "membres"
    );
  }

  function snapshotNativeAvatars() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll("img[src]"));

    state.nativeAvatars = imgs.map(function (img) {
      var src = img.src || "";

      if (!src || src.indexOf("data:") === 0) return null;
      if (!isSameOriginUrl(src)) return null;

      var texts = [];
      var node = img;

      for (var i = 0; i < 8 && node; i += 1) {
        if (node.textContent) texts.push(String(node.textContent).toLowerCase());

        if (node.getAttribute) {
          texts.push(String(node.getAttribute("aria-label") || "").toLowerCase());
          texts.push(String(node.getAttribute("title") || "").toLowerCase());
          texts.push(String(node.getAttribute("alt") || "").toLowerCase());
        }

        node = node.parentElement;
      }

      return {
        src: src,
        text: texts.join(" ")
      };
    }).filter(Boolean);
  }

  function collectAvatarValues(value, path, out) {
    path = path || "";
    out = out || [];

    if (!value) return out;

    var lowerPath = path.toLowerCase();

    if (typeof value === "string") {
      if (
        lowerPath.indexOf("avatar") !== -1 ||
        lowerPath.indexOf("pfp") !== -1 ||
        lowerPath.indexOf("icon") !== -1 ||
        lowerPath.indexOf("image") !== -1 ||
        lowerPath.indexOf("photo") !== -1 ||
        /^a_[a-zA-Z0-9_-]+$/.test(value) ||
        /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(value) ||
        value.indexOf("/media/") !== -1
      ) {
        out.push({ type: "string", value: value, path: path });
      }

      return out;
    }

    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        collectAvatarValues(item, path + "[" + index + "]", out);
      });

      return out;
    }

    if (typeof value === "object") {
      var looksLikeFile =
        value._id ||
        value.id ||
        value.file_id ||
        value.fileId ||
        value.filename ||
        value.fileName ||
        value.name ||
        value.url ||
        value.src ||
        value.hash;

      var looksAvatarish =
        lowerPath.indexOf("avatar") !== -1 ||
        lowerPath.indexOf("pfp") !== -1 ||
        lowerPath.indexOf("icon") !== -1 ||
        lowerPath.indexOf("image") !== -1 ||
        lowerPath.indexOf("photo") !== -1 ||
        String(value.tag || "").toLowerCase().indexOf("avatar") !== -1 ||
        String(value.bucket || "").toLowerCase().indexOf("avatar") !== -1;

      if (looksLikeFile && looksAvatarish) {
        out.push({ type: "file", value: value, path: path });
      }

      Object.keys(value).forEach(function (key) {
        collectAvatarValues(value[key], path ? path + "." + key : key, out);
      });
    }

    return out;
  }

  function fileNameVariants(raw) {
    var value = String(raw || "").trim();
    if (!value) return [];

    value = value.replace(/^\/+/, "");
    value = value.split("?")[0];

    var out = [];

    if (/\.(png|jpg|jpeg|webp|gif)$/i.test(value)) {
      out.push(value);
      out.push(value + "?size=64");
      out.push(value + "?size=128");
      return uniq(out);
    }

    if (value.indexOf("a_") === 0) {
      out.push(value + ".gif?size=64");
      out.push(value + ".webp?size=64");
      out.push(value + ".png?size=64");
      out.push(value);
    } else {
      out.push(value + ".webp?size=64");
      out.push(value + ".png?size=64");
      out.push(value + ".jpg?size=64");
      out.push(value);
    }

    return uniq(out);
  }

  function addCandidate(candidates, rawPath) {
    if (!rawPath) return;

    var url = "";

    if (/^https?:\/\//.test(rawPath)) {
      url = rawPath;
    } else if (rawPath.indexOf("/") === 0) {
      url = ORIGIN + rawPath;
    } else {
      url = CONFIG.mediaBase + "/" + rawPath.replace(/^\/+/, "");
    }

    if (isSameOriginUrl(url)) candidates.push(url);
  }

  function addAvatarRoutes(candidates, userId, rawValue) {
    if (!userId || !rawValue) return;

    fileNameVariants(rawValue).forEach(function (variant) {
      var file = variant.split("?")[0];
      var query = variant.indexOf("?") !== -1 ? "?" + variant.split("?")[1] : "";

      addCandidate(candidates, "avatars/" + encodeURIComponent(userId) + "/" + encodeURIComponent(file) + query);
      addCandidate(candidates, "avatar/" + encodeURIComponent(userId) + "/" + encodeURIComponent(file) + query);
      addCandidate(candidates, "users/" + encodeURIComponent(userId) + "/avatar/" + encodeURIComponent(file) + query);
    });
  }

  function matchNativeAvatar(member) {
    /*
      Désactivé volontairement.
      L'ancien fallback scannait le DOM natif et pouvait associer l'avatar du compte connecté
      à des membres qui n'avaient pas de photo de profil. Résultat : la PFP de Kaly partout,
      le carnaval des clones. Maintenant, si l'API ne fournit pas d'avatar fiable, on affiche
      le fallback texte au lieu de voler une image au hasard dans l'interface.
    */
    return "";
  }

  function addAvatarValuesToCandidates(candidates, item, member) {
    var value = item.value;

    if (item.type === "string") {
      var raw = String(value || "").trim();
      if (!raw) return;

      if (/^https?:\/\//.test(raw) || raw.indexOf("/") === 0) {
        addCandidate(candidates, raw);
      } else {
        addAvatarRoutes(candidates, member.id, raw);
      }

      return;
    }

    if (item.type === "file" && value && typeof value === "object") {
      var direct = firstValue(value.url, value.src, value.href, value.public_url, value.publicUrl, "");
      var fileId = String(firstValue(value._id, value.id, value.file_id, value.fileId, value.hash, value.key, ""));
      var filename = String(firstValue(value.filename, value.file_name, value.fileName, value.name, value.original_name, value.originalName, ""));

      if (direct) addCandidate(candidates, direct);
      if (filename) addAvatarRoutes(candidates, member.id, filename);
      if (fileId) addAvatarRoutes(candidates, member.id, fileId);
    }
  }

  function buildAvatarCandidates(memberRaw, userRaw, member) {
    var candidates = [];

    var cached = state.avatarCache[member.id];
    if (cached && isSameOriginUrl(cached)) candidates.push(cached);

    var nativeAvatar = matchNativeAvatar(member);
    if (nativeAvatar) candidates.push(nativeAvatar);

    collectAvatarValues(memberRaw, "", []).concat(collectAvatarValues(userRaw, "", [])).forEach(function (item) {
      addAvatarValuesToCandidates(candidates, item, member);
    });

    return uniq(candidates.filter(isSameOriginUrl));
  }

  function validateImageUrl(url) {
    return new Promise(function (resolve) {
      if (!url) {
        resolve("");
        return;
      }

      var done = false;
      var img = new Image();

      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        resolve("");
      }, CONFIG.avatarTimeoutMs);

      img.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(url);
      };

      img.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve("");
      };

      img.src = url;
    });
  }

  async function resolveAvatarForMember(member) {
    var cached = state.avatarCache[member.id];

    if (cached && isSameOriginUrl(cached)) {
      member.avatarUrl = cached;
      return cached;
    }

    var candidates = member.avatarCandidates || [];
    var limit = Math.min(candidates.length, CONFIG.avatarCandidateLimit);

    member.triedAvatarCandidates = candidates.slice(0, limit);

    for (var i = 0; i < limit; i += 1) {
      var valid = await validateImageUrl(candidates[i]);

      if (valid) {
        member.avatarUrl = valid;
        state.avatarCache[member.id] = valid;
        saveAvatarCache();
        return valid;
      }
    }

    member.avatarUrl = "";
    return "";
  }

  async function resolveAllAvatars() {
    if (state.resolvingAvatars) return false;

    state.resolvingAvatars = true;

    var changed = false;

    try {
      for (var i = 0; i < state.members.length; i += 1) {
        var before = state.members[i].avatarUrl || "";
        var after = await resolveAvatarForMember(state.members[i]);

        if (after && after !== before) changed = true;
      }
    } finally {
      state.resolvingAvatars = false;
    }

    return changed;
  }

  function normalizeMember(memberRaw, rolesById) {
    var user = firstValue(
      memberRaw.user,
      memberRaw.account,
      memberRaw.profile,
      memberRaw.user_profile,
      memberRaw.userProfile,
      memberRaw.member,
      {}
    );

    var id = String(firstValue(memberRaw.user_id, memberRaw.userId, user.id, user._id, memberRaw.id, ""));
    var username = String(firstValue(user.username, user.name, memberRaw.username, memberRaw.name, ""));

    var displayName = String(firstValue(
      memberRaw.nick,
      memberRaw.nickname,
      memberRaw.display_name,
      memberRaw.displayName,
      user.global_name,
      user.globalName,
      user.display_name,
      user.displayName,
      username,
      id
    ));

    var discriminator = String(firstValue(user.discriminator, memberRaw.discriminator, ""));
    var tag = username && discriminator && discriminator !== "0" ? username + "#" + discriminator : username;
    var extracted = extractRolesFromMember(memberRaw);

    extracted.objects.forEach(function (role) {
      if (!rolesById.has(role.id)) {
        rolesById.set(role.id, role);
      } else {
        mergeRoleData(rolesById.get(role.id), role);
      }
    });

    var roleNames = extracted.ids.map(function (roleId) {
      var role = rolesById.get(roleId);
      return role ? role.name : "";
    }).filter(Boolean);

    var cachedPresence = cleanCachedPresence(id);
    var previousStatus = normalizeStatus(state.memberStatusMemory && state.memberStatusMemory[id]);
    var apiMemberPresence = cleanApiMemberPresence(memberRaw, user);

    if (previousStatus === "offline" && cachedPresence !== "offline") {
      previousStatus = "unknown";
    }

    var status = normalizeStatus(firstValue(
      state.gatewayPresenceMap[id],
      state.domPresenceMap[id],
      cachedPresence,
      previousStatus,
      apiMemberPresence,
      ""
    ));

    var bot = Boolean(firstValue(user.bot, memberRaw.bot, user.is_bot, memberRaw.is_bot, false));

    var member = {
      id: id,
      username: username,
      displayName: displayName || username || id,
      tag: tag,
      roles: extracted.ids,
      roleNames: roleNames,
      roleObjects: [],
      topRole: null,
      colorRole: null,
      nameColor: "",
      status: status,
      presenceSource:
        state.presenceSources[id] ||
        (state.gatewayPresenceMap[id] ? "gateway" : "") ||
        (state.domPresenceMap[id] ? "dom" : ""),
      bot: bot,
      avatarCandidates: [],
      triedAvatarCandidates: [],
      avatarUrl: "",
      raw: memberRaw,
      userRaw: user
    };

    member.avatarCandidates = buildAvatarCandidates(memberRaw, user, member);

    if (state.avatarCache[id] && isSameOriginUrl(state.avatarCache[id])) {
      member.avatarUrl = state.avatarCache[id];
    }

    return member;
  }

  function applyRoleColorsToMembers(members, sortedRoles) {
    var byId = new Map();

    sortedRoles.forEach(function (role) {
      byId.set(role.id, role);
    });

    members.forEach(function (member) {
      member.roleObjects = sortedRoles.filter(function (role) {
        return member.roles.indexOf(role.id) !== -1;
      });

      member.topRole = member.roleObjects[0] || null;

      member.colorRole = member.roleObjects.find(function (role) {
        return Boolean(role.color);
      }) || null;

      member.nameColor = member.colorRole ? member.colorRole.color : "";
      member.nameColorRoleName = member.colorRole ? member.colorRole.name : "";

      member.roleNames = member.roles.map(function (roleId) {
        var role = byId.get(roleId);
        return role ? role.name : "";
      }).filter(Boolean);
    });
  }

  function findSelfFromStorage() {
    if (state.selfMemberId) {
      var fromId = state.members.find(function (member) {
        return member.id === state.selfMemberId;
      });

      if (fromId) return fromId;
    }

    var storageBlob = "";

    [localStorage, sessionStorage].forEach(function (storage) {
      if (!storage) return;

      for (var i = 0; i < storage.length; i += 1) {
        var key = storage.key(i) || "";
        var value = storage.getItem(key) || "";

        if (
          /auth|session|token|user|account|profile|me|current/i.test(key) ||
          /user|account|profile|username|display/i.test(value)
        ) {
          storageBlob += " " + key + " " + value;
        }
      }
    });

    var normalizedBlob = normalizeText(storageBlob);
    var best = null;

    state.members.forEach(function (member) {
      var score = 0;

      if (member.id && storageBlob.indexOf(member.id) !== -1) score += 100;

      [
        member.displayName,
        member.username,
        member.tag
      ].forEach(function (needle) {
        var normalizedNeedle = normalizeText(needle);

        if (!normalizedNeedle) return;

        if (normalizedBlob.indexOf(normalizedNeedle) !== -1) {
          score += normalizedNeedle.length > 8 ? 40 : 15;
        }
      });

      if (!best || score > best.score) {
        best = {
          member: member,
          score: score
        };
      }
    });

    return best && best.score > 0 ? best.member : null;
  }

  function findSelfFromDom() {
    var candidates = [];
    var nodes = Array.prototype.slice.call(document.querySelectorAll("body *"));

    nodes.forEach(function (node) {
      if (!node || !node.textContent) return;
      if (node.closest && node.closest("#kaly-fluxer-memberlist-fix")) return;
      if (node.closest && node.closest("#kaly-fluxer-memberlist-popout")) return;

      var text = String(node.textContent || "");
      var lower = text.toLowerCase();

      if (lower.indexOf("en ligne") === -1 && lower.indexOf("online") === -1) return;

      var rect = node.getBoundingClientRect();
      var looksLikeSelfArea = rect.left < 430 && rect.width < 460 && rect.height < 260;

      if (!looksLikeSelfArea) return;

      var blob = text;
      var parent = node.parentElement;
      var depth = 0;

      while (parent && depth < 6) {
        blob += " " + String(parent.textContent || "");
        blob += " " + String(parent.getAttribute ? parent.getAttribute("aria-label") || "" : "");
        blob += " " + String(parent.getAttribute ? parent.getAttribute("title") || "" : "");
        parent = parent.parentElement;
        depth += 1;
      }

      var normalizedBlob = normalizeText(blob);

      state.members.forEach(function (member) {
        var score = 0;

        [
          member.displayName,
          member.username,
          member.tag,
          member.id
        ].forEach(function (needle) {
          var normalizedNeedle = normalizeText(needle);

          if (!normalizedNeedle) return;

          if (normalizedBlob.indexOf(normalizedNeedle) !== -1) {
            score += normalizedNeedle.length > 8 ? 50 : 25;
          }
        });

        if (score > 0) {
          candidates.push({
            member: member,
            score: score
          });
        }
      });
    });

    candidates.sort(function (a, b) {
      return b.score - a.score;
    });

    return candidates[0] ? candidates[0].member : null;
  }

  function findSelf() {
    return findSelfFromStorage() || findSelfFromDom();
  }

  function forceSelfOnline() {
    if (!state.members.length) return false;

    var self = findSelf();

    if (!self || !self.id) return false;

    state.selfMemberId = self.id;
    localStorage.setItem(STORAGE_SELF_ID, self.id);

    state.presenceMap[self.id] = "online";
    state.presenceSources[self.id] = "self-ui-forced-online";
    state.rawPresenceByUserId[self.id] = {
      reason: "self detected from local UI or storage",
      version: VERSION
    };

    state.gatewayPresenceMap[self.id] = "online";
    state.domPresenceMap[self.id] = "online";

    self.status = "online";
    self.presenceSource = "self-ui-forced-online";
    rememberMemberStatus(self.id, "online");

    state.presenceStats.selfForced = true;

    savePresenceCache();

    return true;
  }

  function scanNativeDomPresence() {
    if (!state.members.length) {
      state.presenceStats.domScans += 1;
      return 0;
    }

    var found = 0;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("body *")).filter(function (node) {
      if (!node || !node.textContent) return false;
      if (node.closest && node.closest("#kaly-fluxer-memberlist-fix")) return false;
      if (node.closest && node.closest("#kaly-fluxer-memberlist-popout")) return false;

      var text = String(node.textContent || "").trim();
      if (!text || text.length > 700) return false;

      return true;
    });

    state.members.forEach(function (member) {
      var needles = uniq([
        member.id,
        member.username,
        member.displayName,
        member.tag
      ]).map(function (value) {
        return String(value || "").toLowerCase();
      }).filter(Boolean);

      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        var text = String(node.textContent || "");
        var lowerText = text.toLowerCase();

        var matched = needles.some(function (needle) {
          return needle && lowerText.indexOf(needle) !== -1;
        });

        if (!matched) continue;

        var probe = [
          text,
          node.className || "",
          node.getAttribute ? node.getAttribute("aria-label") || "" : "",
          node.getAttribute ? node.getAttribute("title") || "" : ""
        ].join(" ");

        var parent = node.parentElement;
        var depth = 0;

        while (parent && depth < 5) {
          probe += " " + String(parent.className || "");
          probe += " " + String(parent.getAttribute ? parent.getAttribute("aria-label") || "" : "");
          probe += " " + String(parent.getAttribute ? parent.getAttribute("title") || "" : "");
          parent = parent.parentElement;
          depth += 1;
        }

        var status = detectStatusFromText(probe);

        if (status !== "unknown") {
          state.domPresenceMap[member.id] = status;

          if (mergePresence(member.id, status, "dom-native", { text: text.slice(0, 200) })) {
            found += 1;
          }

          break;
        }
      }
    });

    state.presenceStats.domScans += 1;
    return found;
  }

  function applyPresenceToMembers() {
    var found = false;

    state.members.forEach(function (member) {
      var status = normalizeStatus(firstValue(
        state.presenceMap[member.id],
        state.gatewayPresenceMap[member.id],
        state.domPresenceMap[member.id],
        member.status,
        ""
      ));

      if (status !== "unknown") {
        member.status = status;
        rememberMemberStatus(member.id, status);
        found = true;
      }

      member.presenceSource =
        state.presenceSources[member.id] ||
        (state.gatewayPresenceMap[member.id] ? "gateway" : "") ||
        (state.domPresenceMap[member.id] ? "dom" : "") ||
        member.presenceSource ||
        "";

      if (state.avatarCache[member.id] && isSameOriginUrl(state.avatarCache[member.id])) {
        member.avatarUrl = state.avatarCache[member.id];
      }
    });

    forceSelfOnline();

    state.hasPresence = found || state.presenceStats.selfForced;
  }

  function buildGroups() {
    var initialRoles = state.rolesRaw.map(function (roleRaw, index) {
      return normalizeRole(roleRaw, index);
    }).filter(function (role) {
      return role.id;
    });

    var rolesById = new Map();

    initialRoles.forEach(function (role) {
      rolesById.set(role.id, role);
    });

    if (!state.memberStatusMemory) state.memberStatusMemory = {};

    state.members.forEach(function (member) {
      if (member && member.id && member.status && member.status !== "unknown") {
        rememberMemberStatus(member.id, member.status);
      }
    });

    var previousAvatarUrls = {};

    state.members.forEach(function (member) {
      if (member.id && member.avatarUrl) {
        previousAvatarUrls[member.id] = member.avatarUrl;
      }
    });

    var members = state.membersRaw.map(function (memberRaw) {
      return normalizeMember(memberRaw, rolesById);
    }).filter(function (member) {
      return member.id;
    });

    members.forEach(function (member) {
      if (!member.avatarUrl && previousAvatarUrls[member.id]) {
        member.avatarUrl = previousAvatarUrls[member.id];
        state.avatarCache[member.id] = previousAvatarUrls[member.id];
      }

      if (!member.avatarUrl && state.avatarCache[member.id] && isSameOriginUrl(state.avatarCache[member.id])) {
        member.avatarUrl = state.avatarCache[member.id];
      }
    });

    var allRoles = sortRoles(Array.from(rolesById.values()));
    var separatedRoles = allRoles.filter(function (role) {
      return role.hoist && !isDefaultRole(role);
    });

    if (!separatedRoles.length) {
      separatedRoles = allRoles.filter(function (role) {
        return !isDefaultRole(role);
      });
    }

    state.rolesById = rolesById;
    state.roles = allRoles;
    state.members = members;

    applyRoleColorsToMembers(state.members, allRoles);
    applyPresenceToMembers();

    var groupMap = new Map();

    function addGroup(key, name, order, member, color) {
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key: key,
          name: name,
          order: order,
          color: color || "",
          members: []
        });
      }

      groupMap.get(key).members.push(member);
    }

    members.forEach(function (member) {
      if (state.hasPresence && member.status === "offline") {
        addGroup("offline", "Hors ligne", 999999, member, "");
        return;
      }

      if (state.hasPresence && member.status === "unknown") {
        addGroup("unknown", "Statut inconnu", 999998, member, "");
        return;
      }

      var selectedRole = null;

      for (var i = 0; i < separatedRoles.length; i += 1) {
        if (member.roles.indexOf(separatedRoles[i].id) !== -1) {
          selectedRole = separatedRoles[i];
          break;
        }
      }

      if (selectedRole) {
        addGroup("role:" + selectedRole.id, selectedRole.name, selectedRole.order, member, selectedRole.color);
      } else {
        addGroup("online", state.hasPresence ? "En ligne" : "Membres", 999997, member, "");
      }
    });

    state.groups = Array.from(groupMap.values()).map(function (group) {
      group.members = group.members.sort(function (a, b) {
        return statusRank(a.status) - statusRank(b.status) || a.displayName.localeCompare(b.displayName);
      });

      return group;
    }).sort(function (a, b) {
      return a.order - b.order || a.name.localeCompare(b.name);
    });

    saveAvatarCache();
  }

  function avatarHtml(member, imageClass) {
    imageClass = imageClass || "kml-avatar-img";

    if (member.avatarUrl) {
      return '<img class="' + escapeHtml(imageClass) + '" src="' + escapeHtml(member.avatarUrl) + '" alt="">';
    }

    return '<div class="kml-avatar-fallback">' + escapeHtml((member.displayName || "?").slice(0, 1).toUpperCase()) + '</div>';
  }

  function roleChipHtml(roleOrName) {
    var role = null;

    if (typeof roleOrName === "string") {
      role = state.roles.find(function (item) {
        return item.name === roleOrName;
      }) || {
        name: roleOrName,
        color: ""
      };
    } else {
      role = roleOrName || {
        name: "Rôle",
        color: ""
      };
    }

    var dot = role.color
      ? '<span class="kml-role-dot" style="background:' + escapeHtml(role.color) + '"></span>'
      : '<span class="kml-role-dot kml-role-dot-empty"></span>';

    return '<span class="kml-role-chip">' + dot + escapeHtml(role.name || "Rôle") + '</span>';
  }

  function ensureStyle() {
    if (document.querySelector("#kaly-fluxer-memberlist-style")) return;

    var style = document.createElement("style");
    style.id = "kaly-fluxer-memberlist-style";

    style.textContent = `
#kaly-fluxer-memberlist-fix{position:fixed;top:${CONFIG.topOffset}px;right:0;bottom:0;width:${CONFIG.panelWidth}px;z-index:var(--kaly-memberlist-z-index,5);box-sizing:border-box;background:#241735;color:#eee8ff;border-left:1px solid rgba(255,255,255,.07);box-shadow:none;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
#kaly-fluxer-memberlist-fix[data-kaly-force-hidden="1"],html[data-kaly-ml-route-visible="0"] #kaly-fluxer-memberlist-fix{display:none!important;visibility:hidden!important;pointer-events:none!important}
#kaly-fluxer-memberlist-fix *{box-sizing:border-box}
#kaly-fluxer-memberlist-fix .kml-header{height:62px;padding:12px 14px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(10,5,18,.24)}
#kaly-fluxer-memberlist-fix .kml-title{font-size:14px;font-weight:800;letter-spacing:.02em;color:#fff}
#kaly-fluxer-memberlist-fix .kml-subtitle{margin-top:2px;font-size:11px;color:#b8a8d6}
#kaly-fluxer-memberlist-fix .kml-actions{display:flex;gap:6px}
#kaly-fluxer-memberlist-fix .kml-small-btn{width:30px;height:30px;border:0;border-radius:10px;color:#fff;background:rgba(130,80,220,.42);cursor:pointer;font-size:15px;line-height:30px}
#kaly-fluxer-memberlist-fix .kml-small-btn:hover{background:rgba(160,105,255,.7)}
#kaly-fluxer-memberlist-fix .kml-scroll{height:calc(100% - 62px);overflow-y:auto;padding:8px 6px 20px 8px;scrollbar-width:thin}
#kaly-fluxer-memberlist-fix .kml-group{margin:8px 0 14px}
#kaly-fluxer-memberlist-fix .kml-group-title{padding:7px 8px 5px;font-size:12px;font-weight:800;color:#bfb0d8;letter-spacing:.02em;display:flex;align-items:center;gap:6px}
#kaly-fluxer-memberlist-fix .kml-group-dot{width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.25);display:inline-block;flex:0 0 auto}
#kaly-fluxer-memberlist-fix .kml-member{width:100%;min-height:42px;padding:6px 8px;display:flex;align-items:center;gap:9px;border:0;border-radius:12px;color:#f3edff;background:transparent;cursor:pointer;text-align:left;font:inherit}
#kaly-fluxer-memberlist-fix .kml-member:hover{background:rgba(125,75,210,.30)}
#kaly-fluxer-memberlist-fix .kml-avatar{width:32px;height:32px;position:relative;flex:0 0 auto;border-radius:50%;background:#130b1f;overflow:visible}
#kaly-fluxer-memberlist-fix .kml-avatar-img,#kaly-fluxer-memberlist-fix .kml-avatar-fallback{width:32px;height:32px;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center}
#kaly-fluxer-memberlist-fix .kml-avatar-fallback,#kaly-fluxer-memberlist-popout .kml-avatar-fallback{font-size:13px;font-weight:800;color:#fff;background:linear-gradient(135deg,#7c3aed,#34204f)}
#kaly-fluxer-memberlist-fix .kml-dot{width:11px;height:11px;position:absolute;right:-1px;bottom:-1px;border-radius:50%;border:2px solid #241735;background:#777}
.kml-dot-online{background:#22c55e!important}.kml-dot-idle{background:#f59e0b!important}.kml-dot-dnd{background:#ef4444!important}.kml-dot-offline{background:#6b6478!important}.kml-dot-unknown{background:#8b7aa8!important}
#kaly-fluxer-memberlist-fix .kml-member-text{min-width:0;flex:1}
#kaly-fluxer-memberlist-fix .kml-name{font-size:14px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#kaly-fluxer-memberlist-fix .kml-tag{margin-top:1px;font-size:11px;color:#aa9bc4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kml-bot{display:inline-block;margin-left:4px;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:900;line-height:1.2;color:#fff;background:#7c3aed;vertical-align:1px}
#kaly-fluxer-memberlist-fix .kml-empty,#kaly-fluxer-memberlist-fix .kml-error{margin:12px;padding:10px;border-radius:12px;font-size:12px;line-height:1.45;color:#d9cff2;background:rgba(0,0,0,.22)}
#kaly-fluxer-memberlist-fix .kml-error{color:#ffd7d7;background:rgba(185,28,28,.24)}
#kaly-fluxer-memberlist-popout{position:fixed;width:310px;z-index:var(--kaly-memberlist-popout-z-index,6);border-radius:18px;overflow:hidden;color:#f5efff;background:#171020;border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 72px rgba(0,0,0,.55);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#kaly-fluxer-memberlist-popout .kml-popout-banner{height:74px;background:radial-gradient(circle at 20% 25%,rgba(168,85,247,.85),transparent 32%),linear-gradient(135deg,#4c1d95,#1e102f 72%)}
#kaly-fluxer-memberlist-popout .kml-popout-body{position:relative;padding:48px 14px 14px}
#kaly-fluxer-memberlist-popout .kml-popout-avatar{width:72px;height:72px;position:absolute;top:-36px;left:14px;border-radius:50%;background:#130b1f;border:5px solid #171020;overflow:hidden}
#kaly-fluxer-memberlist-popout .kml-popout-avatar img,#kaly-fluxer-memberlist-popout .kml-popout-avatar .kml-avatar-fallback{width:62px;height:62px;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:24px}
#kaly-fluxer-memberlist-popout .kml-popout-name{font-size:18px;font-weight:850;color:#fff;overflow-wrap:anywhere}
#kaly-fluxer-memberlist-popout .kml-popout-tag{margin-top:2px;font-size:12px;color:#a99bbc;overflow-wrap:anywhere}
#kaly-fluxer-memberlist-popout .kml-popout-status{margin-top:10px;display:flex;align-items:center;gap:7px;font-size:12px;color:#cfc4e4}
#kaly-fluxer-memberlist-popout .kml-popout-dot{width:10px;height:10px;border-radius:50%}
#kaly-fluxer-memberlist-popout .kml-popout-section{margin-top:14px}
#kaly-fluxer-memberlist-popout .kml-popout-section-title{margin-bottom:7px;font-size:11px;font-weight:900;color:#a99bbc;text-transform:uppercase;letter-spacing:.05em}
#kaly-fluxer-memberlist-popout .kml-role-chip{display:inline-flex;align-items:center;margin:0 6px 6px 0;padding:4px 8px;border-radius:999px;font-size:12px;color:#eee8ff;background:rgba(124,58,237,.24);gap:6px}
#kaly-fluxer-memberlist-popout .kml-role-dot{width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.35);display:inline-block;flex:0 0 auto}
#kaly-fluxer-memberlist-popout .kml-role-dot-empty{background:rgba(255,255,255,.18)}
#kaly-fluxer-memberlist-popout .kml-copy-id{width:100%;margin-top:10px;padding:8px 10px;border:0;border-radius:10px;color:#fff;background:rgba(124,58,237,.48);cursor:pointer;font-weight:800}
#kaly-fluxer-memberlist-popout .kml-copy-id:hover{background:rgba(147,51,234,.72)}
@media(max-width:900px){#kaly-fluxer-memberlist-fix{display:none}}
`;

    document.head.appendChild(style);
  }

  function ensurePanel() {
    ensureStyle();

    var panel = document.createElement("aside");
    panel.id = "kaly-fluxer-memberlist-fix";
    panel.setAttribute("aria-label", "Liste membres corrigée");

    document.body.appendChild(panel);
    state.panel = panel;

    return panel;
  }

  function closePopout() {
    var popout = document.querySelector("#kaly-fluxer-memberlist-popout");
    if (popout) popout.remove();
    state.popout = null;
  }

  function openPopout(member, anchor) {
    closePopout();

    var rect = anchor.getBoundingClientRect();
    var popout = document.createElement("div");

    popout.id = "kaly-fluxer-memberlist-popout";
    popout.setAttribute("data-kml-member-name", member.displayName);

    var roleList = member.roleObjects && member.roleObjects.length
      ? member.roleObjects
      : member.roleNames;

    var chips = roleList.length
      ? roleList.map(function (role) {
        return roleChipHtml(role);
      }).join("")
      : '<span class="kml-role-chip"><span class="kml-role-dot kml-role-dot-empty"></span>Aucun rôle détecté</span>';

    var botBadge = member.bot ? '<span class="kml-bot">BOT</span>' : "";
    var nameStyle = member.nameColor ? ' style="color:' + escapeHtml(member.nameColor) + '"' : "";

    popout.innerHTML =
      '<div class="kml-popout-banner"></div>' +
      '<div class="kml-popout-body">' +
      '<div class="kml-popout-avatar">' + avatarHtml(member, "kml-popout-avatar-img") + '</div>' +
      '<div class="kml-popout-name"' + nameStyle + '>' + escapeHtml(member.displayName) + " " + botBadge + '</div>' +
      '<div class="kml-popout-tag">' + escapeHtml(member.tag || member.id) + '</div>' +
      '<div class="kml-popout-status"><span class="kml-popout-dot kml-dot-' + escapeHtml(member.status) + '"></span><span>' + escapeHtml(statusLabel(member.status)) + '</span></div>' +
      '<div class="kml-popout-section"><div class="kml-popout-section-title">Couleur pseudo</div><div><span class="kml-role-chip">' + (member.nameColor ? '<span class="kml-role-dot" style="background:' + escapeHtml(member.nameColor) + '"></span>' : '<span class="kml-role-dot kml-role-dot-empty"></span>') + escapeHtml(member.nameColorRoleName || "aucune") + '</span></div></div>' +
      '<div class="kml-popout-section"><div class="kml-popout-section-title">Source statut</div><div><span class="kml-role-chip"><span class="kml-role-dot kml-role-dot-empty"></span>' + escapeHtml(member.presenceSource || "aucune") + '</span></div></div>' +
      '<div class="kml-popout-section"><div class="kml-popout-section-title">Rôles</div><div>' + chips + '</div></div>' +
      '<button class="kml-copy-id" type="button">Copier l’ID</button>' +
      '</div>';

    document.body.appendChild(popout);

    var width = 310;
    var left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left - width - 10));
    var top = Math.max(12, Math.min(window.innerHeight - 360, rect.top - 20));

    popout.style.left = left + "px";
    popout.style.top = top + "px";

    var copyButton = popout.querySelector(".kml-copy-id");

    if (copyButton) {
      copyButton.addEventListener("click", async function (event) {
        try {
          await navigator.clipboard.writeText(member.id);
          event.currentTarget.textContent = "ID copié";

          setTimeout(function () {
            event.currentTarget.textContent = "Copier l’ID";
          }, 1200);
        } catch (error) {
          event.currentTarget.textContent = member.id;
        }
      }, { signal: abortController.signal });
    }

    state.popout = popout;
  }

  function bindOnce(element, eventName, key, handler) {
    if (!element) return;

    var attr = "data-kml-bound-" + key;
    if (element.getAttribute(attr) === "1") return;

    element.setAttribute(attr, "1");
    element.addEventListener(eventName, handler, { signal: abortController.signal });
  }

  function panelShellHtml() {
    return '<div class="kml-header">' +
      '<div><div class="kml-title">Membres</div><div class="kml-subtitle">Initialisation</div></div>' +
      '<div class="kml-actions">' +
      '<button class="kml-small-btn kml-rolemode" type="button" title="Changer le mode ordre rôles">↕</button>' +
      '<button class="kml-small-btn kml-self" type="button" title="Me forcer en ligne">●</button>' +
      '<button class="kml-small-btn kml-offline" type="button" title="Mettre les inconnus hors ligne">⦿</button>' +
      '<button class="kml-small-btn kml-refresh" type="button" title="Rafraîchir">↻</button>' +
      '</div>' +
      '</div>' +
      '<div class="kml-scroll"></div>';
  }

  function bindPanelActions() {
    if (!state.panel) return;

    bindOnce(state.panel.querySelector(".kml-refresh"), "click", "refresh", function () {
      refresh("button");
    });

    bindOnce(state.panel.querySelector(".kml-rolemode"), "click", "rolemode", function () {
      cycleRoleOrderMode();
    });

    bindOnce(state.panel.querySelector(".kml-offline"), "click", "offline", function () {
      markUnknownAsOffline();
    });

    bindOnce(state.panel.querySelector(".kml-self"), "click", "self", function () {
      forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();
    });
  }

  function ensurePanelShell() {
    if (!state.panel) return null;

    if (!state.panel.querySelector(".kml-header") || !state.panel.querySelector(".kml-scroll")) {
      state.panel.innerHTML = panelShellHtml();
      state.lastGroupsHtml = "";
    }

    bindPanelActions();
    return state.panel.querySelector(".kml-scroll");
  }

  function setPanelSubtitle(text) {
    if (!state.panel) return;

    var subtitle = state.panel.querySelector(".kml-subtitle");
    if (subtitle) subtitle.textContent = text;
  }

  function renderLoading(text) {
    var scroll = ensurePanelShell();
    setPanelSubtitle(text);

    if (!scroll) return;

    if (!state.members.length) {
      scroll.innerHTML = '<div class="kml-empty">Chargement du menu complet. Couleurs de rôles activées.</div>';
      state.lastGroupsHtml = scroll.innerHTML;
    }
  }

  function renderError(error) {
    state.lastError = error && error.message ? error.message : String(error);

    var scroll = ensurePanelShell();
    setPanelSubtitle("Erreur console");

    if (scroll) {
      scroll.innerHTML = '<div class="kml-error">' + escapeHtml(state.lastError) + '</div>';
      state.lastGroupsHtml = scroll.innerHTML;
    }

    warn(error);
  }

  function memberButtonHtml(member) {
    var botBadge = member.bot ? '<span class="kml-bot">BOT</span>' : "";
    var tag = member.tag ? '<div class="kml-tag">' + escapeHtml(member.tag) + '</div>' : "";
    var nameStyle = member.nameColor ? ' style="color:' + escapeHtml(member.nameColor) + '"' : "";

    return '<button class="kml-member" type="button" data-kml-member-id="' + escapeHtml(member.id) + '" data-kml-member-name="' + escapeHtml(member.displayName) + '">' +
      '<div class="kml-avatar">' + avatarHtml(member) + '<span title="' + escapeHtml(statusLabel(member.status)) + '" class="kml-dot kml-dot-' + escapeHtml(member.status) + '"></span></div>' +
      '<div class="kml-member-text"><div class="kml-name"' + nameStyle + ' title="' + escapeHtml(member.nameColorRoleName || "") + '">' + escapeHtml(member.displayName) + " " + botBadge + '</div>' + tag + '</div>' +
      '</button>';
  }

  function groupsListHtml() {
    return state.groups.map(function (group) {
      var groupDot = group.color
        ? '<span class="kml-group-dot" style="background:' + escapeHtml(group.color) + '"></span>'
        : '<span class="kml-group-dot"></span>';

      var membersHtml = group.members.map(function (member) {
        return memberButtonHtml(member);
      }).join("");

      return '<section class="kml-group" data-kml-group-key="' + escapeHtml(group.key || group.name) + '"><div class="kml-group-title">' + groupDot + '<span>' + escapeHtml(group.name) + " - " + group.members.length + '</span></div>' + membersHtml + '</section>';
    }).join("");
  }

  function bindMemberButtons() {
    if (!state.panel) return;

    Array.prototype.slice.call(state.panel.querySelectorAll(".kml-member")).forEach(function (button) {
      bindOnce(button, "click", "member", function () {
        var id = button.getAttribute("data-kml-member-id");
        var member = state.members.find(function (item) {
          return item.id === id;
        });

        if (member) openPopout(member, button);
      });
    });
  }

  function render() {
    if (!state.panel) return;

    var scroll = ensurePanelShell();
    if (!scroll) return;

    var total = state.members.length;
    setPanelSubtitle(total + " membres via API");

    var nextHtml = groupsListHtml() || '<div class="kml-empty">Aucun membre reçu.</div>';

    if (state.lastGroupsHtml !== nextHtml) {
      var previousScrollTop = scroll.scrollTop;
      scroll.innerHTML = nextHtml;
      scroll.scrollTop = previousScrollTop;
      state.lastGroupsHtml = nextHtml;
    }

    bindMemberButtons();
  }

  function cycleRoleOrderMode() {
    var modes = ["api", "api_reverse", "position_desc", "position_asc"];
    var currentIndex = modes.indexOf(state.roleOrderMode);
    var next = modes[(currentIndex + 1 + modes.length) % modes.length];

    state.roleOrderMode = next;
    CONFIG.roleOrderMode = next;
    localStorage.setItem(STORAGE_ROLE_MODE, next);

    buildGroups();
    render();

    console.log("[KalyMemberList] Mode ordre rôles :", next);
    return next;
  }

  function markUnknownAsOffline() {
    forceSelfOnline();

    state.members.forEach(function (member) {
      if (state.selfMemberId && member.id === state.selfMemberId) return;

      if (!state.presenceMap[member.id] && member.status === "unknown") {
        state.presenceMap[member.id] = "offline";
        state.presenceSources[member.id] = "console-fallback-offline";
        rememberMemberStatus(member.id, "offline");
      }
    });

    forceSelfOnline();
    savePresenceCache();
    applyPresenceToMembers();
    buildGroups();
    render();

    return true;
  }

  async function refresh(reason) {
    if (state.refreshing) {
      state.pendingRefresh = true;
      return false;
    }

    var route = getRouteInfoFromLocation();
    var startRouteKey = route.key;

    state.routeKey = startRouteKey;
    state.lastRouteReason = reason || "manual";

    if (!route.isGuildTextCandidate) {
      return clearMemberState(route.isDmRoute ? "dm-route" : "not-text-channel");
    }

    state.refreshing = true;

    try {
      setPanelVisible(true, reason || "refresh");
      renderLoading(state.members.length ? "Actualisation salon" : "Chargement salon");

      state.goodHeaders = null;
      state.attempted = [];

      var textChannel = await isCurrentRouteTextChannel(route);

      if (routeKey() !== startRouteKey) {
        state.pendingRefresh = true;
        return false;
      }

      if (!textChannel) {
        return clearMemberState("non-text-channel");
      }

      snapshotNativeAvatars();

      var guildId = getGuildIdGuess();

      if (!guildId) {
        throw new Error("ID serveur introuvable. Mets localStorage.kaly_fluxer_memberlist_guild_id.");
      }

      state.guildId = guildId;

      state.membersRaw = await fetchMembers(guildId);

      if (routeKey() !== startRouteKey) {
        state.pendingRefresh = true;
        return false;
      }

      state.rolesRaw = await fetchRoles(guildId);

      if (routeKey() !== startRouteKey) {
        state.pendingRefresh = true;
        return false;
      }

      buildGroups();
      scanNativeDomPresence();
      forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();

      log("version", VERSION, "base", state.base, "guild", state.guildId, "channel", getChannelIdGuess(), "members", state.members.length, "roles", state.roles.length, "roleMode", state.roleOrderMode, "reason", reason || "manual");

      var avatarChanged = await resolveAllAvatars();

      if (routeKey() !== startRouteKey) {
        state.pendingRefresh = true;
        return false;
      }

      if (avatarChanged) {
        forceSelfOnline();
        applyPresenceToMembers();
        buildGroups();
        render();
        log("avatars validés");
      } else {
        buildGroups();
        render();
      }

      return true;
    } catch (error) {
      renderError(error);
      return false;
    } finally {
      state.refreshing = false;

      if (state.pendingRefresh) {
        state.pendingRefresh = false;
        scheduleRouteRefresh("pending-route");
      }
    }
  }

  document.addEventListener("mousedown", function (event) {
    if (!state.popout) return;
    if (state.popout.contains(event.target)) return;
    if (state.panel && state.panel.contains(event.target)) return;

    closePopout();
  }, { signal: abortController.signal });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePopout();
  }, { signal: abortController.signal });

  installMessageEventDataHook();
  installFutureWebSocketHook();
  installRouteChangeWatchers();
  ensurePanel();

  var presenceInterval = setInterval(function () {
    if (!state.routeVisible || !state.members.length) return;

    var changed = scanNativeDomPresence();
    var selfChanged = forceSelfOnline();

    if (changed > 0 || selfChanged) {
      applyPresenceToMembers();
      buildGroups();
      render();
    }
  }, 1500);

  window.__KALY_ML_INTERVALS__.push(presenceInterval);

  window.KalyFluxerMemberListFix = {
    version: VERSION,
    state: state,
    config: CONFIG,
    refresh: refresh,
    render: render,
    closePopout: closePopout,
    scanPresence: function () {
      var changed = scanNativeDomPresence();
      forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();
      return changed;
    },
    cycleRoleOrderMode: cycleRoleOrderMode,
    setRoleOrderMode: function (mode) {
      var modes = ["api", "api_reverse", "position_desc", "position_asc"];

      if (modes.indexOf(mode) === -1) {
        console.warn("Modes valides :", modes);
        return false;
      }

      state.roleOrderMode = mode;
      CONFIG.roleOrderMode = mode;
      localStorage.setItem(STORAGE_ROLE_MODE, mode);

      buildGroups();
      render();

      return true;
    },
    dumpRoleOrder: function () {
      return state.roles.map(function (role) {
        return {
          name: role.name,
          id: role.id,
          apiIndex: role.apiIndex,
          position: role.position,
          order: role.order,
          hoist: role.hoist,
          color: role.color,
          raw: role.raw
        };
      });
    },
    dumpMemberColors: function () {
      return state.members.map(function (member) {
        return {
          name: member.displayName,
          id: member.id,
          nameColor: member.nameColor,
          colorRole: member.nameColorRoleName,
          roles: member.roleObjects.map(function (role) {
            return {
              name: role.name,
              color: role.color,
              order: role.order,
              apiIndex: role.apiIndex
            };
          })
        };
      });
    },
    setManualRoleOrder: function (roles) {
      if (!Array.isArray(roles)) {
        console.warn("Exemple : KalyFluxerMemberListFix.setManualRoleOrder(['Admin','Modo','Membres'])");
        return false;
      }

      localStorage.setItem(STORAGE_ROLE_MANUAL, JSON.stringify(roles));
      buildGroups();
      render();

      return true;
    },
    clearManualRoleOrder: function () {
      localStorage.removeItem(STORAGE_ROLE_MANUAL);
      buildGroups();
      render();
      return true;
    },
    markUnknownAsOffline: markUnknownAsOffline,
    forceSelfOnline: function () {
      var ok = forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();
      return ok;
    },
    setSelfById: function (id) {
      id = String(id || "");
      var member = state.members.find(function (item) {
        return item.id === id;
      });

      if (!member) return false;

      state.selfMemberId = member.id;
      localStorage.setItem(STORAGE_SELF_ID, member.id);
      forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();
      return true;
    },
    setSelfByName: function (name) {
      var needle = normalizeText(name);
      var member = state.members.find(function (item) {
        return normalizeText(item.displayName).indexOf(needle) !== -1 ||
          normalizeText(item.username).indexOf(needle) !== -1 ||
          normalizeText(item.tag).indexOf(needle) !== -1;
      });

      if (!member) return false;

      state.selfMemberId = member.id;
      localStorage.setItem(STORAGE_SELF_ID, member.id);
      forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();
      return true;
    },
    clearAvatarCache: function () {
      state.avatarCache = {};
      localStorage.removeItem(STORAGE_AVATAR);
      buildGroups();
      render();
      resolveAllAvatars().then(function () {
        buildGroups();
        render();
      });
      return true;
    },
    clearPresenceCache: function () {
      state.presenceMap = {};
      state.presenceSources = {};
      state.rawPresenceByUserId = {};
      state.memberStatusMemory = {};
      localStorage.removeItem(STORAGE_PRESENCE);
      forceSelfOnline();
      applyPresenceToMembers();
      buildGroups();
      render();
      return true;
    },
    stop: function () {
      abortController.abort();

      if (Array.isArray(window.__KALY_ML_INTERVALS__)) {
        window.__KALY_ML_INTERVALS__.forEach(function (id) {
          clearInterval(id);
        });
      }

      window.__KALY_ML_INTERVALS__ = [];

      if (state.routeDebounceTimer) {
        clearTimeout(state.routeDebounceTimer);
        state.routeDebounceTimer = null;
      }

      if (state.routeDomObserver && typeof state.routeDomObserver.disconnect === "function") {
        try {
          state.routeDomObserver.disconnect();
        } catch (errorObserverDisconnect) {}
        state.routeDomObserver = null;
      }

      [
        "#kaly-fluxer-memberlist-fix",
        "#kaly-fluxer-memberlist-popout",
        "#kaly-fluxer-memberlist-style"
      ].forEach(function (selector) {
        var el = document.querySelector(selector);
        if (el) el.remove();
      });

      delete window.KalyFluxerMemberListFix;
    },
    dump: function (namePart) {
      var needle = String(namePart || "").toLowerCase();

      var member = state.members.find(function (item) {
        return item.displayName.toLowerCase().indexOf(needle) !== -1;
      }) || state.members[0];

      var self = state.members.find(function (item) {
        return item.id === state.selfMemberId;
      }) || null;

      return {
        version: VERSION,
        apiBase: state.base,
        mediaBase: CONFIG.mediaBase,
        guildId: state.guildId,
        roleOrderMode: state.roleOrderMode,
        roleOrder: state.roles.map(function (role) {
          return {
            name: role.name,
            apiIndex: role.apiIndex,
            position: role.position,
            order: role.order,
            hoist: role.hoist,
            color: role.color
          };
        }),
        coloredMembersCount: state.members.filter(function (item) {
          return Boolean(item.nameColor);
        }).length,
        groups: state.groups.map(function (group) {
          return { name: group.name, count: group.members.length, order: group.order, color: group.color };
        }),
        selfMemberId: state.selfMemberId,
        selfMember: self,
        attempted: state.attempted,
        tokenCandidatesCount: getTokenCandidates().length,
        sessionCookieReadable: Boolean(parseCookie("session")),
        membersCount: state.members.length,
        rolesCount: state.roles.length,
        hasPresence: state.hasPresence,
        presenceStats: state.presenceStats,
        presenceMap: state.presenceMap,
        presenceSources: state.presenceSources,
        memberStatusMemory: state.memberStatusMemory,
        selectedMember: member,
        selectedStatus: member ? member.status : "",
        selectedPresenceSource: member ? member.presenceSource : "",
        selectedNameColor: member ? member.nameColor : "",
        selectedNameColorRole: member ? member.nameColorRoleName : "",
        selectedMemberRoles: member ? member.roleObjects.map(function (role) {
          return { name: role.name, color: role.color, order: role.order };
        }) : [],
        selectedMemberRaw: member ? member.raw : null,
        selectedUserRaw: member ? member.userRaw : null,
        selectedAvatarUrl: member ? member.avatarUrl : "",
        selectedAvatarCandidates: member ? member.avatarCandidates : [],
        selectedTriedAvatarCandidates: member ? member.triedAvatarCandidates : [],
        avatarCache: state.avatarCache,
        nativeAvatarSnapshotsCount: state.nativeAvatars.length,
        firstMemberRaw: state.membersRaw[0],
        firstRoleRaw: state.rolesRaw[0],
        route: getRouteInfoFromLocation(),
        routeVisible: state.routeVisible,
        lastRouteVerdict: state.lastRouteVerdict,
        lastRouteReason: state.lastRouteReason,
        lastChannelInfo: state.lastChannelInfo,
        composerDetected: hasVisibleMessageComposer(),
        nonTextViewDetected: hasNonTextViewMarkers(getRouteInfoFromLocation()),
        lastError: state.lastError,
        routeKey: state.routeKey,
        lastHref: state.lastHref,
        routeVisible: state.routeVisible,
        lastRouteReason: state.lastRouteReason,
        lastRouteVerdict: state.lastRouteVerdict,
        hardGuardLastHiddenReason: state.hardGuardLastHiddenReason,
        hardGuardTicks: state.hardGuardTicks,
        currentPathname: location.pathname,
        currentRouteInfo: getRouteInfoFromLocation(),
        panelDisplay: state.panel ? state.panel.style.display : "",
        panelForceHidden: state.panel ? state.panel.getAttribute("data-kaly-force-hidden") : ""
      };
    }
  };

  await refresh();

  console.log("[KalyMemberList] menu complet restauré", VERSION);
})();

/* -------------------------------------------------------------------------- */
/* Kaly patch: ProfileCard API native-look, fallback autonome                 */
/* -------------------------------------------------------------------------- */
(function () {
  "use strict";

  var VERSION = "kaly-fluxer-profilecard-api-native-look-merged-10.0.5-staff-hitbox";
  var ORIGIN = location.origin.replace(/\/+$/, "");
  var API_BASE = (localStorage.getItem("kaly_fluxer_memberlist_api_base") || ORIGIN + "/api/v1").replace(/\/+$/, "");

  var ROOT_ID = "kaly-fluxer-native-look-profile-root";
  var STYLE_ID = "kaly-fluxer-native-look-profile-style";

  if (window.KALY_FLUXER_PROFILECARD_API && typeof window.KALY_FLUXER_PROFILECARD_API.stop === "function") {
    try {
      window.KALY_FLUXER_PROFILECARD_API.stop();
    } catch (errorStop) {}
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (error) {
      return fallback;
    }
  }

  function text(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);

    try {
      return String(value);
    } catch (error) {
      return "";
    }
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return text(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, "");
  }

  function firstValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }

    return "";
  }

  function unique(values) {
    var seen = {};
    var out = [];

    values.forEach(function (value) {
      value = text(value).trim();

      if (!value || seen[value]) return;

      seen[value] = true;
      out.push(value);
    });

    return out;
  }

  function parseCookie(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));

    return match ? decodeURIComponent(match[1]) : "";
  }

  function collectDeepStrings(value, path, out) {
    path = path || "";
    out = out || [];

    if (typeof value === "string") {
      out.push({
        path: path,
        value: value
      });

      return out;
    }

    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        collectDeepStrings(item, path + "[" + index + "]", out);
      });

      return out;
    }

    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        collectDeepStrings(value[key], path ? path + "." + key : key, out);
      });
    }

    return out;
  }

  function getTokenCandidates() {
    var tokens = [];

    [
      "session",
      "token",
      "access_token",
      "auth",
      "authorization",
      "session_token",
      "csrf_token",
      "csrftoken"
    ].forEach(function (cookieName) {
      var value = parseCookie(cookieName);

      if (value) tokens.push(value);
    });

    [localStorage, sessionStorage].forEach(function (storage) {
      if (!storage) return;

      for (var i = 0; i < storage.length; i += 1) {
        var key = storage.key(i) || "";
        var raw = storage.getItem(key) || "";
        var lowerKey = key.toLowerCase();

        if (
          lowerKey.indexOf("token") !== -1 ||
          lowerKey.indexOf("auth") !== -1 ||
          lowerKey.indexOf("session") !== -1 ||
          lowerKey.indexOf("access") !== -1
        ) {
          tokens.push(raw);
        }

        try {
          var parsed = JSON.parse(raw);

          collectDeepStrings(parsed, key, []).forEach(function (item) {
            var path = text(item.path).toLowerCase();
            var value = text(item.value).trim();

            if (
              value.length >= 16 &&
              value.length <= 4096 &&
              (
                path.indexOf("token") !== -1 ||
                path.indexOf("auth") !== -1 ||
                path.indexOf("session") !== -1 ||
                path.indexOf("access") !== -1
              ) &&
              path.indexOf("csrf") === -1
            ) {
              tokens.push(value);
            }
          });
        } catch (error) {}
      }
    });

    return unique(tokens).filter(function (token) {
      return token.length >= 12 && token.length <= 4096;
    });
  }

  function buildHeaderSets() {
    var sets = [];
    var csrf = parseCookie("csrf_token") || parseCookie("csrftoken") || "";
    var tokens = getTokenCandidates();

    tokens.forEach(function (token) {
      if (!token) return;

      if (token.indexOf("Bearer ") === 0 || token.indexOf("Bot ") === 0) {
        sets.push({
          Authorization: token
        });
      } else {
        sets.push({
          Authorization: token
        });

        sets.push({
          Authorization: "Bearer " + token
        });

        sets.push({
          Authorization: "Session " + token
        });

        sets.push({
          "X-Session-Token": token
        });

        sets.push({
          "X-Auth-Token": token
        });
      }
    });

    if (csrf) {
      sets.push({
        "X-CSRF-Token": csrf
      });
    }

    sets.push({});

    return unique(sets.map(function (headers) {
      return JSON.stringify(headers);
    })).map(function (headers) {
      return JSON.parse(headers);
    });
  }

  async function requestJson(method, path, body) {
    var url = path.indexOf("http") === 0 ? path : API_BASE + path;
    var headerSets = buildHeaderSets();
    var last = null;

    for (var i = 0; i < headerSets.length; i += 1) {
      var headers = Object.assign({
        Accept: "application/json"
      }, headerSets[i]);

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      try {
        var response = await fetch(url, {
          method: method,
          credentials: "include",
          headers: headers,
          body: body === undefined ? undefined : JSON.stringify(body)
        });

        var contentType = response.headers.get("content-type") || "";
        var rawText = await response.text();
        var json = null;

        try {
          json = rawText ? JSON.parse(rawText) : null;
        } catch (errorJson) {
          json = null;
        }

        last = {
          ok: response.ok,
          status: response.status,
          contentType: contentType,
          text: rawText,
          json: json,
          url: url
        };

        if (response.ok && json !== null) {
          return last;
        }
      } catch (error) {
        last = {
          ok: false,
          status: 0,
          contentType: "",
          text: text(error && error.message ? error.message : error),
          json: null,
          url: url
        };
      }
    }

    return last;
  }

  function getKalyApi() {
    return window.KalyFluxerMemberListFix || null;
  }

  function getState() {
    var api = getKalyApi();

    return api && api.state ? api.state : {};
  }

  function getMembers() {
    var state = getState();

    return Array.isArray(state.members) ? state.members : [];
  }

  function getRoles() {
    var state = getState();

    return Array.isArray(state.roles) ? state.roles : [];
  }

  function getGuildId() {
    var state = getState();

    if (state.guildId) return text(state.guildId);

    var stored = localStorage.getItem("kaly_fluxer_memberlist_guild_id");
    if (stored) return stored;

    var match = location.href.match(/\/channels\/([1-9][0-9]{14,24})\/([1-9][0-9]{14,24})/);
    if (match && match[1]) return match[1];

    return "";
  }

  function getChannelId() {
    var match = location.href.match(/\/channels\/([1-9][0-9]{14,24}|@me)\/([1-9][0-9]{14,24})/);

    return match && match[2] ? match[2] : "";
  }

  function isSelf(userId) {
    var state = getState();

    return Boolean(state.selfMemberId && text(state.selfMemberId) === text(userId));
  }

  function normalizeStatus(value) {
    var raw = value;

    if (raw && typeof raw === "object") {
      raw = firstValue(
        raw.status,
        raw.state,
        raw.type,
        raw.name,
        raw.presence,
        raw.online_status,
        raw.onlineStatus,
        raw.client_status,
        raw.clientStatus,
        raw.desktop,
        raw.mobile,
        raw.web,
        ""
      );
    }

    if (raw === true) return "online";
    if (raw === false) return "offline";

    var status = text(raw || "unknown").toLowerCase();

    if (["online", "active", "available", "connected", "connecte", "connecté", "en ligne"].indexOf(status) !== -1) return "online";
    if (["idle", "away", "absent", "afk"].indexOf(status) !== -1) return "idle";
    if (["dnd", "do_not_disturb", "do-not-disturb", "busy", "occupé", "occupe", "ne pas déranger"].indexOf(status) !== -1) return "dnd";
    if (["offline", "invisible", "hidden", "disconnected", "hors ligne"].indexOf(status) !== -1) return "offline";

    return "unknown";
  }

  function statusLabel(status) {
    if (status === "online") return "En ligne";
    if (status === "idle") return "Absent";
    if (status === "dnd") return "Ne pas déranger";
    if (status === "offline") return "Hors ligne";

    return "Statut inconnu";
  }

  function statusColor(status) {
    if (status === "online") return "var(--status-online, #23a55a)";
    if (status === "idle") return "var(--status-idle, #f0b232)";
    if (status === "dnd") return "var(--status-danger, #f23f43)";
    if (status === "offline") return "var(--text-muted, #80848e)";

    return "var(--text-muted, #80848e)";
  }

  function normalizeColor(value, fallback) {
    if (value && typeof value === "object") {
      value = firstValue(
        value.primary_color,
        value.primaryColor,
        value.secondary_color,
        value.secondaryColor,
        value.color,
        value.colour,
        value.hex,
        value.hex_color,
        value.hexColor,
        ""
      );
    }

    if (value === undefined || value === null || value === "") return fallback || "";

    if (typeof value === "number") {
      if (!Number.isFinite(value) || value <= 0) return fallback || "";
      return "#" + Math.floor(value).toString(16).padStart(6, "0").slice(-6).toUpperCase();
    }

    var raw = text(value).trim();

    if (!raw || raw === "0" || raw.toLowerCase() === "null") return fallback || "";

    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();

    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return "#" + raw.slice(1).split("").map(function (char) {
        return char + char;
      }).join("").toUpperCase();
    }

    if (/^0x[0-9a-fA-F]{6}$/.test(raw)) return "#" + raw.slice(2).toUpperCase();
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return "#" + raw.toUpperCase();

    if (/^[0-9]+$/.test(raw)) {
      var number = Number(raw);
      if (!Number.isFinite(number) || number <= 0) return fallback || "";
      return "#" + Math.floor(number).toString(16).padStart(6, "0").slice(-6).toUpperCase();
    }

    return fallback || "";
  }

  function mediaUrl(kind, userId, raw, size) {
    raw = firstValue(raw, "");

    if (!raw) return "";

    raw = text(raw).trim();

    if (/^https?:\/\//.test(raw)) return raw;
    if (raw.indexOf("/media/") === 0) return ORIGIN + raw;
    if (raw.indexOf("media/") === 0) return ORIGIN + "/" + raw;

    var clean = raw.split("?")[0].replace(/^\/+/, "");
    var ext = /\.(png|jpg|jpeg|webp|gif)$/i.test(clean) ? "" : ".webp";

    return ORIGIN + "/media/" + kind + "/" + encodeURIComponent(userId) + "/" + encodeURIComponent(clean + ext) + "?size=" + encodeURIComponent(size || "160");
  }

  function snowflakeDate(id) {
    var raw = text(id);

    if (!/^[1-9][0-9]{14,24}$/.test(raw)) return "";

    try {
      var big = BigInt(raw);
      var timestamp = Number((big >> 22n) + 1420070400000n);
      var date = new Date(timestamp);

      if (Number.isNaN(date.getTime())) return "";

      return date.toISOString();
    } catch (error) {
      return "";
    }
  }

  function formatDate(value) {
    if (!value) return "";

    try {
      var date = new Date(value);

      if (Number.isNaN(date.getTime())) return "";

      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch (error) {
      return "";
    }
  }

  function findMember(nameOrId) {
    var members = getMembers();
    var needle = normalizeText(nameOrId);
    var raw = text(nameOrId);

    for (var i = 0; i < members.length; i += 1) {
      var member = members[i];

      if (
        text(member.id) === raw ||
        normalizeText(member.displayName).indexOf(needle) !== -1 ||
        normalizeText(member.username).indexOf(needle) !== -1 ||
        normalizeText(member.tag).indexOf(needle) !== -1
      ) {
        return member;
      }
    }

    return null;
  }

  function memberFromButton(button) {
    var id = button.getAttribute("data-kml-member-id") || "";
    var name = button.getAttribute("data-kml-member-name") || "";

    return findMember(id) || findMember(name) || {
      id: id,
      displayName: name,
      username: name,
      tag: name,
      roles: [],
      roleObjects: [],
      avatarUrl: "",
      status: "unknown",
      raw: {},
      userRaw: {}
    };
  }

  function roleById(id) {
    var roles = getRoles();

    for (var i = 0; i < roles.length; i += 1) {
      if (text(roles[i].id) === text(id)) return roles[i];
    }

    return null;
  }

  async function fetchProfile(userId, guildId) {
    var query = "?with_mutual_friends=true&with_mutual_guilds=true";

    if (guildId) {
      query = "?guild_id=" + encodeURIComponent(guildId) + "&with_mutual_friends=true&with_mutual_guilds=true";
    }

    return requestJson("GET", "/users/" + encodeURIComponent(userId) + "/profile" + query);
  }

  async function openDm(userId) {
    var response = await requestJson("POST", "/users/@me/channels", {
      recipient_id: userId
    });

    if (!response || !response.ok || !response.json) {
      console.error("[KalyProfileCard] DM API KO :", response);
      return false;
    }

    var channelId = firstValue(response.json.id, response.json.channel_id, response.json.channelId, "");

    if (!channelId) {
      console.error("[KalyProfileCard] DM créé mais channel id introuvable :", response.json);
      return false;
    }

    closeCard();
    window.KALY_FLUXER_SPA_NAVIGATE("/channels/@me/" + encodeURIComponent(channelId));

    return true;
  }

  function getProfileParts(profileJson, localMember) {
    var root = profileJson && typeof profileJson === "object" ? profileJson : {};

    var user = firstValue(
      root.user,
      root.account,
      localMember.userRaw,
      localMember.user,
      {}
    );

    var userProfile = firstValue(
      root.user_profile,
      root.userProfile,
      root.profile,
      root.profile_data,
      root.profileData,
      {}
    );

    var guildMember = firstValue(
      root.guild_member,
      root.guildMember,
      root.member,
      localMember.raw,
      {}
    );

    var guildMemberProfile = firstValue(
      root.guild_member_profile,
      root.guildMemberProfile,
      guildMember.profile,
      {}
    );

    return {
      root: root,
      user: user || {},
      userProfile: userProfile || {},
      guildMember: guildMember || {},
      guildMemberProfile: guildMemberProfile || {}
    };
  }

  function getProfileData(parts) {
    var guild = parts.guildMemberProfile || {};
    var user = parts.userProfile || {};

    return {
      bio: firstValue(guild.bio, guild.description, user.bio, user.description, ""),
      pronouns: firstValue(guild.pronouns, user.pronouns, ""),
      banner: firstValue(guild.banner, guild.banner_hash, guild.bannerHash, user.banner, user.banner_hash, user.bannerHash, parts.user.banner, ""),
      accentColor: normalizeColor(firstValue(
        guild.accent_color,
        guild.accentColor,
        guild.theme_color,
        guild.themeColor,
        user.accent_color,
        user.accentColor,
        user.theme_color,
        user.themeColor,
        parts.user.accent_color,
        parts.user.accentColor,
        ""
      ), "")
    };
  }

  function getRolesForBundle(parts, localMember) {
    var rawRoles = [];

    [
      parts.guildMember.roles,
      parts.guildMember.role_ids,
      parts.guildMember.roleIds,
      localMember.roles
    ].forEach(function (value) {
      if (!value) return;

      if (Array.isArray(value)) {
        value.forEach(function (item) {
          if (item && typeof item === "object") {
            rawRoles.push(firstValue(item.id, item.role_id, item.roleId, ""));
          } else {
            rawRoles.push(item);
          }
        });
      } else if (typeof value === "object") {
        Object.keys(value).forEach(function (key) {
          rawRoles.push(key);
        });
      }
    });

    var ids = unique(rawRoles.map(text).filter(Boolean));

    var roleObjects = ids.map(function (id) {
      return roleById(id) || {
        id: id,
        name: id,
        color: "",
        order: 999999,
        apiIndex: 999999,
        position: null
      };
    });

    if (localMember.roleObjects && localMember.roleObjects.length) {
      roleObjects = localMember.roleObjects.slice();
    }

    roleObjects.sort(function (a, b) {
      return Number(a.order || a.apiIndex || 999999) - Number(b.order || b.apiIndex || 999999);
    });

    return roleObjects;
  }

  function channelNameFromDom(channelId) {
    if (!channelId) return "";

    var guildId = getGuildId();
    var link = null;

    try {
      link = document.querySelector('a[href*="/channels/' + CSS.escape(guildId) + "/" + CSS.escape(channelId) + '"], a[href$="/' + CSS.escape(channelId) + '"]');
    } catch (error) {
      link = null;
    }

    if (link) {
      var t = text(link.textContent).trim();

      if (t) return t;
    }

    return "";
  }

  function findVoiceInfo(rawProfile) {
    var found = null;
    var seen = new WeakSet();

    function scan(value, path, depth) {
      if (found || !value || depth > 8) return;
      if (typeof value !== "object") return;
      if (seen.has(value)) return;

      seen.add(value);

      var keys = Object.keys(value);
      var joinedKeys = keys.join(" ").toLowerCase();

      if (
        joinedKeys.indexOf("voice") !== -1 ||
        joinedKeys.indexOf("channel") !== -1 ||
        path.toLowerCase().indexOf("voice") !== -1
      ) {
        var channelId = firstValue(
          value.channel_id,
          value.channelId,
          value.voice_channel_id,
          value.voiceChannelId,
          value.id && path.toLowerCase().indexOf("channel") !== -1 ? value.id : "",
          ""
        );

        var channelName = firstValue(
          value.channel_name,
          value.channelName,
          value.name,
          value.title,
          ""
        );

        if (channelId || channelName) {
          found = {
            channelId: text(channelId),
            channelName: text(channelName)
          };

          return;
        }
      }

      keys.forEach(function (key) {
        scan(value[key], path ? path + "." + key : key, depth + 1);
      });
    }

    scan(rawProfile, "", 0);

    if (found && !found.channelName && found.channelId) {
      found.channelName = channelNameFromDom(found.channelId);
    }

    if (found && (found.channelId || found.channelName)) return found;

    return null;
  }

  function normalizeBundle(localMember, profileResponse) {
    var profileJson = profileResponse && profileResponse.json ? profileResponse.json : {};
    var parts = getProfileParts(profileJson, localMember);
    var profileData = getProfileData(parts);

    var userId = text(firstValue(
      parts.user.id,
      parts.guildMember.user_id,
      parts.guildMember.userId,
      localMember.id,
      ""
    ));

    var username = text(firstValue(
      parts.user.username,
      localMember.username,
      localMember.displayName,
      userId
    ));

    var discriminator = text(firstValue(
      parts.user.discriminator,
      localMember.discriminator,
      ""
    ));

    var tag = discriminator && discriminator !== "0"
      ? username + "#" + discriminator
      : text(firstValue(localMember.tag, username));

    var displayName = text(firstValue(
      parts.guildMember.nick,
      parts.guildMember.nickname,
      parts.guildMember.display_name,
      parts.guildMember.displayName,
      parts.user.global_name,
      parts.user.globalName,
      parts.user.display_name,
      parts.user.displayName,
      localMember.displayName,
      username,
      userId
    ));

    var avatarRaw = firstValue(
      parts.guildMember.avatar,
      parts.guildMember.avatar_hash,
      parts.guildMember.avatarHash,
      parts.user.avatar,
      parts.user.avatar_hash,
      parts.user.avatarHash,
      localMember.avatar,
      ""
    );

    var avatarUrl = firstValue(
      localMember.avatarUrl,
      mediaUrl("avatars", userId, avatarRaw, "160"),
      ""
    );

    var bannerUrl = profileData.banner ? mediaUrl("banners", userId, profileData.banner, "600") : "";

    var accentColor = firstValue(
      profileData.accentColor,
      localMember.nameColor,
      "#7c3aed"
    );

    var createdAt = firstValue(
      parts.user.created_at,
      parts.user.createdAt,
      parts.root.created_at,
      parts.root.createdAt,
      snowflakeDate(userId),
      ""
    );

    var joinedAt = firstValue(
      parts.guildMember.joined_at,
      parts.guildMember.joinedAt,
      localMember.raw && localMember.raw.joined_at,
      localMember.raw && localMember.raw.joinedAt,
      ""
    );

    var status = normalizeStatus(firstValue(
      localMember.status,
      parts.root.presence,
      parts.user.presence,
      parts.user.status,
      "unknown"
    ));

    var roles = getRolesForBundle(parts, localMember);
    var voice = findVoiceInfo(profileJson);

    return {
      version: VERSION,
      id: userId,
      username: username,
      tag: tag,
      displayName: displayName,
      pronouns: text(profileData.pronouns),
      bio: text(profileData.bio),
      avatarUrl: avatarUrl,
      bannerUrl: bannerUrl,
      accentColor: accentColor,
      createdAt: createdAt,
      joinedAt: joinedAt,
      status: status,
      roles: roles,
      voice: voice,
      flags: firstValue(
        parts.user.flags,
        parts.user.public_flags,
        parts.user.publicFlags,
        parts.user.user_flags,
        parts.user.userFlags,
        parts.root.flags,
        parts.root.public_flags,
        parts.root.publicFlags,
        parts.root.user_flags,
        parts.root.userFlags,
        localMember.flags,
        localMember.public_flags,
        localMember.publicFlags,
        localMember.user_flags,
        localMember.userFlags,
        0
      ),
      userFlagCandidates: [
        parts.user.flags,
        parts.user.public_flags,
        parts.user.publicFlags,
        parts.user.user_flags,
        parts.user.userFlags,
        parts.root.flags,
        parts.root.public_flags,
        parts.root.publicFlags,
        parts.root.user_flags,
        parts.root.userFlags,
        localMember.flags,
        localMember.public_flags,
        localMember.publicFlags,
        localMember.user_flags,
        localMember.userFlags,
        localMember.raw && localMember.raw.user && localMember.raw.user.flags,
        localMember.raw && localMember.raw.user && localMember.raw.user.user_flags,
        localMember.userRaw && localMember.userRaw.flags,
        localMember.userRaw && localMember.userRaw.user_flags
      ],
      isSelf: isSelf(userId),
      localMember: localMember,
      response: profileResponse,
      rawProfile: profileJson,
      parts: parts
    };
  }

  var controller = new AbortController();
  var busy = false;
  var lastBundle = null;
  var lastError = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
#${ROOT_ID}{
  position:fixed;
  inset:0;
  z-index:2147483500;
  pointer-events:none;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
#${ROOT_ID} *{box-sizing:border-box}
#${ROOT_ID} .kfp-backdrop{
  position:absolute;
  inset:0;
  pointer-events:auto;
  background:transparent;
}
#${ROOT_ID} .kfp-popout{
  position:absolute;
  pointer-events:auto;
  filter:drop-shadow(0 4px 8px rgba(0,0,0,.28)) drop-shadow(0 18px 45px rgba(0,0,0,.34));
}
#${ROOT_ID} .kfp-card{
  width:300px;
  max-height:calc(100vh - 24px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  border-radius:14px;
  border:2px solid var(--kfp-accent,#7c3aed);
  background:var(--background-primary,#181025);
  color:var(--text-primary,#f7f1ff);
}
#${ROOT_ID} .kfp-header{
  position:relative;
  height:140px;
  flex:0 0 auto;
}
#${ROOT_ID} .kfp-banner-wrap{
  height:105px;
  overflow:hidden;
}
#${ROOT_ID} .kfp-banner{
  height:105px;
  min-height:105px;
  background-position:center;
  background-size:cover;
  background-repeat:no-repeat;
}
#${ROOT_ID} .kfp-avatar-button{
  position:absolute;
  left:14px;
  bottom:0;
  width:92px;
  height:92px;
  padding:0;
  border:0;
  background:transparent;
  cursor:pointer;
}
#${ROOT_ID} .kfp-avatar{
  position:relative;
  width:84px;
  height:84px;
  border-radius:50%;
  background:var(--background-primary,#181025);
  border:4px solid var(--background-primary,#181025);
}
#${ROOT_ID} .kfp-avatar-overlay{
  width:76px;
  height:76px;
  border-radius:50%;
  overflow:hidden;
  background:var(--background-primary,#181025);
}
#${ROOT_ID} .kfp-avatar-img{
  width:76px;
  height:76px;
  display:block;
  object-fit:cover;
  border-radius:50%;
}
#${ROOT_ID} .kfp-avatar-fallback{
  width:76px;
  height:76px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  background:linear-gradient(135deg,#7c3aed,#28163c);
  color:#fff;
  font-size:32px;
  font-weight:900;
}
#${ROOT_ID} .kfp-status-container{
  position:absolute;
  right:4px;
  bottom:4px;
  display:flex;
  align-items:center;
  justify-content:center;
  width:19px;
  height:19px;
  padding:3px;
  border-radius:999px;
  background:var(--background-primary,#181025);
  pointer-events:none;
}
#${ROOT_ID} .kfp-status-dot{
  width:13px;
  height:13px;
  border-radius:999px;
  background:var(--text-muted,#80848e);
}
#${ROOT_ID} .kfp-badges,
#${ROOT_ID} .UserProfileBadges\.module__containerPopout___ZjBjOw{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:4px;
  min-height:24px;
  padding:0 14px;
  margin-top:-26px;
  pointer-events:auto;
}
#${ROOT_ID} .kfp-official-badge-link,
#${ROOT_ID} .UserProfileBadges\.module__link___ZjBjOw{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:36px;
  height:36px;
  margin:-7px;
  border-radius:999px;
  text-decoration:none;
  pointer-events:auto;
  position:relative;
  touch-action:manipulation;
}
#${ROOT_ID} .kfp-official-badge-img,
#${ROOT_ID} .UserProfileBadges\.module__badgeDesktop___ZjBjOw{
  display:block;
  width:22px;
  height:22px;
  object-fit:contain;
}
#${ROOT_ID} .kfp-floating-tooltip{
  position:fixed;
  z-index:2147483647;
  pointer-events:none;
  padding:6px 8px;
  border-radius:6px;
  background:var(--background-floating,#111214);
  color:#fff;
  font-size:12px;
  font-weight:850;
  line-height:1;
  letter-spacing:.01em;
  white-space:nowrap;
  box-shadow:0 8px 24px rgba(0,0,0,.38);
  opacity:0;
  transform:translateY(4px);
  transition:opacity .08s ease,transform .08s ease;
}
#${ROOT_ID} .kfp-floating-tooltip[data-show="1"]{
  opacity:1;
  transform:translateY(0);
}
#${ROOT_ID} .kfp-floating-tooltip::after{
  content:"";
  position:absolute;
  left:50%;
  margin-left:-5px;
  border:5px solid transparent;
}
#${ROOT_ID} .kfp-floating-tooltip[data-placement="top"]::after{
  bottom:-10px;
  border-top-color:var(--background-floating,#111214);
}
#${ROOT_ID} .kfp-floating-tooltip[data-placement="bottom"]::after{
  top:-10px;
  border-bottom-color:var(--background-floating,#111214);
}
#${ROOT_ID} .kfp-content{
  overflow:auto;
  padding:0 14px;
  scrollbar-width:thin;
}
#${ROOT_ID} .kfp-user-info{
  margin-top:2px;
}
#${ROOT_ID} .kfp-display-name{
  margin:0;
  color:var(--text-primary,#f7f1ff);
  font-size:20px;
  font-weight:800;
  line-height:1.2;
  overflow-wrap:anywhere;
}
#${ROOT_ID} .kfp-username{
  margin-top:3px;
  color:var(--text-secondary,#d7cee8);
  font-size:14px;
  line-height:1.25;
  overflow-wrap:anywhere;
}
#${ROOT_ID} .kfp-pronouns{
  margin-top:3px;
  color:var(--text-tertiary,#bfb0d8);
  font-size:13px;
  line-height:1.25;
}
#${ROOT_ID} .kfp-section{
  margin-top:14px;
}
#${ROOT_ID} .kfp-section-box{
  padding:12px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:12px;
  background:rgba(255,255,255,.035);
}
#${ROOT_ID} .kfp-section-title{
  margin-bottom:8px;
  color:var(--text-primary,#f7f1ff);
  font-size:12px;
  font-weight:900;
  line-height:1.2;
  text-transform:uppercase;
  letter-spacing:.035em;
}
#${ROOT_ID} .kfp-bio{
  color:var(--text-secondary,#e4d8f6);
  font-size:13px;
  line-height:1.38;
  white-space:pre-wrap;
  overflow-wrap:anywhere;
}
#${ROOT_ID} .kfp-voice-row{
  display:grid;
  grid-template-columns:28px 1fr;
  gap:8px;
  align-items:center;
  color:var(--text-secondary,#e4d8f6);
  font-size:13px;
}
#${ROOT_ID} .kfp-voice-avatar{
  width:24px;
  height:24px;
  border-radius:50%;
  overflow:hidden;
}
#${ROOT_ID} .kfp-voice-avatar img{
  width:24px;
  height:24px;
  object-fit:cover;
}
#${ROOT_ID} .kfp-voice-button{
  grid-column:1 / -1;
  width:100%;
  margin-top:8px;
  height:32px;
  border:0;
  border-radius:999px;
  background:#6a3cb7;
  color:#fff;
  font-weight:850;
  cursor:pointer;
}
#${ROOT_ID} .kfp-membership-row{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  color:var(--text-secondary,#e4d8f6);
  font-size:13px;
}
#${ROOT_ID} .kfp-role-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:7px;
}
#${ROOT_ID} .kfp-role-plus{
  color:var(--text-primary,#f7f1ff);
  font-size:22px;
  line-height:1;
}
#${ROOT_ID} .kfp-roles{
  display:flex;
  flex-wrap:wrap;
  gap:7px 10px;
}
#${ROOT_ID} .kfp-role{
  display:inline-flex;
  align-items:center;
  max-width:100%;
  gap:6px;
  color:var(--text-primary,#f7f1ff);
  font-size:13px;
  font-weight:650;
}
#${ROOT_ID} .kfp-role-dot{
  width:10px;
  height:10px;
  flex:0 0 auto;
  border-radius:999px;
  background:var(--text-muted,#80848e);
}
#${ROOT_ID} .kfp-muted{
  color:var(--text-tertiary,#bfb0d8);
  font-size:12px;
  line-height:1.35;
}
#${ROOT_ID} .kfp-footer{
  flex:0 0 auto;
  padding:14px 14px 12px;
}
#${ROOT_ID} .kfp-main-button{
  width:100%;
  height:40px;
  border:0;
  border-radius:10px;
  background:#6a3cb7;
  color:#fff;
  font-size:14px;
  font-weight:850;
  cursor:pointer;
}
#${ROOT_ID} .kfp-main-button:hover,
#${ROOT_ID} .kfp-voice-button:hover{
  filter:brightness(1.08);
}
#${ROOT_ID} .kfp-close{
  position:absolute;
  top:8px;
  left:8px;
  z-index:5;
  width:26px;
  height:26px;
  border:0;
  border-radius:8px;
  background:rgba(0,0,0,.42);
  color:#fff;
  cursor:pointer;
}
#${ROOT_ID} .kfp-debug{
  position:absolute;
  top:8px;
  right:8px;
  z-index:5;
  height:26px;
  padding:0 7px;
  border:0;
  border-radius:8px;
  background:rgba(0,0,0,.42);
  color:#fff;
  font-size:11px;
  cursor:pointer;
}
#${ROOT_ID} .kfp-loading,
#${ROOT_ID} .kfp-error{
  position:absolute;
  width:300px;
  padding:14px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:12px;
  background:var(--background-primary,#181025);
  color:var(--text-primary,#f7f1ff);
  pointer-events:auto;
  box-shadow:0 18px 70px rgba(0,0,0,.62);
}
#${ROOT_ID} .kfp-error{
  color:#ffd7d7;
  background:#271018;
  white-space:pre-wrap;
}
`;

    document.head.appendChild(style);
  }

  function root() {
    ensureStyle();

    var el = document.getElementById(ROOT_ID);

    if (!el) {
      el = document.createElement("div");
      el.id = ROOT_ID;
      document.body.appendChild(el);
    }

    return el;
  }

  function closeCard() {
    var el = document.getElementById(ROOT_ID);

    if (el) {
      el.innerHTML = "";
      removeBadgeTooltip();
      el.removeAttribute("data-kfp-layer");
      try {
        delete el.__KALY_USERPROFILE_BUNDLE__;
      } catch (errorDeleteBundle) {
        el.__KALY_USERPROFILE_BUNDLE__ = null;
      }
    }
  }

  function anchorPosition(event, anchor) {
    var x = window.innerWidth - 320 - 12;
    var y = 72;

    if (event && typeof event.clientX === "number" && typeof event.clientY === "number" && event.clientX > 0 && event.clientY > 0) {
      x = event.clientX - 326;
      y = event.clientY - 56;
    } else if (anchor && anchor.getBoundingClientRect) {
      var rect = anchor.getBoundingClientRect();

      x = rect.left - 326;
      y = rect.top - 18;
    }

    x = Math.max(8, Math.min(window.innerWidth - 312, x));
    y = Math.max(8, Math.min(window.innerHeight - 160, y));

    return {
      x: Math.round(x),
      y: Math.round(y)
    };
  }

  function renderLoading(pos, label) {
    root().innerHTML =
      '<div class="kfp-backdrop" data-kfp-close="1"></div>' +
      '<div class="kfp-loading" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">Chargement du profil : ' + escapeHtml(label) + '</div>';

    bindGlobalButtons(null);
  }

  function renderError(pos, message) {
    root().innerHTML =
      '<div class="kfp-backdrop" data-kfp-close="1"></div>' +
      '<div class="kfp-error" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">' + escapeHtml(message) + '</div>';

    bindGlobalButtons(null);
  }

  function avatarMarkup(bundle) {
    if (bundle.avatarUrl) {
      return '<img class="kfp-avatar-img" src="' + escapeHtml(bundle.avatarUrl) + '" alt="">';
    }

    return '<div class="kfp-avatar-fallback">' + escapeHtml(text(bundle.displayName || "?").slice(0, 1).toUpperCase()) + '</div>';
  }

  function roleMarkup(bundle) {
    if (!bundle.roles || !bundle.roles.length) {
      return '<span class="kfp-muted">Aucun rôle détecté</span>';
    }

    return bundle.roles.map(function (role) {
      var color = normalizeColor(firstValue(role.color, role.colour, role.color_value, role.colorValue, ""), "");
      var name = text(firstValue(role.name, role.id, "Rôle"));

      return '<span class="kfp-role">' +
        '<span class="kfp-role-dot" style="background:' + escapeHtml(color || "var(--text-muted,#80848e)") + '"></span>' +
        '<span>' + escapeHtml(name) + '</span>' +
        '</span>';
    }).join("");
  }

  function kfpFlagTruthy(value) {
    if (value === true) return true;
    if (value === false || value === undefined || value === null) return false;

    if (typeof value === "number") {
      return Number.isFinite(value) && value !== 0;
    }

    var raw = text(value).trim().toLowerCase();
    if (!raw || raw === "0" || raw === "false" || raw === "no" || raw === "non" || raw === "null" || raw === "undefined") return false;

    return true;
  }

  function kfpNumericFlagHasStaff(value) {
    if (value === undefined || value === null || value === "") return false;

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return false;
      return (Math.floor(value) & 1) === 1;
    }

    var raw = text(value).trim();
    if (!/^\d+$/.test(raw)) return false;

    try {
      return (BigInt(raw) & 1n) === 1n;
    } catch (errorBigInt) {
      var n = Number(raw);
      return Number.isFinite(n) && (Math.floor(n) & 1) === 1;
    }
  }

  function kfpFlagValueHasStaff(value, depth) {
    depth = depth || 0;
    if (depth > 5 || value === undefined || value === null || value === "") return false;

    if (typeof value === "number" || typeof value === "bigint") {
      return kfpNumericFlagHasStaff(value);
    }

    if (typeof value === "string") {
      if (kfpNumericFlagHasStaff(value)) return true;

      var normalized = normalizeText(value);
      return normalized === "staff" || normalized === "userflagsstaff";
    }

    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        if (kfpFlagValueHasStaff(value[i], depth + 1)) return true;
      }
      return false;
    }

    if (value && typeof value === "object") {
      var keys = Object.keys(value);

      for (var j = 0; j < keys.length; j += 1) {
        var key = keys[j];
        var normalizedKey = normalizeText(key);

        if ((normalizedKey === "staff" || normalizedKey === "userflagsstaff") && kfpFlagTruthy(value[key])) {
          return true;
        }

        if (
          normalizedKey === "name" ||
          normalizedKey === "flag" ||
          normalizedKey === "type" ||
          normalizedKey === "label" ||
          normalizedKey === "id" ||
          normalizedKey === "value"
        ) {
          if (kfpFlagValueHasStaff(value[key], depth + 1)) return true;
        }

        if (
          normalizedKey === "flags" ||
          normalizedKey === "publicflags" ||
          normalizedKey === "userflags" ||
          normalizedKey === "userflagnames" ||
          normalizedKey === "userflagsnames"
        ) {
          if (kfpFlagValueHasStaff(value[key], depth + 1)) return true;
        }
      }
    }

    return false;
  }

  function kfpStaffFlagCandidates(bundle) {
    bundle = bundle || {};

    var parts = bundle.parts || {};
    var root = bundle.rawProfile || parts.root || {};
    var user = parts.user || {};
    var userProfile = parts.userProfile || {};
    var localMember = bundle.localMember || {};
    var localRaw = localMember.raw || {};
    var localUser = localMember.userRaw || localMember.user || {};
    var userResponseJson = bundle.userResponse && bundle.userResponse.json ? bundle.userResponse.json : {};

    return [
      bundle.flags,
      bundle.userFlags,
      bundle.publicFlags,
      bundle.userFlagCandidates,

      root.flags,
      root.public_flags,
      root.publicFlags,
      root.user_flags,
      root.userFlags,
      root.user_flags_names,
      root.userFlagsNames,

      root.user && root.user.flags,
      root.user && root.user.public_flags,
      root.user && root.user.publicFlags,
      root.user && root.user.user_flags,
      root.user && root.user.userFlags,
      root.user && root.user.user_flags_names,
      root.user && root.user.userFlagsNames,

      user.flags,
      user.public_flags,
      user.publicFlags,
      user.user_flags,
      user.userFlags,
      user.user_flags_names,
      user.userFlagsNames,

      userProfile.flags,
      userProfile.public_flags,
      userProfile.publicFlags,
      userProfile.user_flags,
      userProfile.userFlags,
      userProfile.user_flags_names,
      userProfile.userFlagsNames,

      userResponseJson.flags,
      userResponseJson.public_flags,
      userResponseJson.publicFlags,
      userResponseJson.user_flags,
      userResponseJson.userFlags,
      userResponseJson.user_flags_names,
      userResponseJson.userFlagsNames,

      localMember.flags,
      localMember.public_flags,
      localMember.publicFlags,
      localMember.user_flags,
      localMember.userFlags,

      localRaw.flags,
      localRaw.public_flags,
      localRaw.publicFlags,
      localRaw.user_flags,
      localRaw.userFlags,
      localRaw.user && localRaw.user.flags,
      localRaw.user && localRaw.user.public_flags,
      localRaw.user && localRaw.user.publicFlags,
      localRaw.user && localRaw.user.user_flags,
      localRaw.user && localRaw.user.userFlags,

      localUser.flags,
      localUser.public_flags,
      localUser.publicFlags,
      localUser.user_flags,
      localUser.userFlags
    ];
  }

  function kfpHasStaffUserFlag(bundle) {
    var candidates = kfpStaffFlagCandidates(bundle);

    for (var i = 0; i < candidates.length; i += 1) {
      if (kfpFlagValueHasStaff(candidates[i], 0)) return true;
    }

    return false;
  }

  function kfpOfficialFluxerTeamBadge(bundle) {
    if (!kfpHasStaffUserFlag(bundle)) return "";

    var label = "STAFF";
    var href = ORIGIN + "/marketing/careers";

    return '<a class="UserProfileBadges.module__link___ZjBjOw kfp-official-badge-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer" aria-haspopup="true" aria-expanded="false" aria-label="' + escapeHtml(label) + '" data-kfp-tooltip="' + escapeHtml(label) + '">' +
      '<img class="UserProfileBadges.module__badgeDesktop___ZjBjOw kfp-official-badge-img" alt="' + escapeHtml(label) + '" src="https://fluxerstatic.com/badges/staff.svg">' +
      '</a>';
  }

  function badgeMarkup(bundle) {
    return kfpOfficialFluxerTeamBadge(bundle);
  }

  function bioSection(bundle) {
    if (!bundle.bio) return "";

    return '<div class="kfp-section">' +
      '<div class="kfp-bio">' + escapeHtml(bundle.bio) + '</div>' +
      '</div>';
  }

  function voiceSection(bundle) {
    if (!bundle.voice || (!bundle.voice.channelName && !bundle.voice.channelId)) return "";

    var channelName = text(firstValue(bundle.voice.channelName, bundle.voice.channelId, "Salon vocal"));
    var channelId = text(bundle.voice.channelId || "");

    return '<div class="kfp-section kfp-section-box" data-kfp-voice-channel="' + escapeHtml(channelId) + '">' +
      '<div class="kfp-section-title">En voix</div>' +
      '<div class="kfp-voice-row">' +
      '<div class="kfp-voice-avatar">' + (bundle.avatarUrl ? '<img src="' + escapeHtml(bundle.avatarUrl) + '" alt="">' : "") + '</div>' +
      '<div>🐙 → 🔊 ' + escapeHtml(channelName) + '</div>' +
      '<button class="kfp-voice-button" type="button" data-kfp-open-voice="' + escapeHtml(channelId) + '">Ouvrir la voix</button>' +
      '</div>' +
      '</div>';
  }

  function membershipSection(bundle) {
    var created = formatDate(bundle.createdAt);
    var joined = formatDate(bundle.joinedAt);

    if (!created && !joined) return "";

    return '<div class="kfp-section">' +
      '<div class="kfp-section-title">Membre depuis</div>' +
      '<div class="kfp-membership-row">' +
      (created ? '<span>♒ ' + escapeHtml(created) + '</span>' : "") +
      (joined ? '<span>🐙 ' + escapeHtml(joined) + '</span>' : "") +
      '</div>' +
      '</div>';
  }

  function profileWarning(bundle) {
    if (bundle.response && bundle.response.ok) return "";

    var status = bundle.response ? bundle.response.status : "inconnu";

    return '<div class="kfp-section kfp-section-box">' +
      '<div class="kfp-muted">Profil API partiel, HTTP ' + escapeHtml(status) + '. Carte construite avec les données membres locales.</div>' +
      '</div>';
  }

  function cardMarkup(bundle, pos) {
    var bannerStyle = "";

    if (bundle.bannerUrl) {
      bannerStyle = 'background-image:url("' + escapeHtml(bundle.bannerUrl) + '");';
    } else {
      bannerStyle =
        'background:' +
        'radial-gradient(circle at 22% 18%, ' + escapeHtml(bundle.accentColor) + ' 0, transparent 34%),' +
        'linear-gradient(135deg, ' + escapeHtml(bundle.accentColor) + ', #150a22 76%);';
    }

    var pronouns = bundle.pronouns
      ? '<div class="kfp-pronouns">' + escapeHtml(bundle.pronouns) + '</div>'
      : "";

    var footerLabel = bundle.isSelf ? "✎ Modifier le profil" : "💬 Message";

    return '' +
      '<div class="kfp-backdrop" data-kfp-close="1"></div>' +
      '<div class="kfp-popout" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">' +
      '<div class="kfp-card" style="--kfp-accent:' + escapeHtml(bundle.accentColor) + ';border-color:' + escapeHtml(bundle.accentColor) + '">' +
      '<button class="kfp-close" type="button" data-kfp-close="1">×</button>' +
      '<button class="kfp-debug" type="button" data-kfp-debug="1">JSON</button>' +

      '<header class="kfp-header">' +
      '<div class="kfp-banner-wrap">' +
      '<div class="kfp-banner" style="' + bannerStyle + '"></div>' +
      '</div>' +

      '<button type="button" class="kfp-avatar-button" data-kfp-avatar="1">' +
      '<div class="kfp-avatar" role="button" aria-label="' + escapeHtml(bundle.displayName + ", " + statusLabel(bundle.status)) + '" aria-hidden="false" tabindex="0">' +
      '<div class="kfp-avatar-overlay">' + avatarMarkup(bundle) + '</div>' +
      '<div class="kfp-status-container" role="img" aria-label="' + escapeHtml(statusLabel(bundle.status)) + '">' +
      '<span class="kfp-status-dot" style="background:' + escapeHtml(statusColor(bundle.status)) + '"></span>' +
      '</div>' +
      '</div>' +
      '</button>' +
      '</header>' +

      '<div class="kfp-badges UserProfileBadges.module__containerPopout___ZjBjOw">' + badgeMarkup(bundle) + '</div>' +

      '<div class="kfp-content">' +
      '<div class="kfp-user-info">' +
      '<h3 class="kfp-display-name">' + escapeHtml(bundle.displayName) + '</h3>' +
      '<div class="kfp-username">' + escapeHtml(bundle.tag || bundle.username || bundle.id) + '</div>' +
      pronouns +
      '</div>' +
      voiceSection(bundle) +
      bioSection(bundle) +
      membershipSection(bundle) +
      '<div class="kfp-section">' +
      '<div class="kfp-role-head"><div class="kfp-section-title" style="margin-bottom:0">Rôles</div><div class="kfp-role-plus">+</div></div>' +
      '<div class="kfp-roles">' + roleMarkup(bundle) + '</div>' +
      '</div>' +
      profileWarning(bundle) +
      '</div>' +

      '<footer class="kfp-footer">' +
      '<button class="kfp-main-button" type="button" data-kfp-main-action="1">' + escapeHtml(footerLabel) + '</button>' +
      '</footer>' +
      '</div>' +
      '</div>';
  }


  function removeBadgeTooltip() {
    var current = document.querySelector("#" + ROOT_ID + " .kfp-floating-tooltip");
    if (current) current.remove();
  }

  function positionBadgeTooltip(anchor, tooltip) {
    if (!anchor || !tooltip || !anchor.getBoundingClientRect) return;

    var anchorRect = anchor.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var margin = 8;
    var placement = "top";
    var left = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);
    var top = anchorRect.top - tooltipRect.height - 9;

    if (top < margin) {
      placement = "bottom";
      top = anchorRect.bottom + 9;
    }

    left = Math.max(margin, Math.min(window.innerWidth - tooltipRect.width - margin, left));
    top = Math.max(margin, Math.min(window.innerHeight - tooltipRect.height - margin, top));

    tooltip.setAttribute("data-placement", placement);
    tooltip.style.left = Math.round(left) + "px";
    tooltip.style.top = Math.round(top) + "px";
  }

  function showBadgeTooltip(anchor) {
    if (!anchor) return;

    var label = text(anchor.getAttribute("data-kfp-tooltip") || anchor.getAttribute("aria-label") || "").trim();
    if (!label) return;

    removeBadgeTooltip();

    var tooltip = document.createElement("div");
    tooltip.className = "kfp-floating-tooltip";
    tooltip.textContent = label;

    root().appendChild(tooltip);
    positionBadgeTooltip(anchor, tooltip);

    requestAnimationFrame(function () {
      positionBadgeTooltip(anchor, tooltip);
      tooltip.setAttribute("data-show", "1");
    });
  }

  function bindBadgeTooltips(scope) {
    Array.prototype.slice.call((scope || root()).querySelectorAll("[data-kfp-tooltip]")).forEach(function (badge) {
      if (badge.getAttribute("data-kfp-tooltip-bound") === "1") return;
      badge.setAttribute("data-kfp-tooltip-bound", "1");

      badge.addEventListener("pointerenter", function () {
        showBadgeTooltip(badge);
      }, { signal: controller.signal });

      badge.addEventListener("pointerleave", function () {
        removeBadgeTooltip();
      }, { signal: controller.signal });

      badge.addEventListener("mouseenter", function () {
        showBadgeTooltip(badge);
      }, { signal: controller.signal });

      badge.addEventListener("mouseleave", function () {
        removeBadgeTooltip();
      }, { signal: controller.signal });

      badge.addEventListener("focus", function () {
        showBadgeTooltip(badge);
      }, { signal: controller.signal });

      badge.addEventListener("blur", function () {
        removeBadgeTooltip();
      }, { signal: controller.signal });
    });
  }

  function bindGlobalButtons(bundle) {
    bindBadgeTooltips(root());

    Array.prototype.slice.call(root().querySelectorAll("[data-kfp-close]")).forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeCard();
      }, {
        signal: controller.signal
      });
    });

    var debugButton = root().querySelector("[data-kfp-debug]");

    if (debugButton && bundle) {
      debugButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("[KalyProfileCard] bundle :", bundle);
      }, {
        signal: controller.signal
      });
    }

    var voiceButton = root().querySelector("[data-kfp-open-voice]");

    if (voiceButton && bundle) {
      voiceButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        var channelId = voiceButton.getAttribute("data-kfp-open-voice") || "";

        if (channelId) {
          closeCard();
          window.KALY_FLUXER_SPA_NAVIGATE("/channels/" + encodeURIComponent(getGuildId()) + "/" + encodeURIComponent(channelId));
        } else {
          console.warn("[KalyProfileCard] ID salon vocal introuvable :", bundle.voice);
        }
      }, {
        signal: controller.signal
      });
    }

    var mainButton = root().querySelector("[data-kfp-main-action]");

    if (mainButton && bundle) {
      mainButton.addEventListener("click", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (bundle.isSelf) {
          var settingsButton = document.querySelector(
            'button[aria-label*="Paramètres"],button[aria-label*="paramètres"],button[aria-label*="Settings"],button[aria-label*="settings"],button[aria-label*="User Settings"]'
          );

          if (settingsButton) {
            settingsButton.click();
            closeCard();
            return;
          }

          console.warn("[KalyProfileCard] bouton paramètres introuvable.");
          return;
        }

        mainButton.textContent = "Ouverture…";

        var ok = await openDm(bundle.id);

        if (!ok) {
          mainButton.textContent = "Erreur DM";

          setTimeout(function () {
            mainButton.textContent = "💬 Message";
          }, 1200);
        }
      }, {
        signal: controller.signal
      });
    }
  }

  async function openProfile(member, pos) {
    if (busy) return false;

    busy = true;

    try {
      if (!member || !member.id) {
        renderError(pos, "Membre invalide.");
        return false;
      }

      renderLoading(pos, member.displayName || member.username || member.id);

      var profileResponse = await fetchProfile(member.id, getGuildId());
      var bundle = normalizeBundle(member, profileResponse);

      lastBundle = bundle;
      lastError = null;

      root().innerHTML = cardMarkup(bundle, pos);
      bindGlobalButtons(bundle);

      console.log("[KalyProfileCard] profil fallback ouvert :", bundle);

      return true;
    } catch (error) {
      lastError = error;
      console.error("[KalyProfileCard] crash :", error);
      renderError(pos, "Crash profile card :\n" + text(error && error.stack ? error.stack : error));
      return false;
    } finally {
      busy = false;
    }
  }

  function openFromButton(button, event) {
    var member = memberFromButton(button);
    var pos = anchorPosition(event || null, button);

    return openProfile(member, pos);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeCard();
    }
  }, {
    signal: controller.signal
  });

  window.KALY_FLUXER_PROFILECARD_API = {
    version: VERSION,
    open: function (nameOrId) {
      var member = findMember(nameOrId);

      if (!member) {
        console.error("[KalyProfileCard] membre introuvable :", nameOrId);
        return Promise.resolve(false);
      }

      return openProfile(member, {
        x: window.innerWidth - 320 - 12,
        y: 72
      });
    },
    openFromButton: openFromButton,
    fetch: function (nameOrId) {
      var member = findMember(nameOrId);

      if (!member) {
        return Promise.resolve(null);
      }

      return fetchProfile(member.id, getGuildId()).then(function (response) {
        return normalizeBundle(member, response);
      });
    },
    close: closeCard,
    stop: function () {
      controller.abort();
      closeCard();

      var style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      var modalStyle = document.getElementById(PROFILE_MODAL_STYLE_ID);
      if (modalStyle) modalStyle.remove();

      var rootEl = document.getElementById(ROOT_ID);
      if (rootEl) rootEl.remove();

      delete window.KALY_FLUXER_PROFILECARD_API;
      delete window.KALY_PROFILE_NATIVE_EVENT_BRIDGE;

      console.log("[KalyProfileCard] stoppé");
    },
    dump: function () {
      return {
        version: VERSION,
        apiBase: API_BASE,
        guildId: getGuildId(),
        channelId: getChannelId(),
        busy: busy,
        members: getMembers().length,
        roles: getRoles().length,
        lastBundle: lastBundle,
        lastError: lastError
      };
    }
  };

  window.KALY_PROFILE_NATIVE_EVENT_BRIDGE = window.KALY_FLUXER_PROFILECARD_API;

  if (window.KalyFluxerMemberListFix) {
    window.KalyFluxerMemberListFix.openApiProfile = function (nameOrId) {
      return window.KALY_FLUXER_PROFILECARD_API.open(nameOrId);
    };

    window.KalyFluxerMemberListFix.dumpProfileBridge = function () {
      return window.KALY_FLUXER_PROFILECARD_API.dump();
    };
  }

  console.log("[KalyProfileCard] fallback API actif", VERSION);
})();

/* -------------------------------------------------------------------------- */
/* Kaly patch: clic sur .kml-member -> vraie petite ProfileCard Fluxer native */
/* -------------------------------------------------------------------------- */
(function () {
  "use strict";

  var VERSION = "kaly-native-profile-click-bridge-1.1.1-memberlist-only-integrated";

  if (window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__ && typeof window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__.stop === "function") {
    window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__.stop();
  }

  var controller = new AbortController();

  var PROFILE_CARD_SELECTOR = [
    ".ProfileCardLayout\\.module__profileCard___XzE1MW",
    '[class~="ProfileCardLayout.module__profileCard___XzE1MW"]',
    '[class*="ProfileCardLayout"][class*="profileCard"]'
  ].join(",");

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, "");
  }

  function getAttr(node, name) {
    try {
      if (!node || !node.getAttribute) return "";
      return node.getAttribute(name) || "";
    } catch (error) {
      return "";
    }
  }

  function getClass(node) {
    try {
      if (!node) return "";
      return String(node.className || "");
    } catch (error) {
      return "";
    }
  }

  function getKalyApi() {
    return window.KalyFluxerMemberListFix || null;
  }

  function isKalyPanelNode(node) {
    return Boolean(node && node.closest && node.closest("#kaly-fluxer-memberlist-fix"));
  }

  function isForbiddenFluxerTarget(node) {
    if (!node || !node.closest) return true;
    if (isKalyPanelNode(node)) return true;

    if (node.closest('[class*="ProfileCardLayout"]')) return true;
    if (node.closest('[class*="ProfileCardBanner"]')) return true;
    if (node.closest('[class*="Message.module"]')) return true;
    if (node.closest('[class*="Message__"]')) return true;
    if (node.closest('[class*="messageAvatar"]')) return true;
    if (node.closest('[class*="message"]') && !node.closest('[class*="MemberListItem"]')) return true;

    return false;
  }

  function getBlob(root) {
    if (!root) return "";

    var parts = [];
    var nodes = [root];

    try {
      var children = root.querySelectorAll("*");
      for (var i = 0; i < children.length && i < 250; i += 1) {
        nodes.push(children[i]);
      }
    } catch (error) {}

    nodes.forEach(function (node) {
      if (!node) return;

      parts.push(node.textContent || "");
      parts.push(getClass(node));
      parts.push(getAttr(node, "aria-label"));
      parts.push(getAttr(node, "title"));
      parts.push(getAttr(node, "alt"));
      parts.push(getAttr(node, "href"));
      parts.push(getAttr(node, "src"));
      parts.push(getAttr(node, "data-user-id"));
      parts.push(getAttr(node, "data-member-id"));
      parts.push(getAttr(node, "data-id"));

      try {
        if (node.href && typeof node.href === "object" && node.href.baseVal) {
          parts.push(node.href.baseVal);
        }
      } catch (error2) {}

      try {
        if (node.src) {
          parts.push(node.src);
        }
      } catch (error3) {}
    });

    return parts.join(" ");
  }

  function getMemberFromKalyButton(button) {
    var id = button.getAttribute("data-kml-member-id") || "";
    var name = button.getAttribute("data-kml-member-name") || "";

    var api = getKalyApi();
    var members = api && api.state && Array.isArray(api.state.members)
      ? api.state.members
      : [];

    var needleName = normalizeText(name);

    for (var i = 0; i < members.length; i += 1) {
      if (String(members[i].id) === String(id)) return members[i];
    }

    for (var j = 0; j < members.length; j += 1) {
      if (normalizeText(members[j].displayName) === needleName) return members[j];
    }

    return {
      id: id,
      displayName: name,
      username: name,
      tag: name,
      avatarUrl: ""
    };
  }

  function collectNativeMemberButtons() {
    var out = [];
    var seen = new Set();

    function add(button) {
      if (!button) return;
      if (seen.has(button)) return;
      if (isForbiddenFluxerTarget(button)) return;

      var tag = String(button.tagName || "").toUpperCase();
      var cls = getClass(button);

      if (tag !== "BUTTON") return;
      if (cls.indexOf("MemberListItem") === -1) return;

      seen.add(button);
      out.push(button);
    }

    try {
      document.querySelectorAll('button[class*="MemberListItem"]').forEach(function (button) {
        add(button);
      });
    } catch (error) {}

    try {
      document.querySelectorAll('[class*="MemberListItem"]').forEach(function (node) {
        var button = node.closest ? node.closest("button") : null;
        add(button);
      });
    } catch (error2) {}

    return out;
  }

  function scoreButton(button, member) {
    if (!button || isForbiddenFluxerTarget(button)) return -999999;

    var cls = getClass(button);
    if (cls.indexOf("MemberListItem") === -1) return -999999;

    var raw = getBlob(button);
    var norm = normalizeText(raw);

    var id = String(member.id || "");
    var username = normalizeText(member.username || "");
    var displayName = normalizeText(member.displayName || "");
    var tag = normalizeText(member.tag || "");

    var avatarUrl = String(member.avatarUrl || "");
    var avatarFile = "";

    try {
      avatarFile = avatarUrl ? new URL(avatarUrl, location.href).pathname.split("/").pop() : "";
    } catch (error) {
      avatarFile = "";
    }

    var score = 0;
    var strong = false;

    if (id && raw.indexOf("/media/avatars/" + id + "/") !== -1) {
      score += 10000;
      strong = true;
    }

    if (id && raw.indexOf("/avatars/" + id + "/") !== -1) {
      score += 9000;
      strong = true;
    }

    if (id && raw.indexOf(id) !== -1) {
      score += 7000;
      strong = true;
    }

    if (avatarUrl && raw.indexOf(avatarUrl) !== -1) {
      score += 6000;
      strong = true;
    }

    if (avatarFile && raw.indexOf(avatarFile) !== -1) {
      score += 4000;
      strong = true;
    }

    if (tag && norm.indexOf(tag) !== -1) {
      score += 3000;
      strong = true;
    }

    if (username && norm.indexOf(username) !== -1) {
      score += 2200;
    }

    if (displayName && norm.indexOf(displayName) !== -1) {
      score += 2200;
    }

    if (raw.indexOf("BaseAvatar.module__container") !== -1) score += 500;
    if (raw.indexOf("MemberListItem.module__grid") !== -1) score += 500;
    if (cls.indexOf("MemberListItem") !== -1) score += 1000;

    var rect = button.getBoundingClientRect ? button.getBoundingClientRect() : null;
    if (rect && rect.width > 0 && rect.height > 0) score += 200;

    if (!strong && score < 4200) return -999999;

    return score;
  }

  function findNativeMemberButton(member) {
    var buttons = collectNativeMemberButtons();
    var candidates = [];

    buttons.forEach(function (button) {
      var score = scoreButton(button, member);

      if (score > 0) {
        candidates.push({
          button: button,
          score: score,
          className: getClass(button),
          ariaLabel: getAttr(button, "aria-label"),
          blob: getBlob(button).slice(0, 700)
        });
      }
    });

    candidates.sort(function (a, b) {
      return b.score - a.score;
    });

    window.__KALY_NATIVE_PROFILE_LAST_CANDIDATES__ = candidates.slice(0, 20);

    return candidates[0] || null;
  }

  function getClickTargetInsideButton(button) {
    if (!button) return null;

    var avatar = null;

    try {
      avatar = button.querySelector('[class*="BaseAvatar"]');
    } catch (error) {}

    if (avatar && !isForbiddenFluxerTarget(avatar)) return avatar;

    return button;
  }

  function dispatchRealClick(target) {
    if (!target) return false;

    var rect = target.getBoundingClientRect
      ? target.getBoundingClientRect()
      : {
        left: 10,
        top: 10,
        width: 20,
        height: 20
      };

    var x = rect.left + Math.max(2, Math.min(rect.width / 2, rect.width - 2));
    var y = rect.top + Math.max(2, Math.min(rect.height / 2, rect.height - 2));

    var base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1
    };

    try {
      target.dispatchEvent(new PointerEvent("pointerover", base));
      target.dispatchEvent(new MouseEvent("mouseover", base));
      target.dispatchEvent(new PointerEvent("pointerenter", base));
      target.dispatchEvent(new MouseEvent("mouseenter", base));
      target.dispatchEvent(new PointerEvent("pointerdown", base));
      target.dispatchEvent(new MouseEvent("mousedown", base));

      try {
        target.focus({ preventScroll: true });
      } catch (errorFocus) {
        try {
          target.focus();
        } catch (errorFocus2) {}
      }

      target.dispatchEvent(new PointerEvent("pointerup", Object.assign({}, base, { buttons: 0 })));
      target.dispatchEvent(new MouseEvent("mouseup", Object.assign({}, base, { buttons: 0 })));
      target.dispatchEvent(new MouseEvent("click", Object.assign({}, base, { buttons: 0 })));

      return true;
    } catch (error) {
      try {
        target.click();
        return true;
      } catch (error2) {
        return false;
      }
    }
  }

  function closeExistingProfileCard() {
    var card = document.querySelector(PROFILE_CARD_SELECTOR);
    if (!card) return Promise.resolve(true);

    try {
      var closeButton = card.querySelector('button[aria-label*="Close"], button[aria-label*="Fermer"], button[class*="close"]');
      if (closeButton) closeButton.click();
    } catch (errorCloseButton) {}

    try {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true
      }));

      window.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true
      }));
    } catch (error) {}

    return new Promise(function (resolve) {
      var start = Date.now();

      var timer = setInterval(function () {
        var stillThere = document.querySelector(PROFILE_CARD_SELECTOR);

        if (!stillThere || Date.now() - start > 550) {
          clearInterval(timer);
          resolve(true);
        }
      }, 25);
    });
  }

  function cardMatchesMember(card, member) {
    if (!card || !member) return false;

    var raw = getBlob(card);
    var norm = normalizeText(raw);

    var id = String(member.id || "");
    var username = normalizeText(member.username || "");
    var displayName = normalizeText(member.displayName || "");
    var tag = normalizeText(member.tag || "");

    if (id && raw.indexOf(id) !== -1) return true;
    if (id && raw.indexOf("/media/avatars/" + id + "/") !== -1) return true;
    if (tag && norm.indexOf(tag) !== -1) return true;
    if (username && norm.indexOf(username) !== -1) return true;
    if (displayName && norm.indexOf(displayName) !== -1) return true;

    return false;
  }

  function waitForMatchingProfileCard(member, timeoutMs) {
    timeoutMs = timeoutMs || 1600;

    return new Promise(function (resolve) {
      var start = Date.now();

      function check() {
        var card = document.querySelector(PROFILE_CARD_SELECTOR);

        if (card && cardMatchesMember(card, member)) {
          resolve(card);
          return true;
        }

        if (Date.now() - start >= timeoutMs) {
          resolve(card || null);
          return true;
        }

        return false;
      }

      if (check()) return;

      var observer = new MutationObserver(function () {
        if (check()) {
          observer.disconnect();
          clearInterval(timer);
        }
      });

      var timer = setInterval(function () {
        if (check()) {
          observer.disconnect();
          clearInterval(timer);
        }
      }, 50);

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    });
  }

  async function openRealSmallFluxerProfile(button) {
    var member = getMemberFromKalyButton(button);

    if (!member || !member.id) {
      console.error("[KalyProfileBridge] Membre introuvable depuis .kml-member", button);
      return false;
    }

    await closeExistingProfileCard();

    var found = findNativeMemberButton(member);

    if (!found || !found.button) {
      console.error("[KalyProfileBridge] Aucun MemberListItem natif sûr trouvé pour :", member);
      console.log("[KalyProfileBridge] Candidats refusés ou faibles :", window.__KALY_NATIVE_PROFILE_LAST_CANDIDATES__ || []);
      return false;
    }

    var target = getClickTargetInsideButton(found.button);

    console.log("[KalyProfileBridge] Clic strict sur MemberListItem natif :", {
      version: VERSION,
      member: member,
      score: found.score,
      button: found.button,
      target: target,
      candidates: window.__KALY_NATIVE_PROFILE_LAST_CANDIDATES__ || []
    });

    try {
      found.button.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
    } catch (errorScroll) {}

    var clicked = dispatchRealClick(target);

    if (!clicked) {
      console.error("[KalyProfileBridge] Impossible de cliquer sur le MemberListItem natif :", found);
      return false;
    }

    var card = await waitForMatchingProfileCard(member, 1600);

    if (!card) {
      console.error("[KalyProfileBridge] Clic envoyé, mais aucune petite ProfileCard Fluxer détectée.");
      return false;
    }

    if (!cardMatchesMember(card, member)) {
      console.error("[KalyProfileBridge] ProfileCard ouverte, mais ce n’est PAS le bon membre. Je la ferme pour éviter le profil random.", {
        expected: member,
        card: card,
        text: getBlob(card).slice(0, 1000)
      });

      await closeExistingProfileCard();
      return false;
    }

    console.log("[KalyProfileBridge] Petite ProfileCard Fluxer correcte ouverte :", card);
    return true;
  }

  function onClick(event) {
    var target = event.target;
    var button = target && target.closest ? target.closest("button.kml-member") : null;

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openRealSmallFluxerProfile(button);
  }

  /* Click auto désactivé dans la version fusionnée.
     Le routeur final choisit : vraie ProfileCard Fluxer d'abord, fallback carte API. */

  window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__ = {
    version: VERSION,
    stop: function () {
      controller.abort();
      delete window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__;
      console.log("[KalyProfileBridge] stoppé");
    },
    openFromKalyButton: openRealSmallFluxerProfile,
    findNative: function (nameOrId) {
      var api = getKalyApi();
      var members = api && api.state && Array.isArray(api.state.members)
        ? api.state.members
        : [];

      var needle = normalizeText(nameOrId);
      var member = null;

      for (var i = 0; i < members.length; i += 1) {
        if (
          String(members[i].id) === String(nameOrId) ||
          normalizeText(members[i].displayName).indexOf(needle) !== -1 ||
          normalizeText(members[i].username).indexOf(needle) !== -1 ||
          normalizeText(members[i].tag).indexOf(needle) !== -1
        ) {
          member = members[i];
          break;
        }
      }

      if (!member) return null;

      return findNativeMemberButton(member);
    },
    open: function (nameOrId) {
      var api = getKalyApi();
      var members = api && api.state && Array.isArray(api.state.members)
        ? api.state.members
        : [];

      var needle = normalizeText(nameOrId);
      var member = null;

      for (var i = 0; i < members.length; i += 1) {
        if (
          String(members[i].id) === String(nameOrId) ||
          normalizeText(members[i].displayName).indexOf(needle) !== -1 ||
          normalizeText(members[i].username).indexOf(needle) !== -1 ||
          normalizeText(members[i].tag).indexOf(needle) !== -1
        ) {
          member = members[i];
          break;
        }
      }

      if (!member) return false;

      var safeId = String(member.id).replace(/"/g, '\\"');
      var fakeButton = document.querySelector('button.kml-member[data-kml-member-id="' + safeId + '"]');

      if (!fakeButton) {
        console.error("[KalyProfileBridge] Bouton .kml-member introuvable pour :", member);
        return false;
      }

      openRealSmallFluxerProfile(fakeButton);
      return true;
    },
    dump: function () {
      return {
        version: VERSION,
        apiLoaded: Boolean(getKalyApi()),
        members: getKalyApi() && getKalyApi().state && getKalyApi().state.members
          ? getKalyApi().state.members.length
          : 0,
        profileCard: document.querySelector(PROFILE_CARD_SELECTOR),
        lastCandidates: window.__KALY_NATIVE_PROFILE_LAST_CANDIDATES__ || []
      };
    }
  };

  console.log("[KalyProfileBridge] actif", VERSION);
})();

/* -------------------------------------------------------------------------- */
/* Kaly patch: routeur final de clic membre                                   */
/* -------------------------------------------------------------------------- */
(function () {
  "use strict";

  var VERSION = "kaly-member-click-router-api-direct-alt-native-1.1.0";

  if (window.__KALY_MERGED_MEMBER_CLICK_ROUTER__ && typeof window.__KALY_MERGED_MEMBER_CLICK_ROUTER__.stop === "function") {
    try {
      window.__KALY_MERGED_MEMBER_CLICK_ROUTER__.stop();
    } catch (errorStop) {}
  }

  var controller = new AbortController();

  async function openMember(button, event) {
    var wantsNative = Boolean(event && event.altKey);

    /*
      Chargement externe via Nginx/GitHub : le bridge natif peut attendre jusqu'à ~1,6 s
      avant de tomber en fallback. Résultat visible : premier clic profil qui semble
      « recharger ». Par défaut on ouvre donc directement notre ProfileCard API.
      Alt+clic garde l'ancien test natif si besoin de debug.
    */
    if (wantsNative && window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__ && typeof window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__.openFromKalyButton === "function") {
      try {
        var nativeOk = await window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__.openFromKalyButton(button);
        if (nativeOk) return true;
      } catch (errorNative) {
        console.warn("[KalyMemberRouter] ProfileCard native KO, fallback API :", errorNative);
      }
    }

    if (window.KALY_FLUXER_PROFILECARD_API && typeof window.KALY_FLUXER_PROFILECARD_API.openFromButton === "function") {
      return window.KALY_FLUXER_PROFILECARD_API.openFromButton(button, event || {});
    }

    return false;
  }

  function onClick(event) {
    var target = event.target;
    var button = target && target.closest ? target.closest("button.kml-member") : null;

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openMember(button, event);
  }

  document.addEventListener("click", onClick, {
    capture: true,
    signal: controller.signal
  });

  window.__KALY_MERGED_MEMBER_CLICK_ROUTER__ = {
    version: VERSION,
    openButton: openMember,
    stop: function () {
      controller.abort();
      delete window.__KALY_MERGED_MEMBER_CLICK_ROUTER__;
      console.log("[KalyMemberRouter] stoppé");
    },
    dump: function () {
      return {
        version: VERSION,
        nativeBridge: Boolean(window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__),
        apiFallback: Boolean(window.KALY_FLUXER_PROFILECARD_API),
        members: window.KalyFluxerMemberListFix && window.KalyFluxerMemberListFix.state && window.KalyFluxerMemberListFix.state.members
          ? window.KalyFluxerMemberListFix.state.members.length
          : 0
      };
    }
  };

  if (window.KalyFluxerMemberListFix) {
    window.KalyFluxerMemberListFix.openMergedProfile = function (nameOrId) {
      var api = window.KalyFluxerMemberListFix;
      var members = api && api.state && Array.isArray(api.state.members) ? api.state.members : [];
      var needle = String(nameOrId || "").toLowerCase();
      var member = members.find(function (item) {
        return String(item.id) === String(nameOrId) ||
          String(item.displayName || "").toLowerCase().indexOf(needle) !== -1 ||
          String(item.username || "").toLowerCase().indexOf(needle) !== -1 ||
          String(item.tag || "").toLowerCase().indexOf(needle) !== -1;
      });

      if (!member) return false;

      var safeId = String(member.id).replace(/"/g, '\\"');
      var button = document.querySelector('button.kml-member[data-kml-member-id="' + safeId + '"]');

      if (!button) return window.KALY_FLUXER_PROFILECARD_API.open(member.id);

      openMember(button, {
        altKey: false,
        clientX: window.innerWidth - 320,
        clientY: 72,
        preventDefault: function () {},
        stopPropagation: function () {},
        stopImmediatePropagation: function () {}
      });

      return true;
    };
  }

  console.log("[KalyMemberRouter] actif", VERSION, "clic = API direct, Alt+clic = test natif");
})();

/* -------------------------------------------------------------------------- */
/* Kaly patch: ProfileCard officielle utilisable, layout basé source + docs   */
/* -------------------------------------------------------------------------- */
(function () {
  "use strict";

  var VERSION = "kaly-fluxer-profilecard-official-layout-11.0.24-staff-hitbox";
  var ORIGIN = location.origin.replace(/\/+$/, "");
  var ROOT_ID = "kaly-fluxer-native-look-profile-root";
  var STYLE_ID = "kaly-fluxer-native-look-profile-style";

  if (window.KALY_FLUXER_PROFILECARD_API && typeof window.KALY_FLUXER_PROFILECARD_API.stop === "function") {
    try {
      window.KALY_FLUXER_PROFILECARD_API.stop();
    } catch (errorStop) {
      console.warn("[KalyProfileCard] ancien stop() incomplet, nettoyage DOM forcé :", errorStop);
    }
  }

  /*
    Les anciennes versions réutilisaient le même ROOT_ID / STYLE_ID et certaines stop()
    plantaient sur PROFILE_MODAL_STYLE_ID non défini. Résultat : vieux CSS encore actif,
    bouton JSON au mauvais endroit et couche modal qui mange les clics. On nettoie tout
    avant de recréer le profil officiel.
  */
  try {
    Array.prototype.slice.call(document.querySelectorAll(
      "#" + ROOT_ID + ",style[id^='" + STYLE_ID + "']"
    )).forEach(function (element) {
      element.remove();
    });
  } catch (errorCleanup) {
    console.warn("[KalyProfileCard] nettoyage ancien profil incomplet :", errorCleanup);
  }

  var controller = new AbortController();
  var busy = false;
  var lastBundle = null;
  var lastError = null;
  var lastRequests = [];
  var STAFF_FLAG_CACHE_KEY = "kaly_fluxer_staff_flag_cache_v1";
  var STAFF_FLAG_OVERRIDE_KEY = "kaly_fluxer_staff_user_ids";

  function text(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return String(value);
    } catch (error) {
      return "";
    }
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return text(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, "");
  }

  function firstValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function unique(values) {
    var seen = new Set();
    var out = [];

    values.forEach(function (value) {
      value = text(value).trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      out.push(value);
    });

    return out;
  }

  function loadStaffFlagCache() {
    try {
      var raw = localStorage.getItem(STAFF_FLAG_CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveStaffFlagCache(cache) {
    try {
      localStorage.setItem(STAFF_FLAG_CACHE_KEY, JSON.stringify(cache || {}));
    } catch (error) {}
  }

  function readStaffOverrideIds() {
    var raw = text(localStorage.getItem(STAFF_FLAG_OVERRIDE_KEY) || "").trim();
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return unique(parsed.map(text).filter(Boolean));
    } catch (error) {}

    return unique(raw.split(/[\s,;]+/).map(text).filter(Boolean));
  }

  function writeStaffOverrideIds(ids) {
    try {
      localStorage.setItem(STAFF_FLAG_OVERRIDE_KEY, JSON.stringify(unique((ids || []).map(text).filter(Boolean))));
    } catch (error) {}
  }

  function hasStaffOverride(userId) {
    userId = text(userId);
    return readStaffOverrideIds().indexOf(userId) !== -1;
  }

  function setStaffOverride(userId, enabled) {
    userId = text(userId);
    if (!userId) return false;

    var ids = readStaffOverrideIds().filter(function (id) {
      return id !== userId;
    });

    if (enabled !== false) ids.push(userId);
    writeStaffOverrideIds(ids);
    return true;
  }

  function parseCookie(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function collectStrings(value, path, out) {
    path = path || "";
    out = out || [];

    if (typeof value === "string") {
      out.push({ path: path, value: value });
      return out;
    }

    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        collectStrings(item, path + "[" + index + "]", out);
      });
      return out;
    }

    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        collectStrings(value[key], path ? path + "." + key : key, out);
      });
    }

    return out;
  }

  function getTokenCandidates() {
    var tokens = [];

    ["session", "token", "access_token", "auth", "authorization", "session_token", "csrf_token", "csrftoken"].forEach(function (cookieName) {
      var value = parseCookie(cookieName);
      if (value) tokens.push(value);
    });

    [localStorage, sessionStorage].forEach(function (storage) {
      if (!storage) return;

      for (var i = 0; i < storage.length; i += 1) {
        var key = storage.key(i) || "";
        var raw = storage.getItem(key) || "";
        var lowerKey = key.toLowerCase();

        if (
          lowerKey.indexOf("token") !== -1 ||
          lowerKey.indexOf("auth") !== -1 ||
          lowerKey.indexOf("session") !== -1 ||
          lowerKey.indexOf("access") !== -1
        ) {
          tokens.push(raw);
        }

        try {
          var parsed = JSON.parse(raw);
          collectStrings(parsed, key, []).forEach(function (item) {
            var path = text(item.path).toLowerCase();
            var value = text(item.value).trim();

            if (
              value.length >= 16 &&
              value.length <= 4096 &&
              (
                path.indexOf("token") !== -1 ||
                path.indexOf("auth") !== -1 ||
                path.indexOf("session") !== -1 ||
                path.indexOf("access") !== -1
              ) &&
              path.indexOf("csrf") === -1
            ) {
              tokens.push(value);
            }
          });
        } catch (errorJson) {}
      }
    });

    return unique(tokens).filter(function (token) {
      return token.length >= 12 && token.length <= 4096;
    });
  }

  function buildHeaderSets() {
    var sets = [];
    var csrf = parseCookie("csrf_token") || parseCookie("csrftoken") || "";
    var tokens = getTokenCandidates();

    tokens.forEach(function (token) {
      if (!token) return;

      if (token.indexOf("Bearer ") === 0 || token.indexOf("Bot ") === 0 || token.indexOf("Session ") === 0) {
        sets.push({ Authorization: token });
      } else {
        sets.push({ Authorization: token });
        sets.push({ Authorization: "Bearer " + token });
        sets.push({ Authorization: "Session " + token });
        sets.push({ "X-Session-Token": token });
        sets.push({ "X-Auth-Token": token });
      }
    });

    if (csrf) sets.push({ "X-CSRF-Token": csrf });
    sets.push({});

    return unique(sets.map(function (headers) {
      return JSON.stringify(headers);
    })).map(function (headers) {
      return JSON.parse(headers);
    });
  }

  function cleanBase(value) {
    var raw = text(value || ORIGIN).trim();
    if (!raw) return ORIGIN + "/api/v1";

    try {
      var url = new URL(raw, location.href);
      var href = url.href.replace(/\/+$/, "");
      href = href.replace(/\/api\/v1\/.*$/, "/api/v1");
      href = href.replace(/\/api\/.*$/, "/api");
      href = href.replace(/\/(guilds|channels|users|members|roles|media|avatars|banners)\/.*$/, "");

      if (/\/api\/v1$/.test(href)) return href;
      if (/\/api$/.test(href)) return href + "/v1";
      if (/\/v1$/.test(href)) return href;
      return href + "/api/v1";
    } catch (error) {
      return ORIGIN + "/api/v1";
    }
  }

  function getApiBase() {
    var state = getState();
    var fromState = state.base || (window.KalyFluxerMemberListFix && window.KalyFluxerMemberListFix.config && window.KalyFluxerMemberListFix.config.apiBase) || "";
    return cleanBase(localStorage.getItem("kaly_fluxer_memberlist_api_base") || fromState || ORIGIN);
  }

  async function requestJson(method, path, body) {
    var apiBase = getApiBase();
    var url = path.indexOf("http") === 0 ? path : apiBase + path;
    var headersList = buildHeaderSets();
    var last = null;

    for (var i = 0; i < headersList.length; i += 1) {
      var headers = Object.assign({ Accept: "application/json" }, headersList[i]);
      if (body !== undefined) headers["Content-Type"] = "application/json";

      try {
        var response = await fetch(url, {
          method: method,
          credentials: "include",
          headers: headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal
        });

        var contentType = response.headers.get("content-type") || "";
        var rawText = await response.text();
        var json = null;

        try {
          json = rawText ? JSON.parse(rawText) : null;
        } catch (errorJson) {
          json = null;
        }

        last = {
          ok: response.ok,
          status: response.status,
          contentType: contentType,
          text: rawText,
          json: json,
          url: url
        };

        lastRequests.push({ method: method, url: url, status: response.status, ok: response.ok, contentType: contentType });
        if (lastRequests.length > 25) lastRequests.shift();

        if (response.ok && json !== null) return last;
      } catch (error) {
        last = {
          ok: false,
          status: 0,
          contentType: "",
          text: text(error && error.message ? error.message : error),
          json: null,
          url: url
        };
        lastRequests.push({ method: method, url: url, status: 0, ok: false, contentType: "", error: last.text });
        if (lastRequests.length > 25) lastRequests.shift();
      }
    }

    return last;
  }

  function getKalyApi() {
    return window.KalyFluxerMemberListFix || null;
  }

  function getState() {
    var api = getKalyApi();
    return api && api.state ? api.state : {};
  }

  function getMembers() {
    var state = getState();
    return Array.isArray(state.members) ? state.members : [];
  }

  function getRoles() {
    var state = getState();
    return Array.isArray(state.roles) ? state.roles : [];
  }

  function getGuildId() {
    var state = getState();
    if (state.guildId) return text(state.guildId);

    var stored = localStorage.getItem("kaly_fluxer_memberlist_guild_id");
    if (stored) return stored;

    var match = location.href.match(/\/channels\/([1-9][0-9]{14,24})\/([1-9][0-9]{14,24})/);
    if (match && match[1]) return match[1];

    return "";
  }

  function getChannelId() {
    var match = location.href.match(/\/channels\/([1-9][0-9]{14,24}|@me)\/([1-9][0-9]{14,24})/);
    return match && match[2] ? match[2] : "";
  }

  function isSelf(userId) {
    var state = getState();
    return Boolean(state.selfMemberId && text(state.selfMemberId) === text(userId));
  }

  function normalizeStatus(value) {
    var raw = value;

    if (raw && typeof raw === "object") {
      raw = firstValue(
        raw.status,
        raw.state,
        raw.type,
        raw.name,
        raw.presence,
        raw.online_status,
        raw.onlineStatus,
        raw.client_status,
        raw.clientStatus,
        raw.desktop,
        raw.mobile,
        raw.web,
        ""
      );
    }

    if (raw === true) return "online";
    if (raw === false) return "offline";

    var status = text(raw || "unknown").toLowerCase();

    if (["online", "active", "available", "connected", "connecte", "connecté", "en ligne"].indexOf(status) !== -1) return "online";
    if (["idle", "away", "absent", "afk"].indexOf(status) !== -1) return "idle";
    if (["dnd", "do_not_disturb", "do-not-disturb", "busy", "occupé", "occupe", "ne pas déranger"].indexOf(status) !== -1) return "dnd";
    if (["offline", "invisible", "hidden", "disconnected", "hors ligne"].indexOf(status) !== -1) return "offline";

    return "unknown";
  }

  function statusLabel(status) {
    if (status === "online") return "En ligne";
    if (status === "idle") return "Absent";
    if (status === "dnd") return "Ne pas déranger";
    if (status === "offline") return "Hors ligne";
    return "Statut inconnu";
  }

  function statusColor(status) {
    if (status === "online") return "var(--status-online,#23a55a)";
    if (status === "idle") return "var(--status-idle,#f0b232)";
    if (status === "dnd") return "var(--status-danger,#f23f43)";
    if (status === "offline") return "var(--text-muted,#80848e)";
    return "var(--text-muted,#80848e)";
  }

  function normalizeColor(value, fallback) {
    if (value && typeof value === "object") {
      value = firstValue(
        value.primary_color,
        value.primaryColor,
        value.secondary_color,
        value.secondaryColor,
        value.color,
        value.colour,
        value.hex,
        value.hex_color,
        value.hexColor,
        ""
      );
    }

    if (value === undefined || value === null || value === "") return fallback || "";

    if (typeof value === "number") {
      if (!Number.isFinite(value) || value <= 0) return fallback || "";
      return "#" + Math.floor(value).toString(16).padStart(6, "0").slice(-6).toUpperCase();
    }

    var raw = text(value).trim();
    if (!raw || raw === "0" || raw.toLowerCase() === "null") return fallback || "";
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return "#" + raw.slice(1).split("").map(function (char) {
        return char + char;
      }).join("").toUpperCase();
    }
    if (/^0x[0-9a-fA-F]{6}$/.test(raw)) return "#" + raw.slice(2).toUpperCase();
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return "#" + raw.toUpperCase();
    if (/^[0-9]+$/.test(raw)) {
      var number = Number(raw);
      if (!Number.isFinite(number) || number <= 0) return fallback || "";
      return "#" + Math.floor(number).toString(16).padStart(6, "0").slice(-6).toUpperCase();
    }

    return fallback || "";
  }

  function snowflakeDate(id) {
    var raw = text(id);
    if (!/^[1-9][0-9]{14,24}$/.test(raw)) return "";

    try {
      var big = BigInt(raw);
      var timestamp = Number((big >> 22n) + 1420070400000n);
      var date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString();
    } catch (error) {
      return "";
    }
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    } catch (error) {
      return "";
    }
  }

  function fileNameVariants(raw) {
    var value = text(raw).trim();
    if (!value) return [];

    if (/^https?:\/\//.test(value) || value.indexOf("/") === 0 || value.indexOf("media/") === 0) return [value];

    value = value.replace(/^\/+/, "").split("?")[0];
    if (!value) return [];

    if (/\.(png|jpg|jpeg|webp|gif)$/i.test(value)) return [value];

    /*
      Self-host Fluxer / fluxer.lycoria.net : les champs profile.avatar/profile.banner
      arrivent comme hash nu, mais le media proxy attend un vrai filename.
      Ne PAS envoyer hash sans extension : ça donne HTTP 400.
      Ne PAS utiliser fluxerusercontent.com ici : la CSP de l'instance le bloque.
    */
    return [value + (value.indexOf("a_") === 0 ? ".gif" : ".webp")];
  }

  function absoluteAssetUrl(kind, userId, filename, size, format) {
    var file = text(filename).replace(/^\/+/, "");
    var params = new URLSearchParams();
    params.set("size", text(size || "160"));
    if (format) params.set("format", format);
    params.set("quality", "high");
    params.set("animated", file.indexOf("a_") === 0 || /\.gif$/i.test(file) ? "true" : "false");
    return ORIGIN + "/" + kind + "/" + encodeURIComponent(userId) + "/" + encodeURIComponent(file) + "?" + params.toString();
  }

  function mediaAssetUrl(kind, userId, filename, size) {
    var file = text(filename).replace(/^\/+/, "");
    return ORIGIN + "/media/" + kind + "/" + encodeURIComponent(userId) + "/" + encodeURIComponent(file) + "?size=" + encodeURIComponent(text(size || "160"));
  }

  function assetCandidates(kind, userId, raw, size) {
    raw = firstValue(raw, "");
    if (!raw || !userId) return [];

    var rawText = text(raw).trim();
    if (!rawText) return [];

    if (/^https?:\/\//.test(rawText)) {
      try {
        var url = new URL(rawText, location.href);
        if (url.origin !== ORIGIN && url.hostname !== "fluxerstatic.com") return [];
      } catch (errorUrl) {
        return [];
      }
      return [rawText];
    }

    if (rawText.indexOf("/media/") === 0) return [ORIGIN + rawText];
    if (rawText.indexOf("media/") === 0) return [ORIGIN + "/" + rawText];
    if (rawText.indexOf("/avatars/") === 0 || rawText.indexOf("/banners/") === 0) return [ORIGIN + rawText];

    var out = [];
    fileNameVariants(rawText).forEach(function (file) {
      /* L'app self-hostée passe par /media/* sur fluxer.lycoria.net. */
      out.push(mediaAssetUrl(kind, userId, file, size));
      /* Fallback compatible avec les routes media proxy documentées. */
      out.push(absoluteAssetUrl(kind, userId, file, size, file.indexOf(".gif") !== -1 ? "gif" : "webp"));
    });

    return unique(out);
  }

  function encodedSrcs(srcs) {
    return encodeURIComponent(JSON.stringify(unique(srcs || [])));
  }

  function activateAssetFallbacks(scope) {
    Array.prototype.slice.call((scope || document).querySelectorAll("img[data-kfp-srcs]")).forEach(function (img) {
      var srcs = [];
      try {
        srcs = JSON.parse(decodeURIComponent(img.getAttribute("data-kfp-srcs") || "%5B%5D"));
      } catch (error) {
        srcs = [];
      }

      srcs = unique(srcs);
      if (!srcs.length) return;

      var index = 0;
      img.onerror = function () {
        index += 1;
        if (index < srcs.length) {
          img.src = srcs[index];
          return;
        }

        img.removeAttribute("src");
        img.setAttribute("data-kfp-failed", "1");
        var fallback = img.parentElement && img.parentElement.querySelector(".kfp-img-fallback");
        if (fallback) fallback.removeAttribute("hidden");
      };

      img.onload = function () {
        img.setAttribute("data-kfp-loaded", "1");
      };

      img.src = srcs[0];
    });
  }

  function roleById(id) {
    var roles = getRoles();
    for (var i = 0; i < roles.length; i += 1) {
      if (text(roles[i].id) === text(id)) return roles[i];
    }
    return null;
  }

  function findMember(nameOrId) {
    var members = getMembers();
    var needle = normalizeText(nameOrId);
    var raw = text(nameOrId);

    for (var i = 0; i < members.length; i += 1) {
      var member = members[i];
      if (
        text(member.id) === raw ||
        normalizeText(member.displayName).indexOf(needle) !== -1 ||
        normalizeText(member.username).indexOf(needle) !== -1 ||
        normalizeText(member.tag).indexOf(needle) !== -1
      ) {
        return member;
      }
    }

    return null;
  }

  function memberFromButton(button) {
    var id = button.getAttribute("data-kml-member-id") || "";
    var name = button.getAttribute("data-kml-member-name") || "";
    return findMember(id) || findMember(name) || {
      id: id,
      displayName: name,
      username: name,
      tag: name,
      roles: [],
      roleObjects: [],
      avatarUrl: "",
      status: "unknown",
      raw: {},
      userRaw: {}
    };
  }

  async function fetchProfile(userId, guildId) {
    var query = new URLSearchParams();
    if (guildId) query.set("guild_id", guildId);
    query.set("with_mutual_friends", "true");
    query.set("with_mutual_guilds", "true");
    return requestJson("GET", "/users/" + encodeURIComponent(userId) + "/profile?" + query.toString());
  }

  async function fetchUser(userId) {
    return requestJson("GET", "/users/" + encodeURIComponent(userId));
  }

  var mutualGuildLookupCache = null;
  var mutualGuildLookupPromise = null;

  function normalizeGuildRecord(raw) {
    if (!raw || typeof raw !== "object") return null;

    var guild = firstValue(raw.guild, raw.community, raw.server, raw, {});
    var id = text(firstValue(
      guild.id,
      guild.guild_id,
      guild.guildId,
      raw.guild_id,
      raw.guildId,
      raw.id,
      ""
    ));

    if (!id) return null;

    return {
      id: id,
      name: text(firstValue(
        guild.name,
        guild.display_name,
        guild.displayName,
        raw.guild_name,
        raw.guildName,
        raw.name,
        ""
      )),
      icon: firstValue(
        guild.icon,
        guild.icon_hash,
        guild.iconHash,
        raw.guild_icon,
        raw.guildIcon,
        raw.icon,
        ""
      ),
      nick: text(firstValue(raw.nick, raw.nickname, raw.display_name, raw.displayName, "")),
      raw: raw
    };
  }

  function guildInitials(name, id) {
    var value = text(name).trim();
    if (!value) value = text(id).trim();
    if (!value) return "?";

    var words = value
      .replace(/[_-]+/g, " ")
      .split(/\s+/)
      .map(function (word) { return word.trim(); })
      .filter(Boolean);

    if (words.length >= 2) return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    return value.slice(0, 2).toUpperCase();
  }

  function getArrayPayload(json) {
    if (Array.isArray(json)) return json;
    if (!json || typeof json !== "object") return [];
    return firstValue(
      Array.isArray(json.guilds) ? json.guilds : null,
      Array.isArray(json.communities) ? json.communities : null,
      Array.isArray(json.servers) ? json.servers : null,
      Array.isArray(json.items) ? json.items : null,
      Array.isArray(json.results) ? json.results : null,
      Array.isArray(json.data) ? json.data : null,
      []
    );
  }

  async function fetchMutualGuildLookup() {
    if (mutualGuildLookupCache) return mutualGuildLookupCache;
    if (mutualGuildLookupPromise) return mutualGuildLookupPromise;

    mutualGuildLookupPromise = (async function () {
      var lookup = Object.create(null);

      function add(raw) {
        var guild = normalizeGuildRecord(raw);
        if (!guild || !guild.id) return;
        lookup[guild.id] = Object.assign({}, lookup[guild.id] || {}, guild);
      }

      try {
        var response = await requestJson("GET", "/users/@me/guilds");
        if (response && response.ok && response.json) {
          getArrayPayload(response.json).forEach(add);
        }
      } catch (error) {
        console.warn("[KalyProfileCard] impossible de récupérer /users/@me/guilds pour enrichir les communautés mutuelles :", error);
      }

      /* Fallback DOM : utile si l'endpoint renvoie peu de données sur certains self-hosts. */
      Array.prototype.slice.call(document.querySelectorAll('a[href^="/channels/"],a[href*="/channels/"]')).forEach(function (link) {
        var href = link.getAttribute("href") || "";
        var match = href.match(/\/channels\/([0-9]{14,24})(?:\/|$)/);
        if (!match) return;
        var id = match[1];
        var label = text(firstValue(
          link.getAttribute("aria-label"),
          link.getAttribute("title"),
          link.textContent,
          ""
        )).trim();
        if (!label) return;
        lookup[id] = Object.assign({}, lookup[id] || {}, { id: id, name: label });
      });

      mutualGuildLookupCache = lookup;
      mutualGuildLookupPromise = null;
      return lookup;
    })();

    return mutualGuildLookupPromise;
  }

  function enrichMutualGuildItem(item, lookup) {
    var direct = normalizeGuildRecord(item) || {};
    var id = text(firstValue(
      direct.id,
      item && item.id,
      item && item.guild_id,
      item && item.guildId,
      item && item.guild && item.guild.id,
      ""
    ));
    var cached = id && lookup ? lookup[id] : null;
    var guild = firstValue(item && item.guild, {});

    return {
      id: id,
      name: text(firstValue(
        direct.name,
        guild.name,
        item && item.name,
        cached && cached.name,
        id ? "Serveur " + id.slice(-4) : "Communauté"
      )),
      icon: firstValue(
        direct.icon,
        guild.icon,
        item && item.icon,
        cached && cached.icon,
        ""
      ),
      nick: text(firstValue(
        direct.nick,
        item && item.nick,
        item && item.nickname,
        item && item.display_name,
        item && item.displayName,
        cached && cached.nick,
        ""
      )),
      raw: item,
      guild: guild
    };
  }

  async function enrichBundleMutualGuilds(bundle) {
    if (!bundle || !Array.isArray(bundle.mutualGuilds) || !bundle.mutualGuilds.length) return bundle;

    var lookup = await fetchMutualGuildLookup();
    bundle.mutualGuilds = bundle.mutualGuilds
      .map(function (item) { return enrichMutualGuildItem(item, lookup); })
      .filter(function (item) { return item && item.id; });

    return bundle;
  }

  async function openDm(userId) {
    var response = await requestJson("POST", "/users/@me/channels", {
      recipient_id: userId
    });

    if (!response || !response.ok || !response.json) {
      console.error("[KalyProfileCard] DM API KO :", response);
      return false;
    }

    var channelId = firstValue(response.json.id, response.json.channel_id, response.json.channelId, "");
    if (!channelId) {
      console.error("[KalyProfileCard] DM créé mais channel id introuvable :", response.json);
      return false;
    }

    closeCard();
    window.KALY_FLUXER_SPA_NAVIGATE("/channels/@me/" + encodeURIComponent(channelId));
    return true;
  }

  function getProfileParts(profileJson, localMember, options) {
    options = options || {};

    var root = profileJson && typeof profileJson === "object" ? profileJson : {};
    var localRaw = localMember && localMember.raw && typeof localMember.raw === "object" ? localMember.raw : {};
    var localUser = localMember && localMember.userRaw && typeof localMember.userRaw === "object" ? localMember.userRaw : {};
    var globalProfile = Boolean(options.globalProfile);

    /*
      Profil global = pas de profil serveur.
      La doc officielle expose GET /users/{target_id}/profile avec guild_id optionnel.
      Sans guild_id, on doit privilégier user + user_profile et ne pas ressortir le nick,
      les rôles ou la bannière de guilde depuis les données locales.
    */
    var guildMember = globalProfile
      ? {}
      : firstValue(root.guild_member, root.guildMember, root.member, localRaw, {});

    var user = firstValue(
      root.user,
      globalProfile ? {} : guildMember.user,
      root.account,
      localUser,
      localMember.user,
      {}
    );

    var userProfile = firstValue(
      root.user_profile,
      root.userProfile,
      root.profile,
      root.profile_data,
      root.profileData,
      {}
    );

    var guildMemberProfile = globalProfile
      ? {}
      : firstValue(root.guild_member_profile, root.guildMemberProfile, guildMember.profile, {});

    return {
      root: root,
      user: user || {},
      userProfile: userProfile || {},
      guildMember: guildMember || {},
      guildMemberProfile: guildMemberProfile || {}
    };
  }

  function getEffectiveProfileData(parts, options) {
    options = options || {};

    var globalProfile = Boolean(options.globalProfile);
    var guildProfile = globalProfile ? {} : (parts.guildMemberProfile || {});
    var userProfile = parts.userProfile || {};
    var guildMember = globalProfile ? {} : (parts.guildMember || {});
    var user = parts.user || {};

    return {
      bio: firstValue(guildProfile.bio, guildProfile.description, userProfile.bio, userProfile.description, ""),
      pronouns: firstValue(guildProfile.pronouns, userProfile.pronouns, ""),
      banner: firstValue(
        guildProfile.banner,
        guildProfile.banner_hash,
        guildProfile.bannerHash,
        guildMember.banner,
        guildMember.banner_hash,
        guildMember.bannerHash,
        userProfile.banner,
        userProfile.banner_hash,
        userProfile.bannerHash,
        user.banner,
        ""
      ),
      accentColor: normalizeColor(firstValue(
        guildProfile.accent_color,
        guildProfile.accentColor,
        guildMember.accent_color,
        guildMember.accentColor,
        userProfile.accent_color,
        userProfile.accentColor,
        userProfile.banner_color,
        userProfile.bannerColor,
        user.avatar_color,
        user.avatarColor,
        ""
      ), ""),
      customStatus: firstValue(
        guildProfile.custom_status,
        guildProfile.customStatus,
        userProfile.custom_status,
        userProfile.customStatus,
        parts.root.custom_status,
        parts.root.customStatus,
        ""
      )
    };
  }

  function getRolesForBundle(parts, localMember) {
    var rawRoles = [];
    [
      parts.guildMember.roles,
      parts.guildMember.role_ids,
      parts.guildMember.roleIds,
      localMember.roles
    ].forEach(function (value) {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(function (item) {
          if (item && typeof item === "object") rawRoles.push(firstValue(item.id, item.role_id, item.roleId, ""));
          else rawRoles.push(item);
        });
      } else if (typeof value === "object") {
        Object.keys(value).forEach(function (key) {
          rawRoles.push(key);
        });
      }
    });

    var ids = unique(rawRoles.map(text).filter(Boolean));
    var roleObjects = ids.map(function (id) {
      return roleById(id) || { id: id, name: id, color: "", order: 999999, apiIndex: 999999, position: null };
    });

    if (localMember.roleObjects && localMember.roleObjects.length) roleObjects = localMember.roleObjects.slice();

    roleObjects.sort(function (a, b) {
      return Number(a.order || a.apiIndex || a.position || 999999) - Number(b.order || b.apiIndex || b.position || 999999);
    });

    return roleObjects;
  }

  function channelNameFromDom(channelId) {
    if (!channelId) return "";
    var guildId = getGuildId();
    var link = null;

    try {
      link = document.querySelector('a[href*="/channels/' + CSS.escape(guildId) + '/' + CSS.escape(channelId) + '"], a[href$="/' + CSS.escape(channelId) + '"]');
    } catch (error) {
      link = null;
    }

    if (link) {
      var label = text(link.textContent).trim();
      if (label) return label;
    }

    return "";
  }

  function findVoiceInfo(rawProfile) {
    var found = null;
    var seen = new WeakSet();

    function scan(value, path, depth) {
      if (found || !value || depth > 8) return;
      if (typeof value !== "object") return;
      if (seen.has(value)) return;
      seen.add(value);

      var keys = Object.keys(value);
      var joinedKeys = keys.join(" ").toLowerCase();
      var pathLower = path.toLowerCase();

      if (joinedKeys.indexOf("voice") !== -1 || joinedKeys.indexOf("channel") !== -1 || pathLower.indexOf("voice") !== -1) {
        var channelId = firstValue(
          value.channel_id,
          value.channelId,
          value.voice_channel_id,
          value.voiceChannelId,
          value.id && pathLower.indexOf("channel") !== -1 ? value.id : "",
          ""
        );
        var channelName = firstValue(value.channel_name, value.channelName, value.name, value.title, "");

        if (channelId || channelName) {
          found = { channelId: text(channelId), channelName: text(channelName) };
          return;
        }
      }

      keys.forEach(function (key) {
        scan(value[key], path ? path + "." + key : key, depth + 1);
      });
    }

    scan(rawProfile, "", 0);
    if (found && !found.channelName && found.channelId) found.channelName = channelNameFromDom(found.channelId);
    return found && (found.channelId || found.channelName) ? found : null;
  }

  function makeTag(username, discriminator, fallback) {
    username = text(username);
    discriminator = text(discriminator);
    if (username && discriminator && discriminator !== "0") return username + "#" + discriminator;
    return text(firstValue(fallback, username));
  }

  function normalizeConnection(connection) {
    if (!connection || typeof connection !== "object") return null;
    var type = text(firstValue(connection.type, connection.service, connection.provider, "domain"));
    var name = text(firstValue(connection.name, connection.username, connection.handle, connection.domain, connection.id, ""));
    if (!name) return null;
    return {
      id: text(firstValue(connection.id, name)),
      type: type,
      name: name,
      verified: Boolean(firstValue(connection.verified, connection.is_verified, connection.isVerified, false)),
      visibilityFlags: firstValue(connection.visibility_flags, connection.visibilityFlags, 0),
      sortOrder: Number(firstValue(connection.sort_order, connection.sortOrder, 0)) || 0
    };
  }

  function normalizeBundle(localMember, profileResponse, userResponse, options) {
    localMember = localMember || {};
    options = options || {};

    var globalProfile = Boolean(options.globalProfile);
    var profileJson = profileResponse && profileResponse.json && typeof profileResponse.json === "object" ? profileResponse.json : {};
    var userJson = userResponse && userResponse.json && typeof userResponse.json === "object" ? userResponse.json : {};
    var parts = getProfileParts(profileJson, localMember, options);

    if (!parts.user || !Object.keys(parts.user).length) parts.user = userJson || {};

    var profileData = getEffectiveProfileData(parts, options);
    var userId = text(firstValue(parts.user.id, parts.guildMember.user_id, parts.guildMember.userId, userJson.id, localMember.id, ""));
    var username = text(firstValue(parts.user.username, userJson.username, localMember.username, localMember.displayName, userId));
    var discriminator = text(firstValue(parts.user.discriminator, userJson.discriminator, localMember.discriminator, ""));
    var tag = makeTag(username, discriminator, localMember.tag);

    var displayName = globalProfile
      ? text(firstValue(
        parts.user.global_name,
        parts.user.globalName,
        userJson.global_name,
        userJson.globalName,
        parts.user.display_name,
        parts.user.displayName,
        localMember.username,
        username,
        userId
      ))
      : text(firstValue(
        parts.guildMember.nick,
        parts.guildMember.nickname,
        parts.guildMember.display_name,
        parts.guildMember.displayName,
        parts.user.global_name,
        parts.user.globalName,
        userJson.global_name,
        userJson.globalName,
        parts.user.display_name,
        parts.user.displayName,
        localMember.displayName,
        username,
        userId
      ));

    var avatarRaw = globalProfile
      ? firstValue(parts.user.avatar, userJson.avatar, localMember.avatar, "")
      : firstValue(parts.guildMember.avatar, parts.guildMember.avatar_hash, parts.guildMember.avatarHash, parts.user.avatar, userJson.avatar, localMember.avatar, "");

    var bannerRaw = profileData.banner;
    var avatarCandidates = unique([localMember.avatarUrl || ""].concat(assetCandidates("avatars", userId, avatarRaw, "160"))).filter(Boolean);
    var bannerCandidates = assetCandidates("banners", userId, bannerRaw, "600");

    var accentColor = firstValue(profileData.accentColor, globalProfile ? "" : localMember.nameColor, normalizeColor(parts.user.avatar_color, ""), "#7c3aed");
    var createdAt = firstValue(parts.user.created_at, parts.user.createdAt, userJson.created_at, userJson.createdAt, parts.root.created_at, parts.root.createdAt, snowflakeDate(userId), "");
    var joinedAt = globalProfile ? "" : firstValue(parts.guildMember.joined_at, parts.guildMember.joinedAt, localMember.raw && localMember.raw.joined_at, localMember.raw && localMember.raw.joinedAt, "");
    var status = normalizeStatus(firstValue(localMember.status, parts.root.presence, parts.user.presence, parts.user.status, userJson.status, "unknown"));
    var roles = globalProfile ? [] : getRolesForBundle(parts, localMember);
    var voice = globalProfile ? null : findVoiceInfo(profileJson);
    var rawConnections = Array.isArray(profileJson.connected_accounts) ? profileJson.connected_accounts : Array.isArray(profileJson.connectedAccounts) ? profileJson.connectedAccounts : [];
    var connections = rawConnections.map(normalizeConnection).filter(Boolean).sort(function (a, b) {
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    });

    return {
      version: VERSION,
      id: userId,
      username: username,
      discriminator: discriminator,
      tag: tag,
      displayName: displayName,
      pronouns: text(profileData.pronouns),
      bio: text(profileData.bio),
      customStatus: text(profileData.customStatus),
      avatarCandidates: avatarCandidates,
      bannerCandidates: bannerCandidates,
      accentColor: accentColor,
      createdAt: createdAt,
      joinedAt: joinedAt,
      status: status,
      roles: roles,
      voice: voice,
      bot: Boolean(firstValue(parts.user.bot, userJson.bot, localMember.bot, false)),
      system: Boolean(firstValue(parts.user.system, userJson.system, localMember.system, false)),
      flags: firstValue(
        parts.user.flags,
        parts.user.public_flags,
        parts.user.publicFlags,
        parts.user.user_flags,
        parts.user.userFlags,
        userJson.flags,
        userJson.public_flags,
        userJson.publicFlags,
        userJson.user_flags,
        userJson.userFlags,
        profileJson.flags,
        profileJson.public_flags,
        profileJson.publicFlags,
        profileJson.user_flags,
        profileJson.userFlags,
        localMember.flags,
        localMember.public_flags,
        localMember.publicFlags,
        localMember.user_flags,
        localMember.userFlags,
        0
      ),
      userFlags: firstValue(
        parts.user.user_flags,
        parts.user.userFlags,
        userJson.user_flags,
        userJson.userFlags,
        profileJson.user_flags,
        profileJson.userFlags,
        localMember.user_flags,
        localMember.userFlags,
        ""
      ),
      publicFlags: firstValue(
        parts.user.public_flags,
        parts.user.publicFlags,
        userJson.public_flags,
        userJson.publicFlags,
        profileJson.public_flags,
        profileJson.publicFlags,
        localMember.public_flags,
        localMember.publicFlags,
        ""
      ),
      userFlagCandidates: [
        parts.user.flags,
        parts.user.public_flags,
        parts.user.publicFlags,
        parts.user.user_flags,
        parts.user.userFlags,
        parts.user.user_flags_names,
        parts.user.userFlagsNames,
        userJson.flags,
        userJson.public_flags,
        userJson.publicFlags,
        userJson.user_flags,
        userJson.userFlags,
        userJson.user_flags_names,
        userJson.userFlagsNames,
        profileJson.flags,
        profileJson.public_flags,
        profileJson.publicFlags,
        profileJson.user_flags,
        profileJson.userFlags,
        profileJson.user_flags_names,
        profileJson.userFlagsNames,
        profileJson.user && profileJson.user.flags,
        profileJson.user && profileJson.user.public_flags,
        profileJson.user && profileJson.user.publicFlags,
        profileJson.user && profileJson.user.user_flags,
        profileJson.user && profileJson.user.userFlags,
        localMember.flags,
        localMember.public_flags,
        localMember.publicFlags,
        localMember.user_flags,
        localMember.userFlags,
        localMember.raw && localMember.raw.flags,
        localMember.raw && localMember.raw.public_flags,
        localMember.raw && localMember.raw.publicFlags,
        localMember.raw && localMember.raw.user_flags,
        localMember.raw && localMember.raw.userFlags,
        localMember.raw && localMember.raw.user && localMember.raw.user.flags,
        localMember.raw && localMember.raw.user && localMember.raw.user.public_flags,
        localMember.raw && localMember.raw.user && localMember.raw.user.publicFlags,
        localMember.raw && localMember.raw.user && localMember.raw.user.user_flags,
        localMember.raw && localMember.raw.user && localMember.raw.user.userFlags,
        localMember.userRaw && localMember.userRaw.flags,
        localMember.userRaw && localMember.userRaw.public_flags,
        localMember.userRaw && localMember.userRaw.publicFlags,
        localMember.userRaw && localMember.userRaw.user_flags,
        localMember.userRaw && localMember.userRaw.userFlags
      ],
      premiumType: firstValue(profileJson.premium_type, profileJson.premiumType, 0),
      premiumSince: firstValue(profileJson.premium_since, profileJson.premiumSince, ""),
      premiumLifetimeSequence: firstValue(profileJson.premium_lifetime_sequence, profileJson.premiumLifetimeSequence, ""),
      mutualFriends: Array.isArray(profileJson.mutual_friends) ? profileJson.mutual_friends : Array.isArray(profileJson.mutualFriends) ? profileJson.mutualFriends : [],
      mutualGuilds: Array.isArray(profileJson.mutual_guilds) ? profileJson.mutual_guilds : Array.isArray(profileJson.mutualGuilds) ? profileJson.mutualGuilds : [],
      connectedAccounts: connections,
      isSelf: isSelf(userId),
      isGlobalProfile: globalProfile,
      localMember: localMember,
      response: profileResponse,
      userResponse: userResponse,
      rawProfile: profileJson,
      parts: parts
    };
  }

  function ensureStyle() {
    var old = document.getElementById(STYLE_ID);
    if (old) old.remove();

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID}{position:fixed;inset:0;z-index:2147483500;pointer-events:none;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#${ROOT_ID} *{box-sizing:border-box}
#${ROOT_ID} .kfp-backdrop{position:absolute;inset:0;pointer-events:auto;background:transparent}
#${ROOT_ID} .kfp-popout{position:absolute;pointer-events:auto;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35)) drop-shadow(0 4px 8px rgba(0,0,0,.25)) drop-shadow(0 12px 24px rgba(0,0,0,.18))}
#${ROOT_ID} .kfp-card{position:relative;display:flex;width:300px;max-height:calc(100vh - 24px);flex-direction:column;gap:4px;overflow:hidden;border-radius:.375rem;border-style:solid;border-width:2.5px;background-color:var(--background-primary,#181025);color:var(--text-primary,#f7f1ff);padding-bottom:.75rem;border-color:var(--kfp-accent,#7c3aed)}
#${ROOT_ID} .kfp-header{height:140px;position:relative;flex:0 0 auto}
#${ROOT_ID} .kfp-banner-wrapper{flex-shrink:0;min-height:105px;position:relative}
#${ROOT_ID} .kfp-banner-mask{contain:layout paint;z-index:0;display:block;width:100%;height:105px}
#${ROOT_ID} .kfp-banner{width:100%;height:105px;min-height:105px;background-position:center;background-size:cover;background-repeat:no-repeat;background-color:var(--kfp-accent,#7c3aed);overflow:hidden}
#${ROOT_ID} .kfp-banner-img{width:100%;height:105px;display:block;object-fit:cover}
#${ROOT_ID} .kfp-banner-img[data-kfp-failed="1"]{display:none}
#${ROOT_ID} .kfp-avatar-button{position:absolute;top:55px;left:10px;border:4px solid var(--background-primary,#181025);border-radius:9999px;background-color:var(--background-primary,#181025);padding:0;outline:none;cursor:pointer}
#${ROOT_ID} .kfp-avatar{position:relative;width:80px;height:80px;border-radius:9999px;background:var(--background-primary,#181025)}
#${ROOT_ID} .kfp-avatar-img{width:80px;height:80px;display:block;object-fit:cover;border-radius:9999px;background:var(--background-primary,#181025)}
#${ROOT_ID} .kfp-avatar-img[data-kfp-failed="1"]{display:none}
#${ROOT_ID} .kfp-img-fallback{width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:linear-gradient(135deg,var(--kfp-accent,#7c3aed),#21152f);color:#fff;font-size:31px;font-weight:850}
#${ROOT_ID} .kfp-status-container{position:absolute;right:2px;bottom:2px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;padding:3px;border-radius:999px;background:var(--background-primary,#181025);pointer-events:none}
#${ROOT_ID} .kfp-status-dot{width:12px;height:12px;border-radius:999px;background:var(--text-muted,#80848e)}
#${ROOT_ID} .kfp-badges,#${ROOT_ID} .UserProfileBadges\.module__containerPopout___ZjBjOw{display:flex;justify-content:flex-end;align-items:center;gap:4px;min-height:22px;padding:0 1rem;margin-top:-24px;pointer-events:auto}
#${ROOT_ID} .kfp-official-badge-link,#${ROOT_ID} .UserProfileBadges\.module__link___ZjBjOw{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;margin:-7px;border-radius:999px;text-decoration:none;pointer-events:auto;position:relative;touch-action:manipulation}
#${ROOT_ID} .kfp-official-badge-img,#${ROOT_ID} .UserProfileBadges\.module__badgeDesktop___ZjBjOw{display:block;width:22px;height:22px;object-fit:contain}
#${ROOT_ID} .kfp-floating-tooltip{position:fixed;z-index:2147483647;pointer-events:none;padding:6px 8px;border-radius:6px;background:var(--background-floating,#111214);color:#fff;font-size:12px;font-weight:850;line-height:1;letter-spacing:.01em;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.38);opacity:0;transform:translateY(4px);transition:opacity .08s ease,transform .08s ease}
#${ROOT_ID} .kfp-floating-tooltip[data-show="1"]{opacity:1;transform:translateY(0)}
#${ROOT_ID} .kfp-floating-tooltip::after{content:"";position:absolute;left:50%;margin-left:-5px;border:5px solid transparent}
#${ROOT_ID} .kfp-floating-tooltip[data-placement="top"]::after{bottom:-10px;border-top-color:var(--background-floating,#111214)}
#${ROOT_ID} .kfp-floating-tooltip[data-placement="bottom"]::after{top:-10px;border-bottom-color:var(--background-floating,#111214)}
#${ROOT_ID} .kfp-content{display:flex;flex-direction:column;gap:.5rem;overflow:auto;padding-top:.5rem;padding-left:1rem;padding-right:1rem;scrollbar-width:thin;min-height:0}
#${ROOT_ID} .kfp-user-info{user-select:text;-webkit-user-select:text}
#${ROOT_ID} .kfp-name-row{display:flex;align-items:center;gap:.125rem;min-width:0}
#${ROOT_ID} .kfp-display-name{display:block;flex:0 1 auto;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:none;background:transparent;padding:0;text-align:left;vertical-align:middle;font-weight:650;color:var(--text-primary,#f7f1ff);font-size:1.25rem;line-height:1.5rem;max-height:1.5rem;margin:0;cursor:pointer}
#${ROOT_ID} .kfp-display-name:hover,#${ROOT_ID} .kfp-username:hover{text-decoration:underline}
#${ROOT_ID} .kfp-user-tag{display:inline-block;margin-left:.25rem;padding:1px 5px;border-radius:4px;background:var(--kfp-accent,#7c3aed);color:#fff;font-size:10px;font-weight:900;line-height:1.25}
#${ROOT_ID} .kfp-username-row{display:flex;align-items:center;gap:.25rem;min-width:0;overflow:hidden;font-size:14px;color:var(--text-tertiary,#bfb0d8);line-height:18px}
#${ROOT_ID} .kfp-username{display:block;flex:0 1 auto;min-width:0;max-width:100%;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:none;background:transparent;padding:0;text-align:left;font:inherit;color:inherit;line-height:18px;max-height:18px}
#${ROOT_ID} .kfp-pronouns{margin-top:.25rem;font-size:13px;color:var(--text-tertiary,#bfb0d8)}
#${ROOT_ID} .kfp-custom-status{font-size:13px;line-height:1.35;color:var(--text-secondary,#d7cee8);overflow-wrap:anywhere;white-space:pre-wrap}
#${ROOT_ID} .kfp-section{display:flex;flex-direction:column;gap:.45rem;min-width:0}
#${ROOT_ID} .kfp-section-title{font-size:11px;font-weight:900;color:var(--text-primary-muted,#bfb0d8);text-transform:uppercase;letter-spacing:.04em;line-height:1.2}
#${ROOT_ID} .kfp-bio{font-size:13px;line-height:1.42;color:var(--text-secondary,#e4d8f6);white-space:pre-wrap;overflow-wrap:anywhere;max-height:120px;overflow:auto;scrollbar-width:thin}
#${ROOT_ID} .kfp-membership-dates{display:flex;flex-wrap:wrap;gap:.5rem .75rem;color:var(--text-secondary,#e4d8f6);font-size:13px;line-height:1.3}
#${ROOT_ID} .kfp-chip-row{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
#${ROOT_ID} .kfp-role-chip,#${ROOT_ID} .kfp-connection-chip,#${ROOT_ID} .kfp-note-chip{display:inline-flex;align-items:center;max-width:100%;gap:6px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.055);color:var(--text-primary,#f7f1ff);font-size:12px;font-weight:650;line-height:1.2;text-decoration:none;min-width:0}
#${ROOT_ID} .kfp-role-chip span:last-child,#${ROOT_ID} .kfp-connection-chip span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
#${ROOT_ID} .kfp-role-dot{width:9px;height:9px;flex:0 0 auto;border-radius:999px;background:var(--text-muted,#80848e)}
#${ROOT_ID} .kfp-section-box{padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.035)}
#${ROOT_ID} .kfp-voice-row{display:grid;grid-template-columns:26px 1fr;gap:8px;align-items:center;color:var(--text-secondary,#e4d8f6);font-size:13px}
#${ROOT_ID} .kfp-voice-mini{width:24px;height:24px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.08)}
#${ROOT_ID} .kfp-voice-mini img{width:24px;height:24px;object-fit:cover;border-radius:50%}
#${ROOT_ID} .kfp-voice-button{grid-column:1 / -1;width:100%;margin-top:6px;height:32px;border:0;border-radius:8px;background:#6a3cb7;color:#fff;font-weight:850;cursor:pointer}
#${ROOT_ID} .kfp-footer{flex:0 0 auto;padding:.5rem 1rem 0;display:grid;grid-template-columns:1fr auto;gap:8px}
#${ROOT_ID} .kfp-button{height:34px;border:0;border-radius:8px;background:#6a3cb7;color:#fff;font-size:13px;font-weight:850;cursor:pointer;padding:0 12px;white-space:nowrap}
#${ROOT_ID} .kfp-button-secondary{background:rgba(255,255,255,.075);color:var(--text-primary,#f7f1ff)}
#${ROOT_ID} .kfp-button:hover,#${ROOT_ID} .kfp-voice-button:hover{filter:brightness(1.08)}
#${ROOT_ID} .kfp-close,#${ROOT_ID} .kfp-debug{position:absolute;top:8px;z-index:5;height:26px;border:0;border-radius:7px;background:rgba(0,0,0,.46);color:#fff;cursor:pointer;font-weight:800}
#${ROOT_ID} .kfp-close{left:8px;width:26px;font-size:18px;line-height:1}
#${ROOT_ID} .kfp-debug{right:8px;padding:0 7px;font-size:11px}
#${ROOT_ID} .kfp-loading,#${ROOT_ID} .kfp-error{position:absolute;width:300px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:var(--background-primary,#181025);color:var(--text-primary,#f7f1ff);pointer-events:auto;box-shadow:0 18px 70px rgba(0,0,0,.62);font-size:13px;line-height:1.4}
#${ROOT_ID} .kfp-error{color:#ffd7d7;background:#271018;white-space:pre-wrap}
`;
    document.head.appendChild(style);
  }

  function root() {
    ensureStyle();
    var el = document.getElementById(ROOT_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = ROOT_ID;
      document.body.appendChild(el);
    }
    return el;
  }

  function closeCard() {
    var el = document.getElementById(ROOT_ID);
    if (el) {
      el.innerHTML = "";
      removeBadgeTooltip();
      el.removeAttribute("data-kfp-layer");
      el.removeAttribute("data-kfp-userprofile-delegated");
      try {
        delete el.__KALY_USERPROFILE_BUNDLE__;
      } catch (errorDeleteBundle) {
        el.__KALY_USERPROFILE_BUNDLE__ = null;
      }
    }
  }

  function anchorPosition(event, anchor) {
    var cardWidth = 300;
    var margin = 8;
    var x = window.innerWidth - cardWidth - 12;
    var y = 72;

    if (event && typeof event.clientX === "number" && typeof event.clientY === "number" && event.clientX > 0 && event.clientY > 0) {
      x = event.clientX - cardWidth - 26;
      y = event.clientY - 56;
    } else if (anchor && anchor.getBoundingClientRect) {
      var rect = anchor.getBoundingClientRect();
      x = rect.left - cardWidth - 26;
      y = rect.top - 18;
    }

    x = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, x));
    y = Math.max(margin, Math.min(window.innerHeight - 220, y));
    return { x: Math.round(x), y: Math.round(y) };
  }

  function clampFloatingElement(container, selector) {
    if (!container || !container.querySelector) return;

    var el = container.querySelector(selector);
    if (!el || !el.getBoundingClientRect) return;

    var margin = 8;

    function applyClamp() {
      var rect = el.getBoundingClientRect();
      var currentLeft = Number.parseFloat(el.style.left || "");
      var currentTop = Number.parseFloat(el.style.top || "");

      if (!Number.isFinite(currentLeft)) currentLeft = rect.left;
      if (!Number.isFinite(currentTop)) currentTop = rect.top;

      var maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      var maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      var nextLeft = Math.max(margin, Math.min(maxLeft, currentLeft));
      var nextTop = Math.max(margin, Math.min(maxTop, currentTop));

      el.style.left = Math.round(nextLeft) + "px";
      el.style.top = Math.round(nextTop) + "px";
    }

    applyClamp();
    requestAnimationFrame(applyClamp);
    setTimeout(applyClamp, 80);
  }

  function renderLoading(pos, label) {
    var container = root();
    container.innerHTML =
      '<div class="kfp-backdrop" data-kfp-close="1"></div>' +
      '<div class="kfp-loading" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">Chargement du profil : ' + escapeHtml(label) + '</div>';
    clampFloatingElement(container, ".kfp-loading");
    bindGlobalButtons(null);
  }

  function renderError(pos, message) {
    var container = root();
    container.innerHTML =
      '<div class="kfp-backdrop" data-kfp-close="1"></div>' +
      '<div class="kfp-error" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">' + escapeHtml(message) + '</div>';
    clampFloatingElement(container, ".kfp-error");
    bindGlobalButtons(null);
  }

  function avatarMarkup(bundle) {
    var fallback = '<div class="kfp-img-fallback"' + (bundle.avatarCandidates.length ? ' hidden' : '') + '>' + escapeHtml(text(bundle.displayName || "?").slice(0, 1).toUpperCase()) + '</div>';
    if (!bundle.avatarCandidates.length) return fallback;
    return '<img class="kfp-avatar-img" data-kfp-srcs="' + encodedSrcs(bundle.avatarCandidates) + '" alt="">' + fallback;
  }

  function bannerMarkup(bundle) {
    var gradient = 'radial-gradient(circle at 22% 18%, ' + escapeHtml(bundle.accentColor) + ' 0, transparent 34%),linear-gradient(135deg, ' + escapeHtml(bundle.accentColor) + ', #150a22 76%)';
    var img = bundle.bannerCandidates.length ? '<img class="kfp-banner-img" data-kfp-srcs="' + encodedSrcs(bundle.bannerCandidates) + '" alt="">' : '';
    return '<div class="kfp-banner" style="background:' + gradient + '">' + img + '</div>';
  }

  function kfpFlagTruthy(value) {
    if (value === true) return true;
    if (value === false || value === undefined || value === null) return false;

    if (typeof value === "number") return Number.isFinite(value) && value !== 0;
    if (typeof value === "bigint") return value !== 0n;

    var raw = text(value).trim().toLowerCase();
    if (!raw || raw === "0" || raw === "false" || raw === "no" || raw === "non" || raw === "null" || raw === "undefined") return false;

    return true;
  }

  function kfpNumericFlagHasStaff(value) {
    if (value === undefined || value === null || value === "") return false;

    /*
      Fluxer peut exposer les flags en int, string ou BigInt-like.
      STAFF est traité comme bit 0 quand un bitfield est réellement renvoyé.
      Si le serveur masque les flags publics, cette détection ne peut rien inventer.
    */
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return false;
      return (Math.floor(value) & 1) === 1;
    }

    if (typeof value === "bigint") return (value & 1n) === 1n;

    var raw = text(value).trim();
    if (!/^\d+$/.test(raw)) return false;

    try {
      return (BigInt(raw) & 1n) === 1n;
    } catch (errorBigInt) {
      var n = Number(raw);
      return Number.isFinite(n) && (Math.floor(n) & 1) === 1;
    }
  }

  function kfpPathCanContainOfficialBadge(path) {
    var normalized = normalizeText(path || "");

    return (
      normalized.indexOf("flag") !== -1 ||
      normalized.indexOf("badge") !== -1 ||
      normalized.indexOf("profileeffect") !== -1 ||
      normalized.indexOf("userprofile") !== -1 ||
      normalized.indexOf("publicprofile") !== -1
    );
  }

  function kfpStringLooksLikeStaffBadge(value, path) {
    var raw = text(value).trim();
    if (!raw) return false;

    var lower = raw.toLowerCase();
    var normalized = normalizeText(raw);
    var pathOk = kfpPathCanContainOfficialBadge(path);

    if (lower.indexOf("/badges/staff.svg") !== -1) return true;
    if (lower.indexOf("badges/staff.svg") !== -1) return true;
    if (lower.indexOf("staff.svg") !== -1 && pathOk) return true;

    if (
      normalized === "staff" ||
      normalized === "userflagsstaff" ||
      normalized === "equipefluxer" ||
      normalized === "equipfluxer" ||
      normalized === "fluxerstaff" ||
      normalized === "stafffluxer" ||
      normalized === "fluxerteam"
    ) {
      return pathOk;
    }

    if (pathOk && normalized.indexOf("equipefluxer") !== -1) return true;
    if (pathOk && normalized.indexOf("equipfluxer") !== -1) return true;
    if (pathOk && normalized.indexOf("fluxerstaff") !== -1) return true;

    return false;
  }

  function kfpFlagValueHasStaff(value, depth, path, seen) {
    depth = depth || 0;
    path = path || "";

    if (depth > 8 || value === undefined || value === null || value === "") return false;

    if (typeof value === "number" || typeof value === "bigint") return kfpNumericFlagHasStaff(value);

    if (typeof value === "string") {
      if (kfpNumericFlagHasStaff(value)) return true;
      return kfpStringLooksLikeStaffBadge(value, path);
    }

    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        if (kfpFlagValueHasStaff(value[i], depth + 1, path + "[" + i + "]", seen)) return true;
      }
      return false;
    }

    if (value && typeof value === "object") {
      if (!seen) seen = new WeakSet();
      if (seen.has(value)) return false;
      seen.add(value);

      var keys = Object.keys(value);

      for (var j = 0; j < keys.length; j += 1) {
        var key = keys[j];
        var nextPath = path ? path + "." + key : key;
        var normalizedKey = normalizeText(key);
        var item = value[key];

        if ((normalizedKey === "staff" || normalizedKey === "userflagsstaff") && kfpFlagTruthy(item)) return true;

        if (
          normalizedKey === "name" ||
          normalizedKey === "flag" ||
          normalizedKey === "type" ||
          normalizedKey === "label" ||
          normalizedKey === "id" ||
          normalizedKey === "value" ||
          normalizedKey === "url" ||
          normalizedKey === "src" ||
          normalizedKey === "icon" ||
          normalizedKey === "asset" ||
          normalizedKey === "image" ||
          normalizedKey === "alt" ||
          normalizedKey === "ariaLabel" ||
          kfpPathCanContainOfficialBadge(nextPath)
        ) {
          if (kfpFlagValueHasStaff(item, depth + 1, nextPath, seen)) return true;
        }
      }
    }

    return false;
  }

  function kfpStaffFlagCandidates(bundle) {
    bundle = bundle || {};

    var parts = bundle.parts || {};
    var root = bundle.rawProfile || parts.root || {};
    var user = parts.user || {};
    var userProfile = parts.userProfile || {};
    var localMember = bundle.localMember || {};
    var localRaw = localMember.raw || {};
    var localUser = localMember.userRaw || localMember.user || {};
    var userResponseJson = bundle.userResponse && bundle.userResponse.json ? bundle.userResponse.json : {};
    var probe = bundle.staffProbe || {};

    return [
      bundle.staffFlagProbeHit,
      bundle.flags,
      bundle.userFlags,
      bundle.publicFlags,
      bundle.userFlagCandidates,
      bundle.badges,
      bundle.userBadges,
      bundle.profileBadges,
      bundle.badgeCandidates,

      probe.hasStaff,
      probe.jsons,

      root.flags,
      root.public_flags,
      root.publicFlags,
      root.user_flags,
      root.userFlags,
      root.user_flags_names,
      root.userFlagsNames,
      root.badges,
      root.user_badges,
      root.userBadges,
      root.profile_badges,
      root.profileBadges,

      root.user && root.user.flags,
      root.user && root.user.public_flags,
      root.user && root.user.publicFlags,
      root.user && root.user.user_flags,
      root.user && root.user.userFlags,
      root.user && root.user.user_flags_names,
      root.user && root.user.userFlagsNames,
      root.user && root.user.badges,
      root.user && root.user.user_badges,
      root.user && root.user.userBadges,

      user.flags,
      user.public_flags,
      user.publicFlags,
      user.user_flags,
      user.userFlags,
      user.user_flags_names,
      user.userFlagsNames,
      user.badges,
      user.user_badges,
      user.userBadges,
      user.profile_badges,
      user.profileBadges,

      userProfile.flags,
      userProfile.public_flags,
      userProfile.publicFlags,
      userProfile.user_flags,
      userProfile.userFlags,
      userProfile.user_flags_names,
      userProfile.userFlagsNames,
      userProfile.badges,
      userProfile.user_badges,
      userProfile.userBadges,
      userProfile.profile_badges,
      userProfile.profileBadges,

      userResponseJson.flags,
      userResponseJson.public_flags,
      userResponseJson.publicFlags,
      userResponseJson.user_flags,
      userResponseJson.userFlags,
      userResponseJson.user_flags_names,
      userResponseJson.userFlagsNames,
      userResponseJson.badges,
      userResponseJson.user_badges,
      userResponseJson.userBadges,
      userResponseJson.profile_badges,
      userResponseJson.profileBadges,
      userResponseJson.user && userResponseJson.user.flags,
      userResponseJson.user && userResponseJson.user.public_flags,
      userResponseJson.user && userResponseJson.user.publicFlags,
      userResponseJson.user && userResponseJson.user.user_flags,
      userResponseJson.user && userResponseJson.user.userFlags,
      userResponseJson.user && userResponseJson.user.badges,

      localMember.flags,
      localMember.public_flags,
      localMember.publicFlags,
      localMember.user_flags,
      localMember.userFlags,
      localMember.badges,
      localMember.user_badges,
      localMember.userBadges,

      localRaw.flags,
      localRaw.public_flags,
      localRaw.publicFlags,
      localRaw.user_flags,
      localRaw.userFlags,
      localRaw.badges,
      localRaw.user_badges,
      localRaw.userBadges,
      localRaw.user && localRaw.user.flags,
      localRaw.user && localRaw.user.public_flags,
      localRaw.user && localRaw.user.publicFlags,
      localRaw.user && localRaw.user.user_flags,
      localRaw.user && localRaw.user.userFlags,
      localRaw.user && localRaw.user.badges,

      localUser.flags,
      localUser.public_flags,
      localUser.publicFlags,
      localUser.user_flags,
      localUser.userFlags,
      localUser.badges,
      localUser.user_badges,
      localUser.userBadges
    ];
  }

  function kfpHasStaffUserFlag(bundle) {
    if (!bundle) return false;
    if (hasStaffOverride(bundle.id)) return true;
    if (bundle.staffFlagProbeHit === true) return true;

    var candidates = kfpStaffFlagCandidates(bundle);

    for (var i = 0; i < candidates.length; i += 1) {
      if (kfpFlagValueHasStaff(candidates[i], 0, "candidate[" + i + "]")) return true;
    }

    /* Scan contrôlé : on ne valide que les chemins flag/badge, pas un rôle appelé Staff. */
    var containers = [
      bundle.rawProfile,
      bundle.userResponse && bundle.userResponse.json,
      bundle.parts && bundle.parts.user,
      bundle.parts && bundle.parts.userProfile,
      bundle.localMember && bundle.localMember.userRaw,
      bundle.localMember && bundle.localMember.raw && bundle.localMember.raw.user
    ];

    for (var j = 0; j < containers.length; j += 1) {
      if (kfpFlagValueHasStaff(containers[j], 0, "deep" + j)) return true;
    }

    return false;
  }

  async function fetchStaffFlagProbe(userId, guildId) {
    userId = text(userId);
    guildId = text(guildId || getGuildId());
    if (!userId) return { hasStaff: false, source: "missing-user-id", jsons: [] };

    if (hasStaffOverride(userId)) {
      return { hasStaff: true, source: "manual-override", jsons: [] };
    }

    var cache = loadStaffFlagCache();
    var cached = cache[userId];
    var now = Date.now();

    if (cached && now - Number(cached.updatedAt || 0) < 5 * 60 * 1000) {
      return { hasStaff: Boolean(cached.hasStaff), source: "cache", jsons: cached.jsons || [], cached: true };
    }

    var paths = unique([
      "/users/" + encodeURIComponent(userId) + "/profile?" + new URLSearchParams({ guild_id: guildId, with_mutual_friends: "true", with_mutual_guilds: "true", with_user_flags: "true", include_flags: "true", include_badges: "true" }).toString(),
      "/users/" + encodeURIComponent(userId) + "?" + new URLSearchParams({ with_user_flags: "true", include_flags: "true", include_badges: "true" }).toString(),
      "/admin/users/" + encodeURIComponent(userId),
      "/admin/users/" + encodeURIComponent(userId) + "/flags"
    ]);

    var jsons = [];
    var requests = [];

    for (var i = 0; i < paths.length; i += 1) {
      var response = await requestJson("GET", paths[i]);
      requests.push({ path: paths[i], ok: response && response.ok, status: response ? response.status : 0 });

      if (response && response.json) {
        jsons.push(response.json);
        if (kfpFlagValueHasStaff(response.json, 0, "probe." + paths[i])) {
          cache[userId] = { hasStaff: true, updatedAt: now, jsons: jsons.slice(0, 2), requests: requests };
          saveStaffFlagCache(cache);
          return { hasStaff: true, source: paths[i], jsons: jsons, requests: requests };
        }
      }
    }

    cache[userId] = { hasStaff: false, updatedAt: now, jsons: jsons.slice(0, 2), requests: requests };
    saveStaffFlagCache(cache);
    return { hasStaff: false, source: "probe-miss", jsons: jsons, requests: requests };
  }

  async function enrichStaffFlags(bundle) {
    if (!bundle || !bundle.id) return bundle;

    if (kfpHasStaffUserFlag(bundle)) {
      bundle.staffFlagProbeHit = true;
      bundle.staffProbe = bundle.staffProbe || { hasStaff: true, source: "bundle" };
      return bundle;
    }

    try {
      var probe = await fetchStaffFlagProbe(bundle.id, getGuildId());
      bundle.staffProbe = probe;
      bundle.staffFlagProbeHit = Boolean(probe && probe.hasStaff);
    } catch (error) {
      bundle.staffProbe = { hasStaff: false, source: "probe-error", error: text(error && error.message ? error.message : error) };
      bundle.staffFlagProbeHit = false;
    }

    return bundle;
  }

  function kfpOfficialFluxerTeamBadge(bundle) {
    if (!kfpHasStaffUserFlag(bundle)) return "";

    var label = "STAFF";
    var href = ORIGIN + "/marketing/careers";

    return '<a class="UserProfileBadges.module__link___ZjBjOw kfp-official-badge-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer" aria-haspopup="true" aria-expanded="false" aria-label="' + escapeHtml(label) + '" data-kfp-tooltip="' + escapeHtml(label) + '">' +
      '<img class="UserProfileBadges.module__badgeDesktop___ZjBjOw kfp-official-badge-img" alt="' + escapeHtml(label) + '" src="https://fluxerstatic.com/badges/staff.svg">' +
      '</a>';
  }

  function badgeMarkup(bundle) {
    return kfpOfficialFluxerTeamBadge(bundle);
  }

  function userInfoMarkup(bundle) {
    var pronouns = bundle.pronouns ? '<div class="kfp-pronouns">' + escapeHtml(bundle.pronouns) + '</div>' : '';
    var userTag = bundle.bot || bundle.system ? '<span class="kfp-user-tag">' + escapeHtml(bundle.system ? "SYS" : "BOT") + '</span>' : '';

    return '<div class="kfp-user-info">' +
      '<div class="kfp-name-row"><button class="kfp-display-name" type="button" data-kfp-copy="displayName" title="Copier le nom affiché">' + escapeHtml(bundle.displayName) + '</button>' + userTag + '</div>' +
      '<div class="kfp-username-row"><button class="kfp-username" type="button" data-kfp-copy="tag" title="Copier le tag">' + escapeHtml(bundle.tag || bundle.username || bundle.id) + '</button></div>' +
      pronouns +
      '</div>';
  }

  function customStatusSection(bundle) {
    if (!bundle.customStatus) return "";
    return '<div class="kfp-custom-status">' + escapeHtml(bundle.customStatus) + '</div>';
  }

  function bioSection(bundle) {
    if (!bundle.bio) return "";
    return '<div class="kfp-section"><div class="kfp-bio">' + escapeHtml(bundle.bio) + '</div></div>';
  }

  function membershipSection(bundle) {
    var created = formatDate(bundle.createdAt);
    var joined = formatDate(bundle.joinedAt);
    if (!created && !joined) return "";

    return '<div class="kfp-section">' +
      '<div class="kfp-section-title">Membre depuis</div>' +
      '<div class="kfp-membership-dates">' +
      (created ? '<span title="Fluxer">✦ ' + escapeHtml(created) + '</span>' : '') +
      (joined ? '<span title="Serveur">◆ ' + escapeHtml(joined) + '</span>' : '') +
      '</div>' +
      '</div>';
  }

  function roleMarkup(bundle) {
    if (!bundle.roles || !bundle.roles.length) {
      return '<span class="kfp-note-chip">Aucun rôle détecté</span>';
    }

    return bundle.roles.map(function (role) {
      var color = normalizeColor(firstValue(role.color, role.colour, role.color_value, role.colorValue, ""), "");
      var name = text(firstValue(role.name, role.id, "Rôle"));
      return '<span class="kfp-role-chip" title="' + escapeHtml(name) + '">' +
        '<span class="kfp-role-dot" style="background:' + escapeHtml(color || "var(--text-muted,#80848e)") + '"></span>' +
        '<span>' + escapeHtml(name) + '</span>' +
        '</span>';
    }).join("");
  }

  function rolesSection(bundle) {
    return '<div class="kfp-section">' +
      '<div class="kfp-section-title">Rôles</div>' +
      '<div class="kfp-chip-row">' + roleMarkup(bundle) + '</div>' +
      '</div>';
  }

  function voiceSection(bundle) {
    if (!bundle.voice || (!bundle.voice.channelName && !bundle.voice.channelId)) return "";
    var channelName = text(firstValue(bundle.voice.channelName, bundle.voice.channelId, "Salon vocal"));
    var channelId = text(bundle.voice.channelId || "");

    return '<div class="kfp-section kfp-section-box" data-kfp-voice-channel="' + escapeHtml(channelId) + '">' +
      '<div class="kfp-section-title">En voix</div>' +
      '<div class="kfp-voice-row">' +
      '<div class="kfp-voice-mini">' + (bundle.avatarCandidates.length ? '<img data-kfp-srcs="' + encodedSrcs(bundle.avatarCandidates) + '" alt="">' : '') + '</div>' +
      '<div>🔊 ' + escapeHtml(channelName) + '</div>' +
      '<button class="kfp-voice-button" type="button" data-kfp-open-voice="' + escapeHtml(channelId) + '">Ouvrir la voix</button>' +
      '</div>' +
      '</div>';
  }

  function connectionsSection(bundle) {
    if (!bundle.connectedAccounts.length) return "";
    return '<div class="kfp-section">' +
      '<div class="kfp-section-title">Connexions</div>' +
      '<div class="kfp-chip-row">' + bundle.connectedAccounts.map(function (connection) {
        var label = connection.type && connection.type !== "domain" ? connection.type + " · " + connection.name : connection.name;
        return '<span class="kfp-connection-chip" title="' + escapeHtml(label) + '"><span>' + escapeHtml(connection.verified ? "✓" : "◇") + '</span><span>' + escapeHtml(label) + '</span></span>';
      }).join("") + '</div>' +
      '</div>';
  }

  function mutualsSection(bundle) {
    var pieces = [];
    if (bundle.mutualFriends.length) pieces.push('<span class="kfp-note-chip">' + escapeHtml(bundle.mutualFriends.length + " ami(s) commun(s)") + '</span>');
    if (bundle.mutualGuilds.length) pieces.push('<span class="kfp-note-chip">' + escapeHtml(bundle.mutualGuilds.length + " serveur(s) commun(s)") + '</span>');
    if (!pieces.length) return "";

    return '<div class="kfp-section">' +
      '<div class="kfp-section-title">Commun</div>' +
      '<div class="kfp-chip-row">' + pieces.join("") + '</div>' +
      '</div>';
  }

  function warningSection(bundle) {
    if (bundle.response && bundle.response.ok) return "";
    var status = bundle.response ? bundle.response.status : "inconnu";
    return '<div class="kfp-section kfp-section-box"><div class="kfp-note-chip">Profil API partiel · HTTP ' + escapeHtml(status) + '</div></div>';
  }

  function cardMarkup(bundle, pos) {
    var footerLabel = bundle.isSelf ? "Modifier" : "Message";

    return '' +
      '<div class="kfp-backdrop" data-kfp-close="1"></div>' +
      '<div class="kfp-popout" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">' +
      '<div class="kfp-card" style="--kfp-accent:' + escapeHtml(bundle.accentColor) + ';border-color:' + escapeHtml(bundle.accentColor) + '">' +
      '<button class="kfp-close" type="button" data-kfp-close="1" aria-label="Fermer">×</button>' +
      '<button class="kfp-debug" type="button" data-kfp-debug="1">JSON</button>' +
      '<header class="kfp-header">' +
      '<div class="kfp-banner-wrapper">' +
      '<svg class="kfp-banner-mask" viewBox="0 0 300 105" preserveAspectRatio="none">' +
      '<mask id="kfp-mask-' + escapeHtml(bundle.id) + '"><rect fill="white" x="0" y="0" width="300" height="105"></rect><circle fill="black" cx="54" cy="99" r="44"></circle></mask>' +
      '<foreignObject x="0" y="0" width="300" height="105" overflow="visible" mask="url(#kfp-mask-' + escapeHtml(bundle.id) + ')">' + bannerMarkup(bundle) + '</foreignObject>' +
      '</svg>' +
      '</div>' +
      '<button type="button" class="kfp-avatar-button" data-kfp-avatar="1" aria-label="' + escapeHtml(bundle.displayName + ', ' + statusLabel(bundle.status)) + '">' +
      '<div class="kfp-avatar">' + avatarMarkup(bundle) + '<div class="kfp-status-container" role="img" aria-label="' + escapeHtml(statusLabel(bundle.status)) + '"><span class="kfp-status-dot" style="background:' + escapeHtml(statusColor(bundle.status)) + '"></span></div></div>' +
      '</button>' +
      '</header>' +
      '<div class="kfp-badges UserProfileBadges.module__containerPopout___ZjBjOw">' + badgeMarkup(bundle) + '</div>' +
      '<div class="kfp-content">' +
      userInfoMarkup(bundle) +
      customStatusSection(bundle) +
      voiceSection(bundle) +
      bioSection(bundle) +
      membershipSection(bundle) +
      rolesSection(bundle) +
      connectionsSection(bundle) +
      mutualsSection(bundle) +
      warningSection(bundle) +
      '</div>' +
      '<footer class="kfp-footer">' +
      '<button class="kfp-button" type="button" data-kfp-main-action="1">' + escapeHtml(footerLabel) + '</button>' +
      '<button class="kfp-button kfp-button-secondary" type="button" data-kfp-copy="id">ID</button>' +
      '</footer>' +
      '</div>' +
      '</div>';
  }

  function copyToClipboard(value, button, doneLabel) {
    value = text(value);
    if (!value) return;

    function ok() {
      if (!button) return;
      var old = button.textContent;
      button.textContent = doneLabel || "Copié";
      setTimeout(function () {
        button.textContent = old;
      }, 1200);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(ok).catch(function () {
        console.log("[KalyProfileCard] À copier :", value);
      });
      return;
    }

    console.log("[KalyProfileCard] À copier :", value);
    ok();
  }


  function removeBadgeTooltip() {
    var current = document.querySelector("#" + ROOT_ID + " .kfp-floating-tooltip");
    if (current) current.remove();
  }

  function positionBadgeTooltip(anchor, tooltip) {
    if (!anchor || !tooltip || !anchor.getBoundingClientRect) return;

    var anchorRect = anchor.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var margin = 8;
    var placement = "top";
    var left = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);
    var top = anchorRect.top - tooltipRect.height - 9;

    if (top < margin) {
      placement = "bottom";
      top = anchorRect.bottom + 9;
    }

    left = Math.max(margin, Math.min(window.innerWidth - tooltipRect.width - margin, left));
    top = Math.max(margin, Math.min(window.innerHeight - tooltipRect.height - margin, top));

    tooltip.setAttribute("data-placement", placement);
    tooltip.style.left = Math.round(left) + "px";
    tooltip.style.top = Math.round(top) + "px";
  }

  function showBadgeTooltip(anchor) {
    if (!anchor) return;

    var label = text(anchor.getAttribute("data-kfp-tooltip") || anchor.getAttribute("aria-label") || "").trim();
    if (!label) return;

    removeBadgeTooltip();

    var tooltip = document.createElement("div");
    tooltip.className = "kfp-floating-tooltip";
    tooltip.textContent = label;

    root().appendChild(tooltip);
    positionBadgeTooltip(anchor, tooltip);

    requestAnimationFrame(function () {
      positionBadgeTooltip(anchor, tooltip);
      tooltip.setAttribute("data-show", "1");
    });
  }

  function bindBadgeTooltips(scope) {
    Array.prototype.slice.call((scope || root()).querySelectorAll("[data-kfp-tooltip]")).forEach(function (badge) {
      if (badge.getAttribute("data-kfp-tooltip-bound") === "1") return;
      badge.setAttribute("data-kfp-tooltip-bound", "1");

      badge.addEventListener("pointerenter", function () {
        showBadgeTooltip(badge);
      }, { signal: controller.signal });

      badge.addEventListener("pointerleave", function () {
        removeBadgeTooltip();
      }, { signal: controller.signal });

      badge.addEventListener("mouseenter", function () {
        showBadgeTooltip(badge);
      }, { signal: controller.signal });

      badge.addEventListener("mouseleave", function () {
        removeBadgeTooltip();
      }, { signal: controller.signal });

      badge.addEventListener("focus", function () {
        showBadgeTooltip(badge);
      }, { signal: controller.signal });

      badge.addEventListener("blur", function () {
        removeBadgeTooltip();
      }, { signal: controller.signal });
    });
  }

  function bindGlobalButtons(bundle) {
    var container = root();
    bindBadgeTooltips(container);

    Array.prototype.slice.call(container.querySelectorAll("[data-kfp-close]")).forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeCard();
      }, { signal: controller.signal });
    });

    var debugButton = container.querySelector("[data-kfp-debug]");
    if (debugButton && bundle) {
      debugButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("[KalyProfileCard] bundle :", bundle);
      }, { signal: controller.signal });
    }

    Array.prototype.slice.call(container.querySelectorAll("[data-kfp-copy]")).forEach(function (button) {
      button.addEventListener("click", function (event) {
        if (!bundle) return;
        event.preventDefault();
        event.stopPropagation();
        var key = button.getAttribute("data-kfp-copy") || "";
        if (key === "id") copyToClipboard(bundle.id, button, "Copié");
        if (key === "tag") copyToClipboard(bundle.tag || bundle.username || bundle.id, button, "Copié");
        if (key === "displayName") copyToClipboard(bundle.displayName, button, "Copié");
      }, { signal: controller.signal });
    });


    var avatarButton = container.querySelector("[data-kfp-avatar]");
    if (avatarButton && bundle) {
      avatarButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        openOfficialUserProfileModal(bundle.id).then(function (ok) {
          if (ok) {
            closeCard();
            return;
          }

          console.warn("[KalyProfileCard] UserProfileModal natif introuvable, ouverture du modal-backdrop compatible self-host.");
          openKalyUserProfileModal(bundle.id);
        });
      }, { signal: controller.signal });
    }

    var voiceButton = container.querySelector("[data-kfp-open-voice]");
    if (voiceButton && bundle) {
      voiceButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var channelId = voiceButton.getAttribute("data-kfp-open-voice") || "";
        if (channelId) {
          closeCard();
          window.KALY_FLUXER_SPA_NAVIGATE("/channels/" + encodeURIComponent(getGuildId()) + "/" + encodeURIComponent(channelId));
        } else console.warn("[KalyProfileCard] ID salon vocal introuvable :", bundle.voice);
      }, { signal: controller.signal });
    }

    var mainButton = container.querySelector("[data-kfp-main-action]");
    if (mainButton && bundle) {
      mainButton.addEventListener("click", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (bundle.isSelf) {
          var settingsButton = document.querySelector('button[aria-label*="Paramètres"],button[aria-label*="paramètres"],button[aria-label*="Settings"],button[aria-label*="settings"],button[aria-label*="User Settings"]');
          if (settingsButton) {
            settingsButton.click();
            closeCard();
            return;
          }
          console.warn("[KalyProfileCard] bouton paramètres introuvable.");
          return;
        }

        mainButton.textContent = "Ouverture…";
        var ok = await openDm(bundle.id);
        if (!ok) {
          mainButton.textContent = "Erreur DM";
          setTimeout(function () {
            mainButton.textContent = "Message";
          }, 1200);
        }
      }, { signal: controller.signal });
    }

    activateAssetFallbacks(container);
  }

  var PROFILE_MODAL_STYLE_ID = STYLE_ID + "-userprofile-modal-backdrop-clean";

  function ensureUserProfileModalStyle() {
    if (document.getElementById(PROFILE_MODAL_STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = PROFILE_MODAL_STYLE_ID;
    style.textContent = `
#${ROOT_ID} .kfp-userprofile-backdrop.modal-backdrop{position:fixed!important;inset:0!important;z-index:2147483600!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(0,0,0,.86)!important;pointer-events:auto!important;opacity:1!important;backdrop-filter:none!important;cursor:default!important}
#${ROOT_ID} .kfp-userprofile-layer{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:24px!important;pointer-events:auto!important}
#${ROOT_ID} .kfp-userprofile-modal{position:relative!important;width:min(600px,calc(100vw - 32px));max-height:calc(100svh - 48px);display:flex!important;flex-direction:column;overflow:hidden;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#15111f!important;background-color:#15111f!important;color:var(--text-primary,#f7f1ff);box-shadow:0 0 0 1px hsla(223,7%,20%,.08),0 8px 24px -4px rgba(0,0,0,.25),0 20px 48px -8px rgba(0,0,0,.2);pointer-events:auto!important;animation:kfpUserProfileIn .16s ease-out;isolation:isolate;opacity:1!important}
@keyframes kfpUserProfileIn{from{opacity:0;transform:scale(.965)}to{opacity:1;transform:scale(1)}}
#${ROOT_ID} .kfp-upm-header{position:relative;height:248px;flex:0 0 auto;background:#110d1a!important;background-color:#110d1a!important;overflow:hidden;opacity:1!important}
#${ROOT_ID} .kfp-upm-banner{position:absolute;inset:0 0 auto 0;height:210px;background:radial-gradient(circle at 24% 18%,color-mix(in srgb,var(--kfp-accent,#7c3aed) 78%,white 8%) 0,transparent 34%),linear-gradient(135deg,var(--kfp-accent,#7c3aed),#120a1d 82%);background-size:cover;background-position:center;overflow:hidden}
#${ROOT_ID} .kfp-upm-banner::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.04),rgba(0,0,0,.18));pointer-events:none!important}
#${ROOT_ID} .kfp-upm-banner-img{width:100%;height:210px;display:block;object-fit:cover}
#${ROOT_ID} .kfp-upm-banner-img[data-kfp-failed="1"]{display:none}
#${ROOT_ID} .kfp-upm-avatar-wrap{position:absolute;left:28px;bottom:15px;width:126px;height:126px;border-radius:999px;border:6px solid var(--background-secondary,#15111f);background:var(--background-secondary,#15111f);overflow:visible;box-sizing:border-box}
#${ROOT_ID} .kfp-upm-avatar{width:114px;height:114px;border-radius:999px;overflow:hidden;background:var(--background-primary,#181025)}
#${ROOT_ID} .kfp-upm-avatar-img{width:114px;height:114px;display:block;object-fit:cover;border-radius:999px}
#${ROOT_ID} .kfp-upm-avatar-img[data-kfp-failed="1"]{display:none}
#${ROOT_ID} .kfp-upm-fallback{width:114px;height:114px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(135deg,var(--kfp-accent,#7c3aed),#28163c);color:#fff;font-size:42px;font-weight:900}
#${ROOT_ID} .kfp-upm-status{position:absolute;right:6px;bottom:6px;width:24px;height:24px;border-radius:999px;border:5px solid var(--background-secondary,#15111f);background:var(--text-muted,#80848e);box-sizing:border-box}
#${ROOT_ID} .kfp-upm-actions{position:absolute!important;right:18px!important;bottom:18px!important;display:flex!important;align-items:center;gap:8px;z-index:30!important;pointer-events:auto!important}
#${ROOT_ID} .kfp-upm-close,#${ROOT_ID} .kfp-upm-debug{position:absolute!important;top:14px!important;z-index:40!important;height:32px;border:0;border-radius:999px;background:rgba(18,13,26,.88)!important;color:#fff;cursor:pointer!important;font-weight:850;backdrop-filter:blur(10px);pointer-events:auto!important;display:inline-flex!important;align-items:center;justify-content:center;line-height:1!important}
#${ROOT_ID} .kfp-upm-close{right:14px!important;left:auto!important;width:32px!important;font-size:20px;line-height:1}
#${ROOT_ID} .kfp-upm-debug{right:54px!important;left:auto!important;padding:0 10px!important;font-size:11px;letter-spacing:.02em;min-width:46px!important}
#${ROOT_ID} .kfp-upm-body{min-height:0;overflow:auto;padding:22px 28px 28px;scrollbar-width:thin;background:#15111f!important;background-color:#15111f!important;opacity:1!important}
#${ROOT_ID} .kfp-upm-profile-content{display:flex;flex-direction:column;gap:16px;min-width:0}
#${ROOT_ID} .kfp-upm-name-row{display:flex;align-items:center;gap:8px;min-width:0}
#${ROOT_ID} .kfp-upm-name{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:28px;font-weight:850;line-height:1.12;color:var(--text-primary,#f7f1ff)}
#${ROOT_ID} .kfp-upm-bot{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:var(--kfp-accent,#7c3aed);color:#fff;font-size:10px;font-weight:900}
#${ROOT_ID} .kfp-upm-tag{margin-top:5px;font-size:14px;line-height:18px;color:var(--text-secondary,#d7cee8);overflow-wrap:anywhere}
#${ROOT_ID} .kfp-upm-pronouns{margin-top:4px;font-size:13px;color:var(--text-tertiary,#bfb0d8)}
#${ROOT_ID} .kfp-upm-tabs{display:flex;gap:8px;margin-top:2px}
#${ROOT_ID} .kfp-upm-tab{border:0;border-radius:999px;background:#261b35!important;color:var(--text-secondary,#d7cee8);height:32px;padding:0 14px;font-weight:850;cursor:pointer!important;opacity:1!important;pointer-events:auto!important;position:relative;z-index:2}
#${ROOT_ID} .kfp-upm-tab[data-active="1"]{background:#6a3cb7!important;color:#fff}
#${ROOT_ID} .kfp-upm-tab-panel{display:flex;flex-direction:column;gap:12px;min-width:0}
#${ROOT_ID} .kfp-upm-tab-panel[hidden]{display:none!important}
#${ROOT_ID} .kfp-upm-section{display:flex;flex-direction:column;gap:8px;min-width:0}
#${ROOT_ID} .kfp-upm-box{padding:14px 16px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#21162f!important;background-color:#21162f!important;opacity:1!important}
#${ROOT_ID} .kfp-upm-title{font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.04em;color:var(--text-primary-muted,#bfb0d8)}
#${ROOT_ID} .kfp-upm-text{font-size:14px;line-height:1.45;color:var(--text-secondary,#e4d8f6);white-space:pre-wrap;overflow-wrap:anywhere}
#${ROOT_ID} .kfp-upm-empty{font-size:13px;line-height:1.35;color:var(--text-tertiary,#bfb0d8)}
#${ROOT_ID} .kfp-upm-list{display:flex;flex-direction:column;gap:8px}
#${ROOT_ID} .kfp-upm-row{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px;align-items:center;min-width:0;padding:8px;border-radius:9px;background:#261b35!important;background-color:#261b35!important;opacity:1!important}
#${ROOT_ID} .kfp-upm-row-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);color:#fff;font-weight:900;overflow:hidden}
#${ROOT_ID} .kfp-upm-row-avatar img{width:40px;height:40px;object-fit:cover;border-radius:50%}
#${ROOT_ID} .kfp-upm-row-title{font-size:13px;font-weight:800;color:var(--text-primary,#f7f1ff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ROOT_ID} .kfp-upm-row-sub{font-size:12px;color:var(--text-tertiary,#bfb0d8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ROOT_ID} .kfp-upm-chip-row{display:flex;flex-wrap:wrap;gap:7px}
#${ROOT_ID} .kfp-upm-chip{display:inline-flex;align-items:center;max-width:100%;gap:6px;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.055);color:var(--text-primary,#f7f1ff);font-size:12px;font-weight:700;line-height:1.2;min-width:0;text-decoration:none}
#${ROOT_ID} .kfp-upm-chip span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ROOT_ID} .kfp-upm-dot{width:9px;height:9px;border-radius:999px;background:var(--text-muted,#80848e);flex:0 0 auto}
#${ROOT_ID} .kfp-upm-button{height:36px;border:0;border-radius:999px;background:#6a3cb7;color:#fff;font-size:13px;font-weight:850;cursor:pointer!important;padding:0 14px;white-space:nowrap;pointer-events:auto!important;position:relative;z-index:31!important}
#${ROOT_ID} .kfp-upm-button.secondary{background:rgba(18,13,26,.72);color:var(--text-primary,#f7f1ff);backdrop-filter:blur(10px)}
#${ROOT_ID} .kfp-upm-button:hover{filter:brightness(1.08)}
#${ROOT_ID} .kfp-userprofile-modal button,#${ROOT_ID} .kfp-userprofile-modal a{pointer-events:auto!important;position:relative;z-index:10}
#${ROOT_ID} .kfp-userprofile-modal [data-kfp-close],
#${ROOT_ID} .kfp-userprofile-modal [data-kfp-debug],
#${ROOT_ID} .kfp-userprofile-modal [data-kfp-copy],
#${ROOT_ID} .kfp-userprofile-modal [data-kfp-tab],
#${ROOT_ID} .kfp-userprofile-modal [data-kfp-main-action],
#${ROOT_ID} .kfp-userprofile-modal [data-kfp-open-voice]{pointer-events:auto!important;cursor:pointer!important}

/* Kaly opaque grand profile patch: aucune variable Fluxer transparente ne doit traverser le modal. */
#${ROOT_ID} .kfp-userprofile-backdrop.modal-backdrop,#${ROOT_ID} .kfp-userprofile-backdrop.modal-backdrop *{opacity:1}
#${ROOT_ID} .kfp-userprofile-modal,#${ROOT_ID} .kfp-upm-header,#${ROOT_ID} .kfp-upm-body,#${ROOT_ID} .kfp-upm-profile-content{background-color:#15111f!important}
#${ROOT_ID} .kfp-upm-header{background-color:#110d1a!important}
#${ROOT_ID} .kfp-upm-box{background-color:#21162f!important}
#${ROOT_ID} .kfp-upm-row,#${ROOT_ID} .kfp-upm-chip,#${ROOT_ID} .kfp-upm-row-avatar,#${ROOT_ID} .kfp-upm-tab{background-color:#261b35!important}
#${ROOT_ID} .kfp-upm-tab[data-active="1"],#${ROOT_ID} .kfp-upm-button{background-color:#6a3cb7!important}
@media(max-width:640px){#${ROOT_ID} .kfp-userprofile-layer{padding:0}#${ROOT_ID} .kfp-userprofile-modal{width:100vw;height:100svh;max-height:100svh;border-radius:0;border:0}#${ROOT_ID} .kfp-upm-body{padding:20px}#${ROOT_ID} .kfp-upm-actions{right:14px;bottom:16px}#${ROOT_ID} .kfp-upm-avatar-wrap{left:20px}}
`;
    document.head.appendChild(style);
  }

  function userProfileRowAvatarHtml(item, label) {
    var id = text(firstValue(item && item.id, item && item.user_id, item && item.userId, ""));
    var user = firstValue(item && item.user, item && item.account, item, {});
    var avatar = firstValue(user.avatar, item && item.avatar, "");
    var name = text(firstValue(label, user.global_name, user.globalName, user.username, item && item.name, id, "?"));
    var candidates = id && avatar ? assetCandidates("avatars", id, avatar, "80") : [];

    if (candidates.length) {
      return '<span class="kfp-upm-row-avatar"><img data-kfp-srcs="' + encodedSrcs(candidates) + '" alt=""><span class="kfp-img-fallback" hidden>' + escapeHtml(name.slice(0, 1).toUpperCase()) + '</span></span>';
    }

    return '<span class="kfp-upm-row-avatar">' + escapeHtml(name.slice(0, 1).toUpperCase()) + '</span>';
  }

  function userProfileMutualFriendsHtml(bundle) {
    var items = Array.isArray(bundle.mutualFriends) ? bundle.mutualFriends : [];

    if (!items.length) return '<div class="kfp-upm-empty">Aucun ami mutuel détecté.</div>';

    return '<div class="kfp-upm-list">' + items.slice(0, 16).map(function (item) {
      var user = firstValue(item.user, item.account, item, {});
      var name = text(firstValue(user.global_name, user.globalName, user.username, item.display_name, item.displayName, item.username, item.id, "Utilisateur"));
      var tag = makeTag(text(firstValue(user.username, item.username, name)), text(firstValue(user.discriminator, item.discriminator, "")), name);

      return '<div class="kfp-upm-row">' +
        userProfileRowAvatarHtml(item, name) +
        '<div><div class="kfp-upm-row-title">' + escapeHtml(name) + '</div><div class="kfp-upm-row-sub">' + escapeHtml(tag) + '</div></div>' +
        '</div>';
    }).join("") + '</div>';
  }

  function userProfileGuildIconHtml(item, name) {
    var id = text(firstValue(item && item.id, item && item.guild_id, item && item.guildId, item && item.guild && item.guild.id, ""));
    var icon = firstValue(item && item.icon, item && item.icon_hash, item && item.iconHash, item && item.guild && item.guild.icon, "");
    var initials = guildInitials(name, id);
    var candidates = id && icon ? assetCandidates("icons", id, icon, "80") : [];

    if (candidates.length) {
      return '<span class="kfp-upm-row-avatar"><img data-kfp-srcs="' + encodedSrcs(candidates) + '" alt=""><span class="kfp-img-fallback" hidden>' + escapeHtml(initials) + '</span></span>';
    }

    return '<span class="kfp-upm-row-avatar">' + escapeHtml(initials) + '</span>';
  }

  function userProfileMutualGuildsHtml(bundle) {
    var items = Array.isArray(bundle.mutualGuilds) ? bundle.mutualGuilds : [];

    if (!items.length) return '<div class="kfp-upm-empty">Aucune communauté mutuelle détectée.</div>';

    return '<div class="kfp-upm-list">' + items.slice(0, 16).map(function (item) {
      var guild = firstValue(item.guild, item, {});
      var id = text(firstValue(item.id, item.guild_id, item.guildId, guild.id, ""));
      var name = text(firstValue(item.name, guild.name, id ? "Serveur " + id.slice(-4) : "Communauté"));
      var nick = text(firstValue(item.nick, item.nickname, item.display_name, item.displayName, ""));
      var sub = nick || "Serveur mutuel";

      return '<div class="kfp-upm-row" data-kfp-mutual-guild-id="' + escapeHtml(id) + '">' +
        userProfileGuildIconHtml(item, name) +
        '<div><div class="kfp-upm-row-title">' + escapeHtml(name) + '</div><div class="kfp-upm-row-sub">' + escapeHtml(sub) + '</div></div>' +
        '</div>';
    }).join("") + '</div>';
  }

  function userProfileConnectionsHtml(bundle) {
    var items = Array.isArray(bundle.connectedAccounts) ? bundle.connectedAccounts : [];

    if (!items.length) return '<div class="kfp-upm-empty">Aucune connexion publique.</div>';

    return '<div class="kfp-upm-chip-row">' + items.map(function (item) {
      return '<span class="kfp-upm-chip"><span class="kfp-upm-dot"></span><span>' + escapeHtml(text(firstValue(item.name, item.id, "Connexion"))) + '</span></span>';
    }).join("") + '</div>';
  }

  function userProfileRoleHtml(bundle) {
    if (!bundle.roles || !bundle.roles.length) return '<div class="kfp-upm-empty">Profil global : aucun rôle serveur affiché.</div>';

    return '<div class="kfp-upm-chip-row">' + bundle.roles.map(function (role) {
      var color = normalizeColor(firstValue(role.color, role.colour, role.color_value, role.colorValue, ""), "");
      var name = text(firstValue(role.name, role.id, "Rôle"));

      return '<span class="kfp-upm-chip"><span class="kfp-upm-dot" style="background:' + escapeHtml(color || "var(--text-muted,#80848e)") + '"></span><span>' + escapeHtml(name) + '</span></span>';
    }).join("") + '</div>';
  }

  function userProfileModalMarkup(bundle) {
    var accent = escapeHtml(bundle.accentColor || "#7c3aed");
    var avatarFallback = escapeHtml(text(bundle.displayName || bundle.username || "?").slice(0, 1).toUpperCase());
    var bannerImg = bundle.bannerCandidates.length ? '<img class="kfp-upm-banner-img" data-kfp-srcs="' + encodedSrcs(bundle.bannerCandidates) + '" alt="">' : '';
    var avatarImg = bundle.avatarCandidates.length ? '<img class="kfp-upm-avatar-img" data-kfp-srcs="' + encodedSrcs(bundle.avatarCandidates) + '" alt=""><span class="kfp-upm-fallback kfp-img-fallback" hidden>' + avatarFallback + '</span>' : '<span class="kfp-upm-fallback">' + avatarFallback + '</span>';
    var created = formatDate(bundle.createdAt);
    var joined = formatDate(bundle.joinedAt);
    var pronouns = bundle.pronouns ? '<div class="kfp-upm-pronouns">' + escapeHtml(bundle.pronouns) + '</div>' : '';
    var customStatus = bundle.customStatus ? '<section class="kfp-upm-section kfp-upm-box"><div class="kfp-upm-title">Statut</div><div class="kfp-upm-text">' + escapeHtml(bundle.customStatus) + '</div></section>' : '';
    var botBadge = bundle.bot ? '<span class="kfp-upm-bot">BOT</span>' : '';
    var memberSince = '';

    if (created || joined) {
      memberSince = '<section class="kfp-upm-section kfp-upm-box"><div class="kfp-upm-title">Membre depuis</div><div class="kfp-upm-text">' +
        (created ? 'Compte créé : ' + escapeHtml(created) : '') +
        (created && joined ? '<br>' : '') +
        (joined ? 'Serveur rejoint : ' + escapeHtml(joined) : '') +
        '</div></section>';
    }

    return '' +
      '<div class="modal-backdrop kfp-userprofile-backdrop" data-kfp-userprofile-overlay="1">' +
      '<div class="kfp-userprofile-layer">' +
      '<section class="kfp-userprofile-modal" role="dialog" aria-modal="true" aria-label="User Profile: ' + escapeHtml(bundle.tag || bundle.username || bundle.id) + '" style="--kfp-accent:' + accent + '">' +
      '<header class="kfp-upm-header">' +
      '<div class="kfp-upm-banner">' + bannerImg + '</div>' +
      '<button class="kfp-upm-close" type="button" data-kfp-close="1" aria-label="Fermer">×</button>' +
      '<button class="kfp-upm-debug" type="button" data-kfp-debug="1">JSON</button>' +
      '<div class="kfp-upm-avatar-wrap"><div class="kfp-upm-avatar">' + avatarImg + '</div><span class="kfp-upm-status" style="background:' + escapeHtml(statusColor(bundle.status)) + '" title="' + escapeHtml(statusLabel(bundle.status)) + '"></span></div>' +
      '<div class="kfp-upm-actions">' +
      '<button class="kfp-upm-button secondary" type="button" data-kfp-copy="id">Copier ID</button>' +
      '<button class="kfp-upm-button" type="button" data-kfp-main-action="1">' + escapeHtml(bundle.isSelf ? "Modifier le profil" : "Message") + '</button>' +
      '</div>' +
      '</header>' +
      '<div class="kfp-upm-body">' +
      '<div class="kfp-upm-profile-content">' +
      '<div class="kfp-upm-section">' +
      '<div class="kfp-upm-name-row"><h2 class="kfp-upm-name">' + escapeHtml(bundle.displayName) + '</h2>' + botBadge + '</div>' +
      '<div class="kfp-upm-tag">' + escapeHtml(bundle.tag || bundle.username || bundle.id) + '</div>' +
      pronouns +
      '</div>' +
      '<div class="kfp-upm-tabs" role="tablist">' +
      '<button class="kfp-upm-tab" type="button" data-kfp-tab="overview" data-active="1">Overview</button>' +
      '<button class="kfp-upm-tab" type="button" data-kfp-tab="mutual" data-active="0">Mutual</button>' +
      '</div>' +
      '<div class="kfp-upm-tab-panel" data-kfp-panel="overview">' +
      customStatus +
      '<section class="kfp-upm-section kfp-upm-box"><div class="kfp-upm-title">À propos de moi</div>' +
      (bundle.bio ? '<div class="kfp-upm-text">' + escapeHtml(bundle.bio) + '</div>' : '<div class="kfp-upm-empty">Aucune bio publique.</div>') +
      '</section>' +
      memberSince +
      (bundle.connectedAccounts && bundle.connectedAccounts.length ? '<section class="kfp-upm-section kfp-upm-box"><div class="kfp-upm-title">Connexions</div>' + userProfileConnectionsHtml(bundle) + '</section>' : '') +
      '</div>' +
      '<div class="kfp-upm-tab-panel" data-kfp-panel="mutual" hidden>' +
      '<section class="kfp-upm-section kfp-upm-box"><div class="kfp-upm-title">Amis mutuels</div>' + userProfileMutualFriendsHtml(bundle) + '</section>' +
      '<section class="kfp-upm-section kfp-upm-box"><div class="kfp-upm-title">Communautés mutuelles</div>' + userProfileMutualGuildsHtml(bundle) + '</section>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '</div>' +
      '</div>';
  }

  function bindUserProfileModalButtons(bundle) {
    var container = root();

    /*
      Les boutons du grand profil sont dans un HTML réécrit à chaque ouverture.
      Les anciens addEventListener directs pouvaient sauter quand le modal était remplacé
      ou quand la couche modal-backdrop interceptait le clic. On passe donc en délégation
      sur le root : un seul handler, toujours vivant, et il ne s'active que si le grand
      UserProfileModal est actuellement ouvert.
    */
    container.__KALY_USERPROFILE_BUNDLE__ = bundle;
    container.setAttribute("data-kfp-layer", "userprofile");

    if (container.getAttribute("data-kfp-userprofile-delegated") !== "1") {
      container.setAttribute("data-kfp-userprofile-delegated", "1");

      container.addEventListener("click", async function (event) {
        if (!container.querySelector(".kfp-userprofile-backdrop")) return;

        var target = event.target;
        var action = target && target.closest
          ? target.closest("[data-kfp-close],[data-kfp-debug],[data-kfp-copy],[data-kfp-tab],[data-kfp-main-action],[data-kfp-open-voice]")
          : null;

        if (!action) {
          var insideModal = target && target.closest ? target.closest(".kfp-userprofile-modal") : null;

          /*
            Le clic sur les côtés tombe souvent sur .kfp-userprofile-layer, pas sur
            .kfp-userprofile-backdrop directement. Donc on ferme dès que le clic est
            dans le root du grand profil mais hors modal.
          */
          if (!insideModal) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            closeCard();
          }

          return;
        }

        var activeBundle = container.__KALY_USERPROFILE_BUNDLE__ || lastBundle || bundle;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (action.matches("[data-kfp-close]")) {
          closeCard();
          return;
        }

        if (action.matches("[data-kfp-debug]")) {
          console.log("[KalyProfileCard] UserProfileModal modal-backdrop bundle :", activeBundle);
          return;
        }

        if (action.matches("[data-kfp-copy]")) {
          var key = action.getAttribute("data-kfp-copy") || "";

          if (key === "id") {
            copyToClipboard(activeBundle.id, action, "ID copié");
            return;
          }

          if (key === "tag") {
            copyToClipboard(activeBundle.tag || activeBundle.username || activeBundle.id, action, "Tag copié");
            return;
          }

          copyToClipboard(action.textContent || "", action, "Copié");
          return;
        }

        if (action.matches("[data-kfp-tab]")) {
          var tabTarget = action.getAttribute("data-kfp-tab") || "overview";

          Array.prototype.slice.call(container.querySelectorAll("[data-kfp-tab]")).forEach(function (tab) {
            tab.setAttribute("data-active", tab === action ? "1" : "0");
          });

          Array.prototype.slice.call(container.querySelectorAll("[data-kfp-panel]")).forEach(function (panel) {
            panel.hidden = panel.getAttribute("data-kfp-panel") !== tabTarget;
          });

          return;
        }

        if (action.matches("[data-kfp-open-voice]")) {
          var channelId = action.getAttribute("data-kfp-open-voice") || "";

          if (channelId) {
            closeCard();
            window.KALY_FLUXER_SPA_NAVIGATE("/channels/" + encodeURIComponent(getGuildId()) + "/" + encodeURIComponent(channelId));
          } else {
            console.warn("[KalyProfileCard] ID salon vocal introuvable :", activeBundle && activeBundle.voice);
          }

          return;
        }

        if (action.matches("[data-kfp-main-action]")) {
          if (!activeBundle || !activeBundle.id) return;

          if (activeBundle.isSelf) {
            var settingsButton = document.querySelector('button[aria-label*="Paramètres"],button[aria-label*="paramètres"],button[aria-label*="Settings"],button[aria-label*="settings"],button[aria-label*="User Settings"]');

            if (settingsButton) {
              closeCard();
              settingsButton.click();
              return;
            }

            console.warn("[KalyProfileCard] bouton paramètres introuvable.");
            return;
          }

          if (action.getAttribute("data-kfp-busy") === "1") return;

          action.setAttribute("data-kfp-busy", "1");
          action.textContent = "Ouverture…";

          var ok = await openDm(activeBundle.id);

          if (!ok) {
            action.textContent = "Erreur DM";

            setTimeout(function () {
              action.removeAttribute("data-kfp-busy");
              action.textContent = "Message";
            }, 1200);
          }

          return;
        }
      }, {
        capture: true,
        signal: controller.signal
      });
    }

    activateAssetFallbacks(container);
  }

  async function openKalyUserProfileModal(userId) {
    if (busy) return false;

    userId = text(userId);
    if (!userId) return false;

    busy = true;

    try {
      var localMember = findMember(userId) || (lastBundle && lastBundle.id === userId ? lastBundle.localMember : null) || {
        id: userId,
        displayName: userId,
        username: userId,
        tag: userId,
        roles: [],
        roleObjects: [],
        avatarUrl: "",
        status: "unknown",
        raw: {},
        userRaw: {}
      };

      var container = root();
      ensureUserProfileModalStyle();
      container.innerHTML = '<div class="modal-backdrop kfp-userprofile-backdrop"><div class="kfp-userprofile-layer"><div class="kfp-loading" style="position:relative;left:auto;top:auto">Chargement du UserProfileModal : ' + escapeHtml(localMember.displayName || localMember.username || localMember.id) + '</div></div></div>';

      var profileResponse = await fetchProfile(userId, "");
      var userResponse = await fetchUser(userId);

      var bundle = normalizeBundle(localMember, profileResponse, userResponse, {
        globalProfile: true
      });

      await enrichStaffFlags(bundle);
      await enrichBundleMutualGuilds(bundle);

      lastBundle = bundle;
      lastError = null;

      ensureUserProfileModalStyle();
      container.innerHTML = userProfileModalMarkup(bundle);
      bindUserProfileModalButtons(bundle);

      console.log("[KalyProfileCard] UserProfileModal modal-backdrop ouvert depuis avatar :", bundle);
      return true;
    } catch (error) {
      lastError = error;
      console.error("[KalyProfileCard] crash UserProfileModal modal-backdrop :", error);
      renderError({ x: window.innerWidth - 320 - 12, y: 72 }, "Crash UserProfileModal :\n" + text(error && error.stack ? error.stack : error));
      return false;
    } finally {
      busy = false;
    }
  }



  var nativeUserProfileModalCache = null;

  function sameOriginScriptUrl(value) {
    try {
      var url = new URL(String(value || ""), location.href);
      if (url.origin !== ORIGIN) return "";
      if (!/\.m?js(\?|$)/i.test(url.pathname + url.search)) return "";
      return url.href;
    } catch (error) {
      return "";
    }
  }

  function collectModuleUrls() {
    var urls = [];

    try {
      Array.prototype.slice.call(document.querySelectorAll('script[src],link[rel="modulepreload"][href],link[as="script"][href]')).forEach(function (node) {
        var raw = node.src || node.href || node.getAttribute("src") || node.getAttribute("href") || "";
        var url = sameOriginScriptUrl(raw);
        if (url) urls.push(url);
      });
    } catch (errorNodes) {}

    try {
      performance.getEntriesByType("resource").forEach(function (entry) {
        var url = sameOriginScriptUrl(entry && entry.name);
        if (url) urls.push(url);
      });
    } catch (errorPerf) {}

    return unique(urls);
  }

  function fnSource(fn) {
    try {
      return Function.prototype.toString.call(fn);
    } catch (error) {
      return "";
    }
  }

  function exportLooksLikeFunction(value, needles) {
    if (typeof value !== "function") return false;

    var blob = String(value.name || "") + "\n" + fnSource(value);
    return needles.every(function (needle) {
      return blob.indexOf(needle) !== -1;
    });
  }

  function exportLooksLikeObject(value, requiredKeys) {
    if (!value || typeof value !== "object") return false;
    return requiredKeys.every(function (key) {
      return typeof value[key] === "function";
    });
  }

  function flattenModuleExports(mod) {
    var out = [];
    if (!mod || typeof mod !== "object") return out;

    Object.keys(mod).forEach(function (key) {
      var value = mod[key];
      out.push({ key: key, value: value });

      if (value && typeof value === "object") {
        Object.keys(value).slice(0, 80).forEach(function (subKey) {
          out.push({ key: key + "." + subKey, value: value[subKey], parent: value });
        });
      }
    });

    return out;
  }

  function objectValuesSafe(value) {
    if (!value || typeof value !== "object") return [];
    try {
      return Object.keys(value).map(function (key) {
        return { key: key, value: value[key], parent: value };
      });
    } catch (error) {
      return [];
    }
  }

  function webpackRequireCandidates() {
    var candidates = [];
    var seen = new Set();

    function add(req, source) {
      if (!req || typeof req !== "function") return;
      if (seen.has(req)) return;
      if (!req.c && !req.m) return;
      seen.add(req);
      candidates.push({ req: req, source: source || "unknown" });
    }

    add(window.__webpack_require__, "window.__webpack_require__");
    add(window.__rspack_require__, "window.__rspack_require__");

    try {
      Object.keys(window).forEach(function (key) {
        var value = window[key];

        if (!value || !Array.isArray(value)) return;
        if (!/(webpack|rspack|chunk|fluxer)/i.test(key)) return;
        if (typeof value.push !== "function") return;

        try {
          var chunkId = "kaly_profile_modal_probe_" + Date.now() + "_" + Math.random().toString(36).slice(2);
          value.push([[chunkId], {}, function (req) {
            add(req, key);
          }]);
        } catch (errorPushA) {
          try {
            value.push([["kaly_profile_modal_probe"], {}, function (req) {
              add(req, key + ":fallback");
            }]);
          } catch (errorPushB) {}
        }
      });
    } catch (errorWindowKeys) {}

    return candidates;
  }

  function scanExportsEntry(found, entry) {
    var key = entry.key || "";
    var value = entry.value;

    if (!found.handleDeepLinkUrl && typeof value === "function") {
      if (key === "handleDeepLinkUrl" || exportLooksLikeFunction(value, ["parseDeepLink", "navigateForTarget"])) {
        found.handleDeepLinkUrl = value;
      }
    }

    if (!found.react && value && typeof value === "object" && typeof value.createElement === "function" && typeof value.useState === "function") {
      found.react = value;
    }

    if (!found.react && typeof value === "function" && key === "createElement") {
      found.react = entry.parent || null;
    }

    if (!found.modalFactory && typeof value === "function") {
      if (key === "modal" || /(^|\.)modal$/.test(key) || exportLooksLikeFunction(value, ["Component", "props"])) {
        found.modalFactory = value;
      }
    }

    if (!found.modalActions && exportLooksLikeObject(value, ["pushWithKey", "push"])) {
      found.modalActions = value;
    }

    if (!found.modalActions && entry.parent && exportLooksLikeObject(entry.parent, ["pushWithKey", "push"])) {
      found.modalActions = entry.parent;
    }

    if (!found.userProfileModal && typeof value === "function") {
      if (key.indexOf("UserProfileModal") !== -1 || exportLooksLikeFunction(value, ["userId", "guildId", "autoFocusNote"])) {
        found.userProfileModal = value;
      }
    }

    if (!found.userProfileFetch && typeof value === "function") {
      var src = fnSource(value);
      if ((key === "fetch" || key.indexOf("fetch") !== -1) && src.indexOf("/profile") !== -1 && src.indexOf("guild_id") !== -1) {
        found.userProfileFetch = value;
      }
    }

    if (!found.userProfileFetch && value && typeof value === "object" && typeof value.fetch === "function") {
      var fetchSrc = fnSource(value.fetch);
      if (fetchSrc.indexOf("/profile") !== -1 && fetchSrc.indexOf("guild_id") !== -1) {
        found.userProfileFetch = value.fetch.bind(value);
      }
    }
  }

  function scanWebpackModuleCache(found) {
    var reqs = webpackRequireCandidates();
    found.webpackSources = reqs.map(function (item) { return item.source; });
    found.webpackModulesChecked = 0;

    reqs.forEach(function (item) {
      var req = item.req;
      var cache = req && req.c ? req.c : {};

      Object.keys(cache || {}).forEach(function (moduleId) {
        var moduleRecord = cache[moduleId];
        var exportsObject = moduleRecord && moduleRecord.exports;
        if (!exportsObject) return;

        found.webpackModulesChecked += 1;

        flattenModuleExports(exportsObject).forEach(function (entry) {
          scanExportsEntry(found, entry);
        });

        objectValuesSafe(exportsObject).forEach(function (entry) {
          if (entry.value && typeof entry.value === "object") {
            flattenModuleExports(entry.value).forEach(function (nested) {
              scanExportsEntry(found, nested);
            });
          }
        });
      });
    });
  }

  async function discoverNativeUserProfileModal() {
    if (nativeUserProfileModalCache) return nativeUserProfileModalCache;

    var found = {
      handleDeepLinkUrl: null,
      modalFactory: null,
      modalActions: null,
      userProfileModal: null,
      userProfileFetch: null,
      react: null,
      modulesChecked: 0,
      urlsChecked: [],
      webpackSources: [],
      webpackModulesChecked: 0
    };

    scanWebpackModuleCache(found);

    if (found.handleDeepLinkUrl || (found.modalActions && found.modalFactory && found.userProfileModal && found.react)) {
      nativeUserProfileModalCache = found;
      return found;
    }

    var urls = collectModuleUrls();

    for (var i = 0; i < urls.length; i += 1) {
      var url = urls[i];
      found.urlsChecked.push(url);

      try {
        var mod = await import(url);
        found.modulesChecked += 1;
        var exportsList = flattenModuleExports(mod);

        exportsList.forEach(function (entry) {
          scanExportsEntry(found, entry);
        });
      } catch (errorImport) {}

      if (found.handleDeepLinkUrl || (found.modalActions && found.modalFactory && found.userProfileModal && found.react)) {
        break;
      }
    }

    nativeUserProfileModalCache = found;
    return found;
  }

  async function openOfficialUserProfileModal(userId) {
    userId = text(userId);
    if (!userId) return false;

    try {
      var discovered = await discoverNativeUserProfileModal();

      if (discovered.modalActions && discovered.modalFactory && discovered.userProfileModal && discovered.react) {
        try {
          if (discovered.userProfileFetch) {
            await discovered.userProfileFetch(userId, undefined);
          }
        } catch (errorFetch) {
          console.warn("[KalyProfileCard] fetch profil natif KO, ouverture modal quand même :", errorFetch);
        }

        discovered.modalActions.pushWithKey(
          discovered.modalFactory(function () {
            return discovered.react.createElement(discovered.userProfileModal, {
              userId: userId,
              guildId: undefined
            });
          }),
          "user-profile-" + userId + "-global"
        );

        console.log("[KalyProfileCard] UserProfileModal natif ouvert depuis avatar :", {
          userId: userId,
          mode: "direct-module",
          modulesChecked: discovered.modulesChecked
        });

        return true;
      }

      if (typeof discovered.handleDeepLinkUrl === "function") {
        var ok = discovered.handleDeepLinkUrl(ORIGIN + "/users/" + encodeURIComponent(userId));

        console.log("[KalyProfileCard] UserProfileModal natif demandé via DeepLinkUtils :", {
          userId: userId,
          ok: ok,
          modulesChecked: discovered.modulesChecked
        });

        return Boolean(ok);
      }

      console.warn("[KalyProfileCard] Aucun ouvreur UserProfileModal natif trouvé :", discovered);
      return false;
    } catch (error) {
      console.warn("[KalyProfileCard] ouverture UserProfileModal native impossible :", error);
      return false;
    }
  }

  function profileCardPosition(container, event) {
    var popout = container && container.querySelector ? container.querySelector(".kfp-popout") : null;
    var margin = 8;
    var cardWidth = 300;

    if (popout && popout.getBoundingClientRect) {
      var rect = popout.getBoundingClientRect();
      return {
        x: Math.round(Math.max(margin, Math.min(window.innerWidth - rect.width - margin, rect.left))),
        y: Math.round(Math.max(margin, Math.min(window.innerHeight - rect.height - margin, rect.top)))
      };
    }

    if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
      return {
        x: Math.round(Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, event.clientX - cardWidth - 26))),
        y: Math.round(Math.max(margin, Math.min(window.innerHeight - 220, event.clientY - 56)))
      };
    }

    return {
      x: window.innerWidth - cardWidth - 12,
      y: 72
    };
  }

  function renderBundleAtPosition(bundle, pos) {
    var container = root();
    container.innerHTML = cardMarkup(bundle, pos);
    clampFloatingElement(container, ".kfp-popout");
    bindGlobalButtons(bundle);
    return container;
  }

  async function openGlobalProfile(userId, pos) {
    if (busy) return false;

    userId = text(userId);
    if (!userId) return false;

    busy = true;

    try {
      var localMember = findMember(userId) || (lastBundle && lastBundle.id === userId ? lastBundle.localMember : null) || {
        id: userId,
        displayName: userId,
        username: userId,
        tag: userId,
        roles: [],
        roleObjects: [],
        avatarUrl: "",
        status: "unknown",
        raw: {},
        userRaw: {}
      };

      pos = pos || {
        x: window.innerWidth - 320 - 12,
        y: 72
      };

      renderLoading(pos, localMember.displayName || localMember.username || localMember.id);

      /*
        Profil global officiel : pas de guild_id.
        Le serveur renvoie alors user + user_profile, et le script ignore les champs serveur locaux.
      */
      var profileResponse = await fetchProfile(userId, "");
      var userResponse = await fetchUser(userId);

      var bundle = normalizeBundle(localMember, profileResponse, userResponse, {
        globalProfile: true
      });

      await enrichStaffFlags(bundle);
      await enrichBundleMutualGuilds(bundle);

      lastBundle = bundle;
      lastError = null;

      renderBundleAtPosition(bundle, pos);
      console.log("[KalyProfileCard] profil global ouvert depuis avatar :", bundle);

      return true;
    } catch (error) {
      lastError = error;
      console.error("[KalyProfileCard] crash profil global :", error);
      renderError(pos || { x: window.innerWidth - 320 - 12, y: 72 }, "Crash profil global :\n" + text(error && error.stack ? error.stack : error));
      return false;
    } finally {
      busy = false;
    }
  }

  async function openProfile(member, pos) {
    if (busy) return false;
    busy = true;

    try {
      if (!member || !member.id) {
        renderError(pos, "Membre invalide.");
        return false;
      }

      renderLoading(pos, member.displayName || member.username || member.id);

      var profileResponse = await fetchProfile(member.id, getGuildId());
      var userResponse = await fetchUser(member.id);

      var bundle = normalizeBundle(member, profileResponse, userResponse, { globalProfile: false });
      await enrichStaffFlags(bundle);
      lastBundle = bundle;
      lastError = null;

      renderBundleAtPosition(bundle, pos);
      console.log("[KalyProfileCard] profil officiel fallback ouvert :", bundle);
      return true;
    } catch (error) {
      lastError = error;
      console.error("[KalyProfileCard] crash :", error);
      renderError(pos, "Crash profile card :\n" + text(error && error.stack ? error.stack : error));
      return false;
    } finally {
      busy = false;
    }
  }

  function openFromButton(button, event) {
    var member = memberFromButton(button);
    var pos = anchorPosition(event, button);
    return openProfile(member, pos);
  }

  window.KALY_FLUXER_PROFILECARD_API = {
    version: VERSION,
    open: function (nameOrId) {
      var member = findMember(nameOrId);
      if (!member) {
        console.error("[KalyProfileCard] membre introuvable :", nameOrId);
        return false;
      }
      openProfile(member, { x: window.innerWidth - 320 - 12, y: 72 });
      return true;
    },
    openFromButton: openFromButton,
    openUserProfileModal: function (nameOrId) {
      var member = findMember(nameOrId);
      var id = member ? member.id : text(nameOrId);

      if (!id) {
        console.error("[KalyProfileCard] membre modal introuvable :", nameOrId);
        return Promise.resolve(false);
      }

      return openOfficialUserProfileModal(id).then(function (ok) {
        if (ok) return true;
        return openKalyUserProfileModal(id);
      });
    },
    openGlobal: function (nameOrId) {
      var member = findMember(nameOrId);
      var id = member ? member.id : text(nameOrId);

      if (!id) {
        console.error("[KalyProfileCard] membre global introuvable :", nameOrId);
        return false;
      }

      openKalyUserProfileModal(id);

      return true;
    },
    fetch: async function (nameOrId) {
      var member = findMember(nameOrId);
      if (!member) return null;
      var response = await fetchProfile(member.id, getGuildId());
      var userResponse = await fetchUser(member.id);
      var bundle = normalizeBundle(member, response, userResponse, { globalProfile: false });
      await enrichStaffFlags(bundle);
      return bundle;
    },
    fetchGlobal: async function (nameOrId) {
      var member = findMember(nameOrId);
      var id = member ? member.id : text(nameOrId);

      if (!id) return null;

      var response = await fetchProfile(id, "");
      var userResponse = await fetchUser(id);
      var bundle = normalizeBundle(member || { id: id }, response, userResponse, { globalProfile: true });
      await enrichStaffFlags(bundle);
      return bundle;
    },
    debugStaffBadge: async function (nameOrId) {
      var member = findMember(nameOrId);
      var id = member ? member.id : text(nameOrId);
      if (!id) return null;

      var response = await fetchProfile(id, getGuildId());
      var userResponse = await fetchUser(id);
      var bundle = normalizeBundle(member || { id: id }, response, userResponse, { globalProfile: false });
      await enrichStaffFlags(bundle);

      return {
        id: id,
        hasStaff: kfpHasStaffUserFlag(bundle),
        staffProbe: bundle.staffProbe,
        staffFlagProbeHit: bundle.staffFlagProbeHit,
        candidates: kfpStaffFlagCandidates(bundle),
        requests: lastRequests.slice(),
        rawProfile: bundle.rawProfile,
        userResponse: bundle.userResponse && bundle.userResponse.json
      };
    },
    forceStaffBadge: function (nameOrId) {
      var member = findMember(nameOrId);
      var id = member ? member.id : text(nameOrId);
      if (!id) return false;
      setStaffOverride(id, true);
      var cache = loadStaffFlagCache();
      cache[id] = { hasStaff: true, updatedAt: Date.now(), source: "manual-override" };
      saveStaffFlagCache(cache);
      return true;
    },
    clearStaffBadge: function (nameOrId) {
      var member = findMember(nameOrId);
      var id = member ? member.id : text(nameOrId);
      if (!id) return false;
      setStaffOverride(id, false);
      var cache = loadStaffFlagCache();
      delete cache[id];
      saveStaffFlagCache(cache);
      return true;
    },
    clearStaffBadgeCache: function () {
      localStorage.removeItem(STAFF_FLAG_CACHE_KEY);
      return true;
    },
    close: closeCard,
    stop: function () {
      controller.abort();
      closeCard();

      try {
        Array.prototype.slice.call(document.querySelectorAll(
          "#" + ROOT_ID + ",style[id^='" + STYLE_ID + "']"
        )).forEach(function (element) {
          element.remove();
        });
      } catch (errorStopCleanup) {
        var style = document.getElementById(STYLE_ID);
        if (style) style.remove();
        var modalStyle = document.getElementById(PROFILE_MODAL_STYLE_ID);
        if (modalStyle) modalStyle.remove();
        var rootEl = document.getElementById(ROOT_ID);
        if (rootEl) rootEl.remove();
      }

      delete window.KALY_FLUXER_PROFILECARD_API;
      delete window.KALY_PROFILE_NATIVE_EVENT_BRIDGE;
      delete window.KALY_NATIVE_PROFILE_CLICK_BRIDGE;
      console.log("[KalyProfileCard] stoppé", VERSION);
    },
    dump: function () {
      return {
        version: VERSION,
        apiBase: getApiBase(),
        guildId: getGuildId(),
        channelId: getChannelId(),
        busy: busy,
        members: getMembers().length,
        roles: getRoles().length,
        lastBundle: lastBundle,
        lastBundleIsGlobal: lastBundle ? Boolean(lastBundle.isGlobalProfile) : false,
        lastError: lastError,
        lastRequests: lastRequests.slice(),
        staffCache: loadStaffFlagCache(),
        staffOverrideIds: readStaffOverrideIds()
      };
    }
  };

  window.KALY_PROFILE_NATIVE_EVENT_BRIDGE = window.KALY_FLUXER_PROFILECARD_API;
  window.KALY_NATIVE_PROFILE_CLICK_BRIDGE = window.KALY_FLUXER_PROFILECARD_API;

  if (window.KalyFluxerMemberListFix) {
    window.KalyFluxerMemberListFix.openNativeProfile = function (nameOrId) {
      return window.KALY_FLUXER_PROFILECARD_API.open(nameOrId);
    };
    window.KalyFluxerMemberListFix.openProfileCard = window.KalyFluxerMemberListFix.openNativeProfile;
    window.KalyFluxerMemberListFix.openUserProfileModal = function (nameOrId) {
      return window.KALY_FLUXER_PROFILECARD_API.openUserProfileModal(nameOrId);
    };
    window.KalyFluxerMemberListFix.openGlobalProfile = function (nameOrId) {
      return window.KALY_FLUXER_PROFILECARD_API.openGlobal(nameOrId);
    };
    window.KalyFluxerMemberListFix.dumpProfileBridge = function () {
      return window.KALY_FLUXER_PROFILECARD_API.dump();
    };
  }

  console.log("[KalyProfileCard] fallback officiel utilisable actif", VERSION, "clic avatar = UserProfileModal modal-backdrop");
})();

/* -------------------------------------------------------------------------- */
/* Kaly patch: clic droit membre, menu officiel-like GuildMemberContextMenu   */
/* -------------------------------------------------------------------------- */
(function () {
  "use strict";

  var VERSION = "kaly-member-context-menu-official-like-1.0.1-scroll-lock";
  var ORIGIN = location.origin.replace(/\/+$/, "");
  var MENU_ID = "kaly-fluxer-member-context-menu";
  var STYLE_ID = "kaly-fluxer-member-context-menu-style";

  if (window.__KALY_MEMBER_CONTEXT_MENU__ && typeof window.__KALY_MEMBER_CONTEXT_MENU__.stop === "function") {
    try { window.__KALY_MEMBER_CONTEXT_MENU__.stop(); } catch (errorStop) {}
  }

  var controller = new AbortController();
  var lastMember = null;
  var lastAction = null;
  var lastError = null;

  function text(value) {
    if (value === undefined || value === null) return "";
    return String(value);
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return text(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, "");
  }

  function firstValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function uniq(values) {
    var seen = new Set();
    var out = [];
    values.forEach(function (value) {
      value = text(value).trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      out.push(value);
    });
    return out;
  }

  function loadStaffFlagCache() {
    try {
      var raw = localStorage.getItem(STAFF_FLAG_CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveStaffFlagCache(cache) {
    try {
      localStorage.setItem(STAFF_FLAG_CACHE_KEY, JSON.stringify(cache || {}));
    } catch (error) {}
  }

  function readStaffOverrideIds() {
    var raw = text(localStorage.getItem(STAFF_FLAG_OVERRIDE_KEY) || "").trim();
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return unique(parsed.map(text).filter(Boolean));
    } catch (error) {}

    return unique(raw.split(/[\s,;]+/).map(text).filter(Boolean));
  }

  function writeStaffOverrideIds(ids) {
    localStorage.setItem(STAFF_FLAG_OVERRIDE_KEY, JSON.stringify(unique((ids || []).map(text).filter(Boolean))));
  }

  function hasStaffOverride(userId) {
    userId = text(userId);
    return readStaffOverrideIds().indexOf(userId) !== -1;
  }

  function setStaffOverride(userId, enabled) {
    userId = text(userId);
    if (!userId) return false;

    var ids = readStaffOverrideIds().filter(function (id) {
      return id !== userId;
    });

    if (enabled !== false) ids.push(userId);
    writeStaffOverrideIds(ids);
    return true;
  }

  function parseCookie(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function collectStrings(value, path, out) {
    path = path || "";
    out = out || [];

    if (typeof value === "string") {
      out.push({ path: path, value: value });
      return out;
    }

    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        collectStrings(item, path + "[" + index + "]", out);
      });
      return out;
    }

    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        collectStrings(value[key], path ? path + "." + key : key, out);
      });
    }

    return out;
  }

  function getTokenCandidates() {
    var tokens = [];

    ["session", "token", "access_token", "auth", "authorization", "session_token", "csrf_token", "csrftoken"].forEach(function (cookieName) {
      var value = parseCookie(cookieName);
      if (value) tokens.push(value);
    });

    [localStorage, sessionStorage].forEach(function (storage) {
      if (!storage) return;

      for (var i = 0; i < storage.length; i += 1) {
        var key = storage.key(i) || "";
        var raw = storage.getItem(key) || "";
        var lowerKey = key.toLowerCase();

        if (
          lowerKey.indexOf("token") !== -1 ||
          lowerKey.indexOf("auth") !== -1 ||
          lowerKey.indexOf("session") !== -1 ||
          lowerKey.indexOf("access") !== -1
        ) {
          tokens.push(raw);
        }

        try {
          var parsed = JSON.parse(raw);
          collectStrings(parsed, key, []).forEach(function (item) {
            var path = text(item.path).toLowerCase();
            var value = text(item.value).trim();

            if (
              value.length >= 16 &&
              value.length <= 4096 &&
              (
                path.indexOf("token") !== -1 ||
                path.indexOf("auth") !== -1 ||
                path.indexOf("session") !== -1 ||
                path.indexOf("access") !== -1
              ) &&
              path.indexOf("csrf") === -1
            ) {
              tokens.push(value);
            }
          });
        } catch (errorJson) {}
      }
    });

    return uniq(tokens).filter(function (token) {
      return token.length >= 12 && token.length <= 4096;
    });
  }

  function buildHeaderSets() {
    var sets = [];
    var csrf = parseCookie("csrf_token") || parseCookie("csrftoken") || "";
    var tokens = getTokenCandidates();

    tokens.forEach(function (token) {
      if (!token) return;

      if (token.indexOf("Bearer ") === 0 || token.indexOf("Bot ") === 0 || token.indexOf("Session ") === 0) {
        sets.push({ Authorization: token });
      } else {
        sets.push({ Authorization: token });
        sets.push({ Authorization: "Bearer " + token });
        sets.push({ Authorization: "Session " + token });
        sets.push({ "X-Session-Token": token });
        sets.push({ "X-Auth-Token": token });
      }
    });

    if (csrf) sets.push({ "X-CSRF-Token": csrf });
    sets.push({});

    return uniq(sets.map(function (headers) {
      return JSON.stringify(headers);
    })).map(function (headers) {
      return JSON.parse(headers);
    });
  }

  function getApiBase() {
    var fromState = window.KalyFluxerMemberListFix && window.KalyFluxerMemberListFix.state && window.KalyFluxerMemberListFix.state.base
      ? window.KalyFluxerMemberListFix.state.base
      : "";
    var raw = localStorage.getItem("kaly_fluxer_memberlist_api_base") || fromState || ORIGIN + "/api/v1";

    try {
      var href = new URL(raw, location.href).href.replace(/\/+$/, "");
      href = href.replace(/\/api\/v1\/.*$/, "/api/v1");
      href = href.replace(/\/api\/.*$/, "/api");
      href = href.replace(/\/(guilds|channels|users|members|roles|media|avatars|banners)\/.*$/, "");
      if (/\/api\/v1$/.test(href)) return href;
      if (/\/api$/.test(href)) return href + "/v1";
      return href + "/api/v1";
    } catch (error) {
      return ORIGIN + "/api/v1";
    }
  }

  async function requestJson(method, path, body) {
    var apiBase = getApiBase();
    var url = path.indexOf("http") === 0 ? path : apiBase + path;
    var headersList = buildHeaderSets();
    var last = null;

    for (var i = 0; i < headersList.length; i += 1) {
      var headers = Object.assign({ Accept: "application/json" }, headersList[i]);
      if (body !== undefined) headers["Content-Type"] = "application/json";

      try {
        var response = await fetch(url, {
          method: method,
          credentials: "include",
          headers: headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal
        });

        var rawText = await response.text();
        var json = null;
        try { json = rawText ? JSON.parse(rawText) : null; } catch (errorJson) { json = null; }

        last = { ok: response.ok, status: response.status, text: rawText, json: json, url: url };
        if (response.ok) return last;
      } catch (error) {
        last = { ok: false, status: 0, text: text(error && error.message ? error.message : error), json: null, url: url };
      }
    }

    return last;
  }

  function getState() {
    return window.KalyFluxerMemberListFix && window.KalyFluxerMemberListFix.state ? window.KalyFluxerMemberListFix.state : {};
  }

  function getGuildId() {
    var state = getState();
    if (state.guildId) return text(state.guildId);
    var stored = localStorage.getItem("kaly_fluxer_memberlist_guild_id");
    if (stored) return stored;
    var match = location.href.match(/\/channels\/([1-9][0-9]{14,24})\/([1-9][0-9]{14,24})/);
    return match && match[1] ? match[1] : "";
  }

  function getChannelId() {
    var match = location.href.match(/\/channels\/([1-9][0-9]{14,24}|@me|@favorites)\/([1-9][0-9]{14,24})/);
    return match && match[2] ? match[2] : "";
  }

  function getMembers() {
    var state = getState();
    return Array.isArray(state.members) ? state.members : [];
  }

  function getRoles() {
    var state = getState();
    return Array.isArray(state.roles) ? state.roles : [];
  }

  function isSelf(member) {
    var state = getState();
    return Boolean(member && state.selfMemberId && text(state.selfMemberId) === text(member.id));
  }

  function findMember(value) {
    var members = getMembers();
    var raw = text(value);
    var needle = normalizeText(value);

    for (var i = 0; i < members.length; i += 1) {
      var member = members[i];
      if (
        text(member.id) === raw ||
        normalizeText(member.displayName).indexOf(needle) !== -1 ||
        normalizeText(member.username).indexOf(needle) !== -1 ||
        normalizeText(member.tag).indexOf(needle) !== -1
      ) {
        return member;
      }
    }

    return null;
  }

  function memberFromButton(button) {
    var id = button.getAttribute("data-kml-member-id") || "";
    var name = button.getAttribute("data-kml-member-name") || "";
    return findMember(id) || findMember(name) || {
      id: id,
      displayName: name || id,
      username: name || id,
      tag: name || id,
      roles: [],
      roleObjects: [],
      raw: {},
      userRaw: {}
    };
  }

  function ensureStyle() {
    var old = document.getElementById(STYLE_ID);
    if (old) old.remove();

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${MENU_ID}{position:fixed;z-index:2147483600;min-width:224px;max-width:290px;padding:6px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:var(--background-floating,#171020);color:var(--text-primary,#f4eeff);box-shadow:0 10px 28px rgba(0,0,0,.42),0 2px 6px rgba(0,0,0,.28);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.2;user-select:none;overscroll-behavior:contain}
#${MENU_ID} *{box-sizing:border-box}
#${MENU_ID} .kcm-group{padding:4px 0;border-bottom:1px solid rgba(255,255,255,.055)}
#${MENU_ID} .kcm-group:last-child{border-bottom:0}
#${MENU_ID} .kcm-item{width:100%;height:35px;display:grid;grid-template-columns:1fr 22px;align-items:center;gap:14px;padding:0 9px 0 11px;border:0;border-radius:4px;background:transparent;color:var(--text-primary,#f4eeff);font:inherit;text-align:left;cursor:pointer;white-space:nowrap}
#${MENU_ID} .kcm-item:hover,#${MENU_ID} .kcm-item[data-open="1"]{background:var(--background-modifier-hover,rgba(124,58,237,.22));color:#fff}
#${MENU_ID} .kcm-item:disabled{opacity:.45;cursor:not-allowed}
#${MENU_ID} .kcm-item-danger{color:var(--status-danger,#ff4047)}
#${MENU_ID} .kcm-item-danger:hover{background:rgba(239,68,68,.16);color:#ff5b61}
#${MENU_ID} .kcm-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${MENU_ID} .kcm-icon{font-size:17px;text-align:center;line-height:1;color:currentColor;opacity:.95}
#${MENU_ID} .kcm-submenu{position:absolute;display:none;min-width:230px;max-width:315px;max-height:360px;overflow:auto;padding:6px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:var(--background-floating,#171020);box-shadow:0 10px 28px rgba(0,0,0,.42);scrollbar-width:thin;overscroll-behavior:contain;touch-action:pan-y}
#${MENU_ID} .kcm-submenu[data-visible="1"]{display:block}
#${MENU_ID} .kcm-role-item{grid-template-columns:22px 1fr 18px;height:34px}
#${MENU_ID} .kcm-role-dot{width:11px;height:11px;border-radius:999px;background:var(--text-muted,#80848e);justify-self:center}
#${MENU_ID} .kcm-check{font-size:16px;text-align:center;color:#fff}
#${MENU_ID} .kcm-note{max-width:248px;padding:8px 9px;color:var(--text-tertiary,#bfb0d8);font-size:12px;line-height:1.35;white-space:normal}
#${MENU_ID} .kcm-toast{margin:4px 0 0;padding:7px 9px;border-radius:6px;background:rgba(124,58,237,.18);color:#e9ddff;font-size:12px;line-height:1.35;white-space:normal}
`;
    document.head.appendChild(style);
  }

  function closeMenu() {
    var menu = document.getElementById(MENU_ID);
    if (menu) menu.remove();
  }

  function positionBox(el, x, y) {
    var rect = el.getBoundingClientRect();
    var left = Math.max(6, Math.min(window.innerWidth - rect.width - 6, x));
    var top = Math.max(6, Math.min(window.innerHeight - rect.height - 6, y));
    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
  }

  function showToast(message, danger) {
    var menu = document.getElementById(MENU_ID);
    if (!menu) return;
    var toast = menu.querySelector(".kcm-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "kcm-toast";
      menu.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = danger ? "rgba(239,68,68,.16)" : "rgba(124,58,237,.18)";
    toast.style.color = danger ? "#ffd7d7" : "#e9ddff";
  }

  function copyText(value) {
    value = text(value);
    if (!value) return Promise.resolve(false);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(function () { return true; }).catch(function () { return fallbackCopy(value); });
    }

    return Promise.resolve(fallbackCopy(value));
  }

  function fallbackCopy(value) {
    var ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    ta.remove();
    return ok;
  }

  function insertAtCursor(el, value) {
    if (!el) return false;
    try {
      el.focus();
      if (typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
        var start = el.selectionStart;
        var end = el.selectionEnd;
        el.value = el.value.slice(0, start) + value + el.value.slice(end);
        el.selectionStart = el.selectionEnd = start + value.length;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
        return true;
      }
      document.execCommand("insertText", false, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function mentionUser(member) {
    var mention = "<@" + member.id + ">";
    var active = document.activeElement;
    var target = null;

    if (active && (active.isContentEditable || /^(TEXTAREA|INPUT)$/i.test(active.tagName))) {
      target = active;
    } else {
      target = document.querySelector('[contenteditable="true"][role="textbox"], [contenteditable="true"], textarea, input[type="text"]');
    }

    if (target && insertAtCursor(target, mention)) {
      showToast("Mention insérée.");
      return true;
    }

    copyText(mention).then(function () {
      showToast("Mention copiée : " + mention);
    });
    return false;
  }

  async function openDm(member) {
    if (window.KALY_FLUXER_PROFILECARD_API && typeof window.KALY_FLUXER_PROFILECARD_API.open === "function") {
      var api = window.KALY_FLUXER_PROFILECARD_API;
      if (api && typeof api.fetch === "function") {
        /* rien, juste pour garder l'API chargée */
      }
    }

    var response = await requestJson("POST", "/users/@me/channels", { recipient_id: member.id });
    if (!response || !response.ok || !response.json) {
      throw new Error("DM API KO : HTTP " + (response ? response.status : "?") + " " + (response ? response.text.slice(0, 140) : ""));
    }

    var channelId = firstValue(response.json.id, response.json.channel_id, response.json.channelId, "");
    if (!channelId) throw new Error("DM créé, mais channel ID introuvable.");

    closeMenu();
    if (window.KALY_FLUXER_SPA_NAVIGATE) {
      window.KALY_FLUXER_SPA_NAVIGATE("/channels/@me/" + encodeURIComponent(channelId));
    } else {
      history.pushState(null, "", "/channels/@me/" + encodeURIComponent(channelId));
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    }

    return true;
  }

  function openProfile(member) {
    closeMenu();

    if (window.KALY_FLUXER_PROFILECARD_API && typeof window.KALY_FLUXER_PROFILECARD_API.open === "function") {
      window.KALY_FLUXER_PROFILECARD_API.open(member.id);
      return true;
    }

    if (window.KalyFluxerMemberListFix && typeof window.KalyFluxerMemberListFix.openMergedProfile === "function") {
      window.KalyFluxerMemberListFix.openMergedProfile(member.id);
      return true;
    }

    return false;
  }

  function addNote(member) {
    closeMenu();

    if (window.KALY_FLUXER_PROFILECARD_API && typeof window.KALY_FLUXER_PROFILECARD_API.open === "function") {
      window.KALY_FLUXER_PROFILECARD_API.open(member.id).then(function () {
        console.log("[KalyContextMenu] Note : ouvre le profil complet Fluxer natif si tu veux éditer une note réelle.", member);
      });
      return true;
    }

    return openProfile(member);
  }

  async function blockUser(member) {
    if (!confirm("Bloquer " + (member.displayName || member.username || member.id) + " ?")) return false;

    var response = await requestJson("PUT", "/users/@me/relationships/" + encodeURIComponent(member.id), { type: "BLOCKED" });
    if (!response || !response.ok) {
      /* Certaines builds attendent la valeur enum numérique. */
      response = await requestJson("PUT", "/users/@me/relationships/" + encodeURIComponent(member.id), { type: 2 });
    }

    if (!response || !response.ok) {
      throw new Error("Blocage KO : HTTP " + (response ? response.status : "?") + " " + (response ? response.text.slice(0, 160) : ""));
    }

    showToast("Utilisateur bloqué.");
    return true;
  }

  async function changeNickname(member) {
    var guildId = getGuildId();
    if (!guildId) throw new Error("Guild ID introuvable.");

    var current = firstValue(member.raw && member.raw.nick, member.raw && member.raw.nickname, member.displayName, "");
    var next = prompt("Nouveau surnom pour " + (member.displayName || member.username || member.id) + " :", current);
    if (next === null) return false;

    next = text(next).trim();
    var body = { nick: next || null, nickname: next || null };
    var response = await requestJson("PATCH", "/guilds/" + encodeURIComponent(guildId) + "/members/" + encodeURIComponent(member.id), body);

    if (!response || !response.ok) {
      throw new Error("Changement de surnom KO : HTTP " + (response ? response.status : "?") + " " + (response ? response.text.slice(0, 160) : ""));
    }

    showToast("Surnom modifié.");
    if (window.KalyFluxerMemberListFix && typeof window.KalyFluxerMemberListFix.refresh === "function") {
      window.KalyFluxerMemberListFix.refresh();
    }
    return true;
  }

  async function kickMember(member) {
    var guildId = getGuildId();
    if (!guildId) throw new Error("Guild ID introuvable.");
    if (!confirm("Expulser " + (member.displayName || member.username || member.id) + " du serveur ?")) return false;

    var response = await requestJson("DELETE", "/guilds/" + encodeURIComponent(guildId) + "/members/" + encodeURIComponent(member.id));
    if (!response || !response.ok) {
      throw new Error("Kick KO : HTTP " + (response ? response.status : "?") + " " + (response ? response.text.slice(0, 160) : ""));
    }

    showToast("Membre expulsé.");
    if (window.KalyFluxerMemberListFix && typeof window.KalyFluxerMemberListFix.refresh === "function") {
      window.KalyFluxerMemberListFix.refresh();
    }
    return true;
  }

  async function banMember(member) {
    var guildId = getGuildId();
    if (!guildId) throw new Error("Guild ID introuvable.");
    if (!confirm("Bannir " + (member.displayName || member.username || member.id) + " du serveur ?")) return false;

    var response = await requestJson("PUT", "/guilds/" + encodeURIComponent(guildId) + "/bans/" + encodeURIComponent(member.id), {});
    if (!response || !response.ok) {
      throw new Error("Ban KO : HTTP " + (response ? response.status : "?") + " " + (response ? response.text.slice(0, 160) : ""));
    }

    showToast("Membre banni.");
    if (window.KalyFluxerMemberListFix && typeof window.KalyFluxerMemberListFix.refresh === "function") {
      window.KalyFluxerMemberListFix.refresh();
    }
    return true;
  }

  async function toggleRole(member, role) {
    var guildId = getGuildId();
    if (!guildId) throw new Error("Guild ID introuvable.");

    var hasRole = Array.isArray(member.roles) && member.roles.indexOf(role.id) !== -1;
    var method = hasRole ? "DELETE" : "PUT";
    var response = await requestJson(method, "/guilds/" + encodeURIComponent(guildId) + "/members/" + encodeURIComponent(member.id) + "/roles/" + encodeURIComponent(role.id));

    if (!response || !response.ok) {
      throw new Error("Rôle KO : HTTP " + (response ? response.status : "?") + " " + (response ? response.text.slice(0, 160) : ""));
    }

    if (hasRole) {
      member.roles = member.roles.filter(function (id) { return id !== role.id; });
    } else {
      member.roles = (member.roles || []).concat([role.id]);
    }

    showToast((hasRole ? "Rôle retiré : " : "Rôle ajouté : ") + role.name);
    if (window.KalyFluxerMemberListFix && typeof window.KalyFluxerMemberListFix.refresh === "function") {
      window.KalyFluxerMemberListFix.refresh();
    }
    return true;
  }

  function debugUser(member) {
    closeMenu();
    console.log("[KalyContextMenu] Utilisateur de débogage", member.userRaw || member);
    if (window.KalyFluxerMemberListFix && typeof window.KalyFluxerMemberListFix.dump === "function") {
      console.log("[KalyContextMenu] dump", window.KalyFluxerMemberListFix.dump(member.displayName || member.id));
    }
    return true;
  }

  function debugMember(member) {
    closeMenu();
    console.log("[KalyContextMenu] Membre de débogage", member.raw || member);
    return true;
  }

  function itemHtml(action, label, icon, danger, disabled, extraClass) {
    return '<button class="kcm-item ' + (danger ? 'kcm-item-danger ' : '') + escapeHtml(extraClass || '') + '" type="button" data-kcm-action="' + escapeHtml(action) + '"' + (disabled ? ' disabled' : '') + '>' +
      '<span class="kcm-label">' + escapeHtml(label) + '</span>' +
      '<span class="kcm-icon">' + icon + '</span>' +
      '</button>';
  }

  function roleSubmenuHtml(member) {
    var roles = getRoles().filter(function (role) {
      var name = text(role.name).toLowerCase();
      return role.id && name !== "everyone" && name !== "@everyone";
    });

    if (!roles.length) {
      return '<div class="kcm-submenu" data-kcm-submenu="roles"><div class="kcm-note">Aucun rôle détecté.</div></div>';
    }

    roles.sort(function (a, b) {
      return Number(a.order || a.position || a.apiIndex || 999999) - Number(b.order || b.position || b.apiIndex || 999999);
    });

    return '<div class="kcm-submenu" data-kcm-submenu="roles">' + roles.map(function (role) {
      var hasRole = Array.isArray(member.roles) && member.roles.indexOf(role.id) !== -1;
      var color = role.color || "var(--text-muted,#80848e)";
      return '<button class="kcm-item kcm-role-item" type="button" data-kcm-role-id="' + escapeHtml(role.id) + '">' +
        '<span class="kcm-role-dot" style="background:' + escapeHtml(color) + '"></span>' +
        '<span class="kcm-label">' + escapeHtml(role.name || role.id) + '</span>' +
        '<span class="kcm-check">' + (hasRole ? '✓' : '') + '</span>' +
        '</button>';
    }).join("") + '</div>';
  }

  function menuHtml(member) {
    var self = isSelf(member);
    var devGroup = localStorage.getItem("kaly_fluxer_context_debug") === "0" ? "" :
      '<div class="kcm-group">' +
      itemHtml("debug-user", "Utilisateur de débogage", "🐞", false, false) +
      itemHtml("debug-member", "Membre de débogage", "🐞", false, false) +
      '</div>';

    var moderationGroup = self ? "" :
      '<div class="kcm-group">' +
      itemHtml("kick", "Expulser un membre", "🥾", true, false) +
      itemHtml("ban", "Bannir un membre", "⚒", true, false) +
      '</div>';

    return '' +
      '<div class="kcm-group">' +
      itemHtml("profile", "Afficher le profil", "👤", false, false) +
      itemHtml("mention", "Mention", "@", false, false) +
      itemHtml("message", self ? "Message" : "Message", "●", false, self) +
      itemHtml("note", "Ajouter une note", "▣", false, self) +
      '</div>' +
      '<div class="kcm-group">' +
      itemHtml("nickname", "Changer de surnom", "◆", false, false) +
      (self ? "" : itemHtml("block", "Bloquer", "⊘", true, false)) +
      '</div>' +
      moderationGroup +
      '<div class="kcm-group">' +
      itemHtml("roles", "Rôles", "›", false, false, "kcm-roles-trigger") +
      '</div>' +
      devGroup +
      '<div class="kcm-group">' +
      itemHtml("copy-id", "Copier l’ID de l’utilisateur", "✣", false, false) +
      '</div>' +
      roleSubmenuHtml(member);
  }

  function getRoleById(id) {
    var roles = getRoles();
    for (var i = 0; i < roles.length; i += 1) {
      if (text(roles[i].id) === text(id)) return roles[i];
    }
    return null;
  }

  async function runAction(action, member) {
    lastAction = action;
    lastError = null;

    try {
      if (action === "profile") return openProfile(member);
      if (action === "mention") return mentionUser(member);
      if (action === "message") return openDm(member);
      if (action === "note") return addNote(member);
      if (action === "nickname") return changeNickname(member);
      if (action === "block") return blockUser(member);
      if (action === "kick") return kickMember(member);
      if (action === "ban") return banMember(member);
      if (action === "debug-user") return debugUser(member);
      if (action === "debug-member") return debugMember(member);
      if (action === "copy-id") {
        await copyText(member.id);
        showToast("ID copié : " + member.id);
        return true;
      }
    } catch (error) {
      lastError = error;
      console.error("[KalyContextMenu] action KO", action, error);
      showToast(error && error.message ? error.message : String(error), true);
      return false;
    }

    return false;
  }

  function showRolesSubmenu(menu, trigger) {
    var submenu = menu.querySelector('[data-kcm-submenu="roles"]');
    if (!submenu || !trigger) return;

    Array.prototype.slice.call(menu.querySelectorAll(".kcm-submenu")).forEach(function (el) {
      el.removeAttribute("data-visible");
    });
    Array.prototype.slice.call(menu.querySelectorAll(".kcm-item[data-open]")).forEach(function (el) {
      el.removeAttribute("data-open");
    });

    trigger.setAttribute("data-open", "1");
    submenu.setAttribute("data-visible", "1");

    var menuRect = menu.getBoundingClientRect();
    var triggerRect = trigger.getBoundingClientRect();
    var subRect = submenu.getBoundingClientRect();
    var left = menuRect.right + 6;
    var top = triggerRect.top;

    if (left + subRect.width > window.innerWidth - 6) left = menuRect.left - subRect.width - 6;
    if (top + subRect.height > window.innerHeight - 6) top = window.innerHeight - subRect.height - 6;
    top = Math.max(6, top);

    submenu.style.left = Math.round(left - menuRect.left) + "px";
    submenu.style.top = Math.round(top - menuRect.top) + "px";
  }

  function stopMenuScrollLeak(event) {
    var menu = document.getElementById(MENU_ID);
    if (!menu || !event || !event.target || !menu.contains(event.target)) return;

    var submenu = event.target.closest ? event.target.closest(".kcm-submenu") : null;

    if (submenu && menu.contains(submenu)) {
      var maxScroll = Math.max(0, submenu.scrollHeight - submenu.clientHeight);

      if (maxScroll > 0) {
        var deltaY = Number(event.deltaY || 0);
        var atTop = submenu.scrollTop <= 0;
        var atBottom = submenu.scrollTop >= maxScroll - 1;

        if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
          event.preventDefault();
        }

        event.stopPropagation();
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function stopMenuTouchLeak(event) {
    var menu = document.getElementById(MENU_ID);
    if (!menu || !event || !event.target || !menu.contains(event.target)) return;

    var submenu = event.target.closest ? event.target.closest(".kcm-submenu") : null;

    if (submenu && menu.contains(submenu) && submenu.scrollHeight > submenu.clientHeight) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }


  function visibleRect(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) return null;
    return rect;
  }

  function getNativeMemberButton(member) {
    try {
      if (
        window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__ &&
        typeof window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__.findNative === "function"
      ) {
        var found = window.__KALY_NATIVE_PROFILE_CLICK_BRIDGE__.findNative(member.id || member.displayName || member.username);
        if (found && found.button) return found.button;
      }
    } catch (errorFind) {}

    return null;
  }

  function dispatchNativeContextMenu(target, x, y) {
    if (!target) return false;

    try {
      var rect = visibleRect(target) || { left: x || 20, top: y || 20, width: 24, height: 24 };
      var cx = x || rect.left + Math.max(2, Math.min(rect.width / 2, rect.width - 2));
      var cy = y || rect.top + Math.max(2, Math.min(rect.height / 2, rect.height - 2));
      var base = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: cx,
        clientY: cy,
        button: 2,
        buttons: 2
      };

      target.dispatchEvent(new PointerEvent("pointerover", base));
      target.dispatchEvent(new MouseEvent("mouseover", base));
      target.dispatchEvent(new PointerEvent("pointerdown", base));
      target.dispatchEvent(new MouseEvent("mousedown", base));
      target.dispatchEvent(new MouseEvent("contextmenu", base));
      target.dispatchEvent(new PointerEvent("pointerup", Object.assign({}, base, { buttons: 0 })));
      target.dispatchEvent(new MouseEvent("mouseup", Object.assign({}, base, { buttons: 0 })));
      return true;
    } catch (error) {
      try {
        target.dispatchEvent(new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          clientX: x || 20,
          clientY: y || 20,
          button: 2,
          buttons: 2
        }));
        return true;
      } catch (errorFallback) {
        return false;
      }
    }
  }

  function isProbablyNativeContextMenuOpen() {
    var candidates = [];
    try {
      candidates = Array.prototype.slice.call(document.querySelectorAll('[role="menu"], [class*="ContextMenu"], [class*="contextMenu"], [class*="MenuGroup"], [class*="MenuItem"]'));
    } catch (error) {
      candidates = [];
    }

    return candidates.some(function (node) {
      if (!node || node.id === MENU_ID || (node.closest && node.closest("#" + MENU_ID))) return false;
      if (!visibleRect(node)) return false;
      var content = text(node.textContent);
      return /Afficher le profil|View Profile|Mention|Message|Ajouter une note|Add Note|Changer de surnom|Rôles|Roles|Copier l.ID|Copy User ID/i.test(content);
    });
  }

  function openNativeContextMenu(member, x, y) {
    return new Promise(function (resolve) {
      var button = getNativeMemberButton(member);
      if (!button) {
        resolve(false);
        return;
      }

      closeMenu();

      try {
        button.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (errorScroll) {}

      var target = button;
      try {
        target = button.querySelector('[class*="BaseAvatar"]') || button;
      } catch (errorQuery) {
        target = button;
      }

      var sent = dispatchNativeContextMenu(target, x, y);
      if (!sent) {
        resolve(false);
        return;
      }

      setTimeout(function () {
        resolve(isProbablyNativeContextMenuOpen());
      }, 280);
    });
  }

  function openMenu(member, x, y) {
    ensureStyle();
    closeMenu();
    lastMember = member;

    var menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.setAttribute("role", "menu");
    menu.setAttribute("data-kcm-member-id", member.id || "");
    menu.innerHTML = menuHtml(member);
    document.body.appendChild(menu);

    positionBox(menu, x, y);

    menu.addEventListener("wheel", stopMenuScrollLeak, { capture: true, passive: false, signal: controller.signal });
    menu.addEventListener("touchmove", stopMenuTouchLeak, { capture: true, passive: false, signal: controller.signal });
    menu.addEventListener("scroll", function (event) {
      if (event.target && menu.contains(event.target)) {
        event.stopPropagation();
      }
    }, { capture: true, signal: controller.signal });

    menu.addEventListener("click", function (event) {
      var roleButton = event.target && event.target.closest ? event.target.closest("[data-kcm-role-id]") : null;
      if (roleButton) {
        event.preventDefault();
        event.stopPropagation();
        var role = getRoleById(roleButton.getAttribute("data-kcm-role-id"));
        if (role) {
          toggleRole(member, role).then(function () {
            var fresh = findMember(member.id) || member;
            var submenu = menu.querySelector('[data-kcm-submenu="roles"]');
            if (submenu) submenu.outerHTML = roleSubmenuHtml(fresh);
            showRolesSubmenu(menu, menu.querySelector('[data-kcm-action="roles"]'));
          }).catch(function (error) {
            lastError = error;
            console.error("[KalyContextMenu] rôle KO", error);
            showToast(error && error.message ? error.message : String(error), true);
          });
        }
        return;
      }

      var item = event.target && event.target.closest ? event.target.closest("[data-kcm-action]") : null;
      if (!item || item.disabled) return;

      event.preventDefault();
      event.stopPropagation();

      var action = item.getAttribute("data-kcm-action") || "";
      if (action === "roles") {
        showRolesSubmenu(menu, item);
        return;
      }

      runAction(action, member);
    }, { signal: controller.signal });

    menu.addEventListener("mouseover", function (event) {
      var item = event.target && event.target.closest ? event.target.closest('[data-kcm-action="roles"]') : null;
      if (item) showRolesSubmenu(menu, item);
    }, { signal: controller.signal });
  }

  function onContextMenu(event) {
    var target = event.target;
    var button = target && target.closest ? target.closest("button.kml-member") : null;
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var member = memberFromButton(button);
    var x = event.clientX || 12;
    var y = event.clientY || 12;

    if (event.altKey) {
      openMenu(member, x, y);
      return;
    }

    openNativeContextMenu(member, x, y).then(function (openedNative) {
      if (!openedNative) openMenu(member, x, y);
    });
  }

  function onDocumentMouseDown(event) {
    var menu = document.getElementById(MENU_ID);
    if (!menu) return;
    if (menu.contains(event.target)) return;
    closeMenu();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") closeMenu();
  }

  function onWindowScroll(event) {
    var menu = document.getElementById(MENU_ID);

    if (menu && event && event.target && menu.contains(event.target)) {
      return;
    }

    closeMenu();
  }

  document.addEventListener("contextmenu", onContextMenu, { capture: true, signal: controller.signal });
  document.addEventListener("mousedown", onDocumentMouseDown, { capture: true, signal: controller.signal });
  window.addEventListener("keydown", onKeyDown, { signal: controller.signal });
  window.addEventListener("resize", closeMenu, { signal: controller.signal });
  window.addEventListener("scroll", onWindowScroll, { signal: controller.signal, capture: true });

  window.__KALY_MEMBER_CONTEXT_MENU__ = {
    version: VERSION,
    open: function (nameOrId, x, y) {
      var member = findMember(nameOrId);
      if (!member) return false;
      openMenu(member, x || window.innerWidth - 300, y || 120);
      return true;
    },
    close: closeMenu,
    dump: function () {
      return {
        version: VERSION,
        guildId: getGuildId(),
        channelId: getChannelId(),
        members: getMembers().length,
        roles: getRoles().length,
        lastMember: lastMember,
        lastAction: lastAction,
        lastError: lastError,
        apiBase: getApiBase()
      };
    },
    stop: function () {
      controller.abort();
      closeMenu();
      var style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      delete window.__KALY_MEMBER_CONTEXT_MENU__;
      console.log("[KalyContextMenu] stoppé");
    }
  };

  if (window.KalyFluxerMemberListFix) {
    window.KalyFluxerMemberListFix.openContextMenu = window.__KALY_MEMBER_CONTEXT_MENU__.open;
    window.KalyFluxerMemberListFix.dumpContextMenu = window.__KALY_MEMBER_CONTEXT_MENU__.dump;
  }

  console.log("[KalyContextMenu] clic droit membre actif", VERSION);
})();