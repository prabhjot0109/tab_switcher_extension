const DEFAULT_SETTINGS = {
  windowScope: "all",
  sortMode: "recent",
  thumbnailQuality: 60,
  cacheExpirationMs: 5 * 60 * 1000,
  showSearch: true,
  showCloseButtons: true,
  includePinned: true
};

const TAB_CACHE = new Map();
const WINDOW_CAPTURE_COOLDOWNS = new Map();
let settings = { ...DEFAULT_SETTINGS };

function pruneCache() {
  const now = Date.now();
  for (const [tabId, entry] of TAB_CACHE.entries()) {
    if (!entry) continue;
    const { lastUpdated } = entry;
    if (lastUpdated && now - lastUpdated > settings.cacheExpirationMs) {
      TAB_CACHE.delete(tabId);
    }
  }
}

function clearCache() {
  TAB_CACHE.clear();
  WINDOW_CAPTURE_COOLDOWNS.clear();
}

async function loadSettings() {
  const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  settings = { ...DEFAULT_SETTINGS, ...data };
  pruneCache();
}

loadSettings();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  let needsPrune = false;
  for (const key of Object.keys(changes)) {
    settings[key] = changes[key].newValue ?? DEFAULT_SETTINGS[key];
    if (key === "cacheExpirationMs") {
      needsPrune = true;
    }
  }
  if (needsPrune) {
    pruneCache();
  }
});

const RECENT_ORDER = [];

function touchTab(tabId) {
  const index = RECENT_ORDER.indexOf(tabId);
  if (index !== -1) {
    RECENT_ORDER.splice(index, 1);
  }
  RECENT_ORDER.unshift(tabId);
  if (RECENT_ORDER.length > 100) {
    RECENT_ORDER.length = 100;
  }
}

function removeTab(tabId) {
  TAB_CACHE.delete(tabId);
  const index = RECENT_ORDER.indexOf(tabId);
  if (index !== -1) {
    RECENT_ORDER.splice(index, 1);
  }
}

async function captureActiveTabPreview(windowId, tabId) {
  const now = Date.now();
  const last = WINDOW_CAPTURE_COOLDOWNS.get(windowId) ?? 0;
  if (now - last < 1000) return;

  WINDOW_CAPTURE_COOLDOWNS.set(windowId, now);
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: settings.thumbnailQuality
    });
    if (dataUrl) {
      const entry = TAB_CACHE.get(tabId) ?? {};
      TAB_CACHE.set(tabId, {
        ...entry,
        screenshot: dataUrl,
        lastUpdated: Date.now()
      });
    }
  } catch (error) {
    console.warn("captureVisibleTab failed", error);
  }
}

async function refreshTabInfo(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) return;
    const entry = TAB_CACHE.get(tabId) ?? {};
    TAB_CACHE.set(tabId, {
      ...entry,
      tabId: tab.id,
      windowId: tab.windowId,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned,
      audible: tab.audible,
      mutedInfo: tab.mutedInfo,
      incognito: tab.incognito,
      status: tab.status,
      groupId: tab.groupId,
      lastActivated: entry.lastActivated ?? Date.now()
    });
  } catch (error) {
    // Ignore missing tab errors.
  }
}

async function collectTabsPayload(activeTabId) {
  const queryOptions =
    settings.windowScope === "current"
      ? { currentWindow: true }
      : {};

  let tabs = [];
  try {
    tabs = await chrome.tabs.query(queryOptions);
  } catch (error) {
    console.warn("tabs.query failed", error);
    // Fail soft: return empty dataset so UI still updates
    tabs = [];
  }
  const now = Date.now();
  const payload = tabs.map((tab) => {
    const cached = TAB_CACHE.get(tab.id) ?? {};
    const lastActivated = cached.lastActivated ?? now - 1;
    return {
      id: tab.id,
      windowId: tab.windowId,
      active: tab.active,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned,
      incognito: tab.incognito,
      audible: tab.audible,
      muted: tab.mutedInfo?.muted,
      index: tab.index,
      groupId: tab.groupId,
      screenshot: cached.screenshot ?? null,
      screenshotAge: cached.lastUpdated ? now - cached.lastUpdated : null,
      lastActivated
    };
  });

  payload.sort((a, b) => {
    if (settings.sortMode === "recent") {
      const aIndex = RECENT_ORDER.indexOf(a.id);
      const bIndex = RECENT_ORDER.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) {
        return b.index - a.index;
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    if (settings.sortMode === "index") {
      return a.index - b.index;
    }
    if (settings.sortMode === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  if (activeTabId) {
    const activeIndex = payload.findIndex((tab) => tab.id === activeTabId);
    if (activeIndex > 0) {
      const [activeTab] = payload.splice(activeIndex, 1);
      payload.unshift(activeTab);
    }
  }

  return payload;
}

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  touchTab(tabId);
  const entry = TAB_CACHE.get(tabId) ?? {};
  TAB_CACHE.set(tabId, {
    ...entry,
    lastActivated: Date.now()
  });
  await refreshTabInfo(tabId);
  await captureActiveTabPreview(windowId, tabId);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  touchTab(tab.id);
  await refreshTabInfo(tab.id);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.title || changeInfo.favIconUrl) {
    await refreshTabInfo(tabId);
  }
});

chrome.tabs.onMoved.addListener(async (tabId) => {
  await refreshTabInfo(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  removeTab(tabId);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-tab-switcher") return;
  await showOverlayForActiveTab();
});

async function showOverlayForActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    await refreshTabInfo(tab.id);
    chrome.tabs.sendMessage(tab.id, { type: "show-overlay" }).catch(() => {
      // The content script may not be injected (e.g. chrome:// pages)
    });
  } catch (error) {
    console.warn("showOverlayForActiveTab error", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case "request-tab-data": {
      (async () => {
        try {
          const activeTabId = sender?.tab?.id;
          const tabs = await collectTabsPayload(activeTabId);
          sendResponse({ tabs, settings });
        } catch (error) {
          console.warn("request-tab-data failed", error);
          sendResponse({ tabs: [], settings });
        }
      })();
      return true;
    }
    case "activate-tab": {
      const { tabId, windowId } = message;
      if (typeof tabId === "number") {
        chrome.tabs.update(tabId, { active: true });
        if (windowId != null) {
          chrome.windows.update(windowId, { focused: true });
        }
      }
      break;
    }
    case "close-tab": {
      const { tabId } = message;
      if (typeof tabId === "number") {
        chrome.tabs.remove(tabId);
      }
      break;
    }
    case "request-latest-screenshot": {
      const { tabId, windowId } = message;
      if (typeof tabId === "number" && typeof windowId === "number") {
        captureActiveTabPreview(windowId, tabId).then(() => {
          const cached = TAB_CACHE.get(tabId);
          if (cached?.screenshot) {
            sendResponse({ screenshot: cached.screenshot });
          } else {
            sendResponse({ screenshot: null });
          }
        });
        return true;
      }
      break;
    }
    case "mark-tab-visited": {
      const { tabId } = message;
      if (typeof tabId === "number") {
        touchTab(tabId);
        const entry = TAB_CACHE.get(tabId) ?? {};
        TAB_CACHE.set(tabId, {
          ...entry,
          lastActivated: Date.now()
        });
      }
      break;
    }
    case "refresh-settings": {
      loadSettings();
      break;
    }
    case "clear-cache": {
      clearCache();
      sendResponse?.({ success: true });
      return false;
    }
    default:
      break;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  loadSettings();
});

setInterval(pruneCache, 60 * 1000);

