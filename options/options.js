const DEFAULT_SETTINGS = {
  windowScope: "all",
  sortMode: "recent",
  showSearch: true,
  showCloseButtons: true,
  thumbnailQuality: 60,
  cacheExpirationMs: 5 * 60 * 1000
};

const elements = {};

function $(id) {
  return document.getElementById(id);
}

function cacheElements() {
  elements.windowScope = $("windowScope");
  elements.sortMode = $("sortMode");
  elements.showSearch = $("showSearch");
  elements.showCloseButtons = $("showCloseButtons");
  elements.thumbnailQuality = $("thumbnailQuality");
  elements.qualityValue = $("qualityValue");
  elements.cacheExpiration = $("cacheExpiration");
  elements.clearCache = $("clearCache");
  elements.clearStatus = $("clearStatus");
  elements.openShortcuts = $("openShortcuts");
  elements.resetDefaults = $("resetDefaults");
  elements.status = $("status");
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };

  elements.windowScope.value = settings.windowScope;
  elements.sortMode.value = settings.sortMode;
  elements.showSearch.checked = settings.showSearch;
  elements.showCloseButtons.checked = settings.showCloseButtons;
  elements.thumbnailQuality.value = settings.thumbnailQuality;
  elements.qualityValue.textContent = settings.thumbnailQuality;
  elements.cacheExpiration.value = String(settings.cacheExpirationMs);
}

function readSettingsFromForm() {
  return {
    windowScope: elements.windowScope.value,
    sortMode: elements.sortMode.value,
    showSearch: elements.showSearch.checked,
    showCloseButtons: elements.showCloseButtons.checked,
    thumbnailQuality: Number(elements.thumbnailQuality.value),
    cacheExpirationMs: Number(elements.cacheExpiration.value)
  };
}

let saveTimeout;

function queueStatusMessage(message, target = elements.status) {
  target.textContent = message;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    target.textContent = "";
  }, 2500);
}

async function saveSettings() {
  const settings = readSettingsFromForm();
  await chrome.storage.sync.set(settings);
  chrome.runtime.sendMessage({ type: "refresh-settings" });
  queueStatusMessage("Saved");
}

function bindEvents() {
  [
    elements.windowScope,
    elements.sortMode,
    elements.showSearch,
    elements.showCloseButtons,
    elements.thumbnailQuality,
    elements.cacheExpiration
  ].forEach((el) => {
    el.addEventListener("change", () => {
      if (el === elements.thumbnailQuality) {
        elements.qualityValue.textContent = el.value;
      }
      saveSettings();
    });
  });

  elements.thumbnailQuality.addEventListener("input", () => {
    elements.qualityValue.textContent = elements.thumbnailQuality.value;
  });

  elements.clearCache.addEventListener("click", async () => {
    elements.clearStatus.textContent = "Clearing…";
    try {
      await chrome.runtime.sendMessage({ type: "clear-cache" });
      queueStatusMessage("Thumbnail cache cleared", elements.clearStatus);
    } catch (error) {
      queueStatusMessage("Failed to clear cache", elements.clearStatus);
      console.error(error);
    }
  });

  elements.openShortcuts.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });

  elements.resetDefaults.addEventListener("click", async () => {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    await loadSettings();
    chrome.runtime.sendMessage({ type: "refresh-settings" });
    queueStatusMessage("Default settings restored");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  await loadSettings();
  bindEvents();
});

