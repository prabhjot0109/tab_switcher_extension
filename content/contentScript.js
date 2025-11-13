const OVERLAY_URL = chrome.runtime.getURL("overlay/overlay.html");
const OVERLAY_ORIGIN = new URL(OVERLAY_URL).origin;
const PLACEHOLDER_BODY_CLASS = "vt-switcher-active";

let overlayFrame = null;
 let overlayReady = false;
 let overlayVisible = false;
 let overlayHasData = false;
 let currentTabs = [];
 let currentSelectedTabId = null;
 let lastSearchTerm = "";
 let overlayMountPromise = null;
 let overlayReadyResolvers = [];
let altHeld = false;
let pendingCommit = false;

function waitForOverlayReady() {
  if (overlayReady) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    overlayReadyResolvers.push(resolve);
  });
}

function markOverlayReady() {
  overlayReady = true;
  if (overlayReadyResolvers.length) {
    overlayReadyResolvers.forEach((resolve) => resolve());
    overlayReadyResolvers = [];
  }
}

function injectOverlay() {
  if (overlayFrame) return overlayFrame;

  overlayFrame = document.createElement("iframe");
  overlayFrame.src = OVERLAY_URL;
  overlayFrame.setAttribute("aria-hidden", "true");
  overlayFrame.style.position = "fixed";
  overlayFrame.style.inset = "0";
  overlayFrame.style.border = "none";
  overlayFrame.style.width = "100vw";
  overlayFrame.style.height = "100vh";
  overlayFrame.style.zIndex = "2147483646";
  overlayFrame.style.display = "none";
  overlayFrame.style.background = "transparent";
  overlayFrame.className = "vt-overlay-frame";

  document.documentElement.appendChild(overlayFrame);
  return overlayFrame;
}

async function ensureOverlayInjected() {
  if (overlayMountPromise) return overlayMountPromise;
  overlayMountPromise = new Promise((resolve) => {
    const frame = injectOverlay();
    if (frame.contentWindow && frame.contentDocument?.readyState === "complete") {
      resolve(frame);
    } else {
      frame.addEventListener("load", () => resolve(frame), { once: true });
    }
  });
  return overlayMountPromise;
}

async function requestTabData() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "request-tab-data" });
    if (response?.tabs) {
      currentTabs = response.tabs;
      return { tabs: response.tabs, settings: response.settings };
    }
  } catch (error) {
    console.warn("Failed to request tab data", error);
  }
  return { tabs: [], settings: {} };
}

function postToOverlay(type, payload = {}) {
  if (!overlayFrame?.contentWindow) return;
  overlayFrame.contentWindow.postMessage({ type, payload }, OVERLAY_ORIGIN);
}

async function showOverlay({ focusSearch = false } = {}) {
  await ensureOverlayInjected();
  if (!overlayVisible) {
    overlayFrame.style.display = "block";
    overlayVisible = true;
    overlayHasData = false;
    document.documentElement.classList.add(PLACEHOLDER_BODY_CLASS);
    overlayFrame.contentWindow.focus();

    await waitForOverlayReady();

    const data = await requestTabData();
    currentTabs = data.tabs ?? [];
    if (currentTabs.length) {
      currentSelectedTabId = currentTabs[0].id;
      overlayHasData = true;
    } else {
      currentSelectedTabId = null;
      overlayHasData = false;
    }

    postToOverlay("tabs-data", {
      ...data,
      selectedTabId: currentSelectedTabId ?? undefined,
      searchTerm: lastSearchTerm
    });

    // If service worker was cold and returned empty, retry shortly.
    if (!overlayHasData) {
      setTimeout(async () => {
        try {
          const retry = await requestTabData();
          if (Array.isArray(retry?.tabs) && retry.tabs.length) {
            currentTabs = retry.tabs;
            currentSelectedTabId = currentTabs[0].id;
            overlayHasData = true;
            postToOverlay("tabs-data", {
              ...retry,
              selectedTabId: currentSelectedTabId,
              searchTerm: lastSearchTerm
            });
          }
        } catch {}
      }, 300);
    }
  }

  if (focusSearch) {
    postToOverlay("focus-search");
  }
}

