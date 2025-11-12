const PREVIEW_PREFIX = "tabPreview:";
const MAX_CACHE_ITEMS = 120;
const CAPTURE_MIN_INTERVAL = 1500;
const CAPTURE_DELAY = 250;

const previewCache = new Map();
const captureTimers = new Map();
const captureTimestamps = new Map();
const overlayState = new Map();

hydratePreviewCache();

chrome.runtime.onInstalled.addListener(() => {
  hydratePreviewCache();
});

chrome.commands.onCommand.addListener(handleCommand);
chrome.runtime.onMessage.addListener(handleRuntimeMessage);
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  queueCapture(tabId, windowId, "activated");
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active || tab.status !== "complete") {
    return;
  }
  queueCapture(tabId, tab.windowId, "updated");
});
chrome.tabs.onRemoved.addListener((tabId) => {
  previewCache.delete(tabId);
  captureTimers.delete(tabId);
  captureTimestamps.delete(tabId);
  removeSessionEntry(tabId);
});
chrome.windows.onRemoved.addListener((windowId) => {
  overlayState.delete(windowId);
});

function handleCommand(command) {
  if (command !== "tab-switcher-toggle") {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs?.[0];
    if (!activeTab) {
      return;
    }

    queueCapture(activeTab.id, activeTab.windowId, "command");

    const state = overlayState.get(activeTab.windowId);
    if (state?.isOpen) {
      try {
        await chrome.tabs.sendMessage(activeTab.id, {
          type: "tab-switcher/cycle",
          payload: { direction: "next" }
        });
      } catch (error) {
        if (!shouldIgnoreMessagingError(error)) {
          console.warn("Failed to send cycle message", error);
        }
      }
      return;
    }

    const tabsPayload = await buildTabPayload(activeTab.windowId);
    overlayState.set(activeTab.windowId, {
      isOpen: true,
      selectedTabId: activeTab.id
    });

    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        type: "tab-switcher/open",
        payload: {
          windowId: activeTab.windowId,
          tabs: tabsPayload,
          initialTabId: state?.selectedTabId ?? activeTab.id
        }
      });
    } catch (error) {
      if (!shouldIgnoreMessagingError(error)) {
        console.warn("Failed to open overlay", error);
      }
      overlayState.set(activeTab.windowId, {
        isOpen: false,
        selectedTabId: activeTab.id
      });
    }
  });
}

function handleRuntimeMessage(message, sender, sendResponse) {
  if (!message || typeof message !== "object" || !message.type?.startsWith("tab-switcher/")) {
    return false;
  }

  const { type, payload } = message;

  switch (type) {
    case "tab-switcher/request-tabs": {
      const windowId = payload?.windowId ?? sender?.tab?.windowId;
      if (windowId == null) {
        sendResponse({ tabs: [] });
        return false;
      }
      buildTabPayload(windowId)
        .then((tabs) => sendResponse({ tabs }))
        .catch((error) => {
          console.warn("Failed to build tab payload", error);
          sendResponse({ tabs: [] });
        });
      return true;
    }
    case "tab-switcher/selection-changed": {
      const { windowId, tabId } = payload ?? {};
      if (windowId != null && tabId != null) {
        const state = overlayState.get(windowId) ?? { isOpen: true };
        overlayState.set(windowId, { ...state, selectedTabId: tabId, isOpen: true });
      }
      break;
    }
    case "tab-switcher/activate-tab": {
      const { tabId, windowId } = payload ?? {};
      if (tabId != null) {
        chrome.tabs.update(tabId, { active: true }).catch(() => {});
      }
      if (windowId != null) {
        chrome.windows.update(windowId, { focused: true }).catch(() => {});
        overlayState.set(windowId, { isOpen: false, selectedTabId: tabId ?? null });
      }
      break;
    }
    case "tab-switcher/close": {
      const { windowId, lastSelectedTabId } = payload ?? {};
      if (windowId != null) {
        overlayState.set(windowId, {
          isOpen: false,
          selectedTabId: lastSelectedTabId ?? overlayState.get(windowId)?.selectedTabId ?? null
        });
      }
      break;
    }
    case "tab-switcher/close-tab": {
      const { tabId } = payload ?? {};
      if (tabId != null) {
        chrome.tabs.remove(tabId).catch(() => {});
      }
      break;
    }
    default:
      break;
  }

  return false;
}