function hideOverlay({ commitSelection } = { commitSelection: false }) {
  if (!overlayVisible) return;
  overlayVisible = false;
  overlayHasData = false;
  pendingCommit = false;
  altHeld = false;
  document.documentElement.classList.remove(PLACEHOLDER_BODY_CLASS);
  overlayFrame.style.display = "none";
  if (commitSelection && currentSelectedTabId != null) {
    activateTabById(currentSelectedTabId);
  }
}

async function handleShortcutCycling(event) {
  if (event.key.toLowerCase() !== "q" || !event.altKey) return false;
  event.preventDefault();
  event.stopPropagation();

  if (!overlayVisible) {
    await showOverlay();
  }

  if (!overlayHasData) {
    const data = await requestTabData();
    currentTabs = data.tabs ?? [];
    overlayHasData = currentTabs.length > 0;
    currentSelectedTabId = currentTabs.length ? currentTabs[0].id : null;
    postToOverlay("tabs-data", {
      ...data,
      selectedTabId: currentSelectedTabId ?? undefined,
      searchTerm: lastSearchTerm
    });
    if (!overlayHasData) {
      return true;
    }
  }

  const direction = event.shiftKey ? -1 : 1;
  postToOverlay("highlight-index", { direction });
  pendingCommit = !altHeld;
  return true;
}

function activateTab(tab) {
  if (!tab) return;
  const tabId = tab.id ?? tab.tabId;
  const windowId = tab.windowId;
  activateTabById(tabId, windowId);
}

function closeTab(tabId) {
  chrome.runtime.sendMessage({ type: "close-tab", tabId });
}

function activateTabById(tabId, windowId) {
  if (tabId == null) return;
  chrome.runtime.sendMessage({
    type: "activate-tab",
    tabId,
    windowId
  });
}

function listenForKeyEvents() {
  window.addEventListener(
    "keydown",
    async (event) => {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.key === "Alt") {
        altHeld = true;
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === "q" && event.altKey) {
        await handleShortcutCycling(event);
      } else if (overlayVisible && event.key === "Escape") {
        event.preventDefault();
        hideOverlay({ commitSelection: false });
      }
    },
    true
  );

  window.addEventListener(
    "keyup",
    (event) => {
      if (event.key === "Alt") {
        altHeld = false;
        if (!overlayVisible) return;
        if (overlayHasData) {
          hideOverlay({ commitSelection: true });
        } else {
          hideOverlay({ commitSelection: false });
        }
        return;
      }
    },
    true
  );
}

function handleOverlayMessage(event) {
  if (event.origin !== OVERLAY_ORIGIN) return;
  if (event.source !== overlayFrame?.contentWindow) return;

  const { type, payload } = event.data ?? {};

  switch (type) {
    case "overlay-ready": {
      markOverlayReady();
      break;
    }
    case "selection-changed": {
      if (typeof payload?.tabId === "number") {
        currentSelectedTabId = payload.tabId;
        overlayHasData = true;
        chrome.runtime.sendMessage({ type: "mark-tab-visited", tabId: payload.tabId });
        if (pendingCommit && !altHeld) {
          pendingCommit = false;
          hideOverlay({ commitSelection: true });
        }
      }
      break;
    }
    case "confirm-selection": {
      if (payload?.tabId != null) {
        hideOverlay({ commitSelection: false });
        activateTab(payload);
      }
      break;
    }
    case "request-close-overlay": {
      hideOverlay({ commitSelection: false });
      break;
    }
    case "request-close-tab": {
      if (typeof payload?.tabId === "number") {
        closeTab(payload.tabId);
      }
      break;
    }
    case "search-term-changed": {
      if (typeof payload?.value === "string") {
        lastSearchTerm = payload.value;
      }
      break;
    }
    default:
      break;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "show-overlay") {
    showOverlay();
  } else if (message?.type === "toggle-overlay-focus-search") {
    showOverlay({ focusSearch: true });
  }
});

window.addEventListener("message", handleOverlayMessage);

listenForKeyEvents();

// Lazy inject overlay so we have it ready when needed.
ensureOverlayInjected();