async function buildTabPayload(windowId) {
  const tabs = await chrome.tabs.query({ windowId });
  tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));

  return tabs.map((tab, index) => ({
    id: tab.id,
    windowId: tab.windowId,
    title: tab.title,
    url: tab.url,
    favIconUrl: tab.favIconUrl,
    pinned: tab.pinned,
    active: tab.active,
    index: tab.index,
    lastAccessed: tab.lastAccessed ?? 0,
    audible: Boolean(tab.audible),
    muted: Boolean(tab.mutedInfo?.muted),
    incognito: Boolean(tab.incognito),
    preview: getPreviewForTab(tab.id),
    position: index + 1
  }));
}

function queueCapture(tabId, windowId, reason) {
  if (tabId == null || windowId == null) {
    return;
  }

  const lastCapture = captureTimestamps.get(tabId) ?? 0;
  if (Date.now() - lastCapture < CAPTURE_MIN_INTERVAL) {
    return;
  }

  if (captureTimers.has(tabId)) {
    return;
  }

  const timerId = setTimeout(async () => {
    captureTimers.delete(tabId);
    await captureActiveTab(tabId, windowId, reason);
  }, CAPTURE_DELAY);

  captureTimers.set(tabId, timerId);
}

async function captureActiveTab(tabId, windowId, reason) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || tab.incognito || !tab.active) {
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 60
    });

    if (!dataUrl) {
      return;
    }

    const entry = {
      dataUrl,
      capturedAt: Date.now(),
      reason
    };

    previewCache.set(tabId, entry);
    captureTimestamps.set(tabId, entry.capturedAt);
    pruneCache();

    if (chrome.storage?.session) {
      await chrome.storage.session.set({
        [PREVIEW_PREFIX + tabId]: entry
      });
    }
  } catch (error) {
    if (!shouldIgnoreCaptureError(error)) {
      console.warn("Failed to capture tab preview", error);
    }
  }
}

function pruneCache() {
  if (previewCache.size <= MAX_CACHE_ITEMS) {
    return;
  }

  const ordered = [...previewCache.entries()].sort((a, b) => (a[1].capturedAt ?? 0) - (b[1].capturedAt ?? 0));
  while (previewCache.size > MAX_CACHE_ITEMS && ordered.length) {
    const [tabId] = ordered.shift();
    previewCache.delete(tabId);
    captureTimestamps.delete(tabId);
    removeSessionEntry(tabId);
  }
}

function getPreviewForTab(tabId) {
  return previewCache.get(tabId)?.dataUrl ?? null;
}

async function hydratePreviewCache() {
  if (!chrome.storage?.session) {
    return;
  }

  try {
    const all = await chrome.storage.session.get(null);
    Object.entries(all).forEach(([key, value]) => {
      if (!key.startsWith(PREVIEW_PREFIX) || !value?.dataUrl) {
        return;
      }
      const tabId = Number(key.replace(PREVIEW_PREFIX, ""));
      if (Number.isNaN(tabId)) {
        return;
      }
      previewCache.set(tabId, value);
      captureTimestamps.set(tabId, value.capturedAt ?? Date.now());
    });
  } catch (error) {
    console.warn("Failed to hydrate preview cache", error);
  }
}

function removeSessionEntry(tabId) {
  if (!chrome.storage?.session) {
    return;
  }
  chrome.storage.session.remove(PREVIEW_PREFIX + tabId).catch(() => {});
}

function shouldIgnoreCaptureError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("permission") ||
    message.includes("active tab is not captured") ||
    message.includes("visible tab capture is only supported")
  );
}

function shouldIgnoreMessagingError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return message.includes("receiving end does not exist") || message.includes("could not establish connection");
}
