const app = document.getElementById("app");
const grid = document.getElementById("vt-grid");
const statsEl = document.getElementById("vt-stats");
const searchInput = document.getElementById("vt-search-input");

const overlayOrigin = window.location.origin;
const placeholderUrl = chrome.runtime.getURL("assets/thumbnail-placeholder.svg");
const closeIconUrl = chrome.runtime.getURL("assets/icon-close.svg");

/** @type {Array<any>} */
let tabs = [];
let filteredTabs = [];
let selectedIndex = 0;
let lastSearch = "";
let settings = {};

function postToParent(type, payload = {}) {
  window.parent.postMessage({ type, payload }, "*");
}

function computeColumns() {
  const template = window.getComputedStyle(grid).getPropertyValue("grid-template-columns");
  if (!template) return 3;
  const cols = template.split(" ").filter(Boolean).length;
  return Math.max(cols, 1);
}

function renderStats() {
  const total = tabs.length;
  const visible = filteredTabs.length;
  const scopeText = settings.windowScope === "current" ? "current window" : "all windows";
  const sortLabel = settings.sortMode === "title" ? "title" : settings.sortMode === "index" ? "tab order" : "recent use";
  statsEl.textContent = `${visible} of ${total} tabs • Sorted by ${sortLabel} • Showing ${scopeText}`;
}

function createFaviconElement(tab) {
  const container = document.createElement("div");
  container.className = "vt-favicon";

  if (tab.favIconUrl && !tab.incognito) {
    const img = document.createElement("img");
    img.src = tab.favIconUrl;
    img.alt = "";
    img.loading = "lazy";
    container.appendChild(img);
  } else {
    container.textContent = "🗂️";
  }

  return container;
}

function createThumbnail(tab, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "vt-thumbnail";

  const badge = document.createElement("span");
  badge.className = "vt-tab-index";
  badge.textContent = `${index + 1}`;
  wrapper.appendChild(badge);

  if (tab.pinned) {
    const pinned = document.createElement("span");
    pinned.className = "vt-pinned";
    pinned.textContent = "Pinned";
    wrapper.appendChild(pinned);
  }

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  if (tab.screenshot) {
    img.src = tab.screenshot;
  } else {
    img.src = placeholderUrl;
    img.className = "vt-fallback";
  }
  wrapper.appendChild(img);

  return wrapper;
}

function createCloseButton(tabId) {
  const button = document.createElement("button");
  button.className = "vt-close";
  button.type = "button";
  button.title = "Close tab";
  button.setAttribute("data-tab-id", tabId);

  const svg = document.createElement("img");
  svg.src = closeIconUrl;
  svg.alt = "";
  button.appendChild(svg);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    postToParent("request-close-tab", { tabId });
  });

  return button;
}

function createCard(tab, position) {
  const card = document.createElement("div");
  card.className = "vt-card";
  card.setAttribute("role", "option");
  card.dataset.tabId = tab.id;
  card.dataset.windowId = tab.windowId;

  card.appendChild(createCloseButton(tab.id));
  card.appendChild(createThumbnail(tab, position));

  const info = document.createElement("div");
  info.className = "vt-card-info";
  info.appendChild(createFaviconElement(tab));

  const title = document.createElement("div");
  title.className = "vt-title";
  title.textContent = tab.title || "Untitled tab";
  info.appendChild(title);
  card.appendChild(info);

  if (tab.url) {
    const url = document.createElement("div");
    url.className = "vt-url";
    try {
      const parsed = new URL(tab.url);
      url.textContent = parsed.hostname + parsed.pathname.replace(/\/$/, "");
    } catch {
      url.textContent = tab.url;
    }
    card.appendChild(url);
  }

  const footer = document.createElement("div");
  footer.className = "vt-card-footer";
  footer.appendChild(document.createTextNode(tab.active ? "Active tab" : "Last used"));
  const meta = [];
  if (tab.incognito) meta.push("Incognito");
  if (tab.audible) meta.push("Audio");
  footer.appendChild(document.createTextNode(meta.join(" • ")));
  card.appendChild(footer);

  card.addEventListener("click", () => {
    selectIndex(filteredTabs.findIndex((t) => t.id === tab.id));
    confirmSelection();
  });

  return card;
}

function renderCards() {
  grid.innerHTML = "";
  if (!filteredTabs.length) {
    const empty = document.createElement("div");
    empty.className = "vt-empty";
    empty.textContent = lastSearch ? `No tabs match "${lastSearch}"` : "No tabs available.";
    grid.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  filteredTabs.forEach((tab, index) => {
    const card = createCard(tab, index);
    card.dataset.index = index;
    card.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
    if (index === selectedIndex) {
      card.dataset.active = "true";
    }
    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  highlightSelection();
}

function highlightSelection() {
  const cards = grid.querySelectorAll(".vt-card");
  cards.forEach((card, idx) => {
    const isSelected = idx === selectedIndex;
    card.dataset.active = String(isSelected);
    card.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
  const activeCard = cards[selectedIndex];
  if (activeCard) {
    activeCard.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function selectIndex(index) {
  if (!filteredTabs.length) return;
  const clamped = ((index % filteredTabs.length) + filteredTabs.length) % filteredTabs.length;
  selectedIndex = clamped;
  highlightSelection();
  const tab = filteredTabs[selectedIndex];
  if (tab) {
    postToParent("selection-changed", { tabId: tab.id, windowId: tab.windowId, index: selectedIndex });
  }
}

function filterTabs(search) {
  lastSearch = search.trim();
  if (!lastSearch) {
    filteredTabs = [...tabs];
  } else {
    const term = lastSearch.toLowerCase();
    filteredTabs = tabs.filter((tab) => {
      return (
        (tab.title && tab.title.toLowerCase().includes(term)) ||
        (tab.url && tab.url.toLowerCase().includes(term))
      );
    });
  }
  selectedIndex = Math.min(selectedIndex, filteredTabs.length - 1);
  if (selectedIndex < 0) selectedIndex = 0;
  renderCards();
  renderStats();
}

function moveSelection(step) {
  if (!filteredTabs.length) return;
  selectIndex(selectedIndex + step);
}

function moveSelectionGrid(delta) {
  const columns = computeColumns();
  moveSelection(delta * columns);
}

function confirmSelection() {
  if (!filteredTabs.length) return;
  const tab = filteredTabs[selectedIndex];
  if (tab) {
    postToParent("confirm-selection", { tabId: tab.id, windowId: tab.windowId });
  }
}

function handleKeyDown(event) {
  switch (event.key) {
    case "ArrowRight":
      event.preventDefault();
      moveSelection(1);
      break;
    case "ArrowLeft":
      event.preventDefault();
      moveSelection(-1);
      break;
    case "ArrowDown":
      event.preventDefault();
      moveSelectionGrid(1);
      break;
    case "ArrowUp":
      event.preventDefault();
      moveSelectionGrid(-1);
      break;
    case "Home":
      event.preventDefault();
      selectIndex(0);
      break;
    case "End":
      event.preventDefault();
      selectIndex(filteredTabs.length - 1);
      break;
    case "Enter":
      event.preventDefault();
      confirmSelection();
      break;
    case "Escape":
      event.preventDefault();
      postToParent("request-close-overlay");
      break;
    case "Delete":
    case "Backspace":
      event.preventDefault();
      if (filteredTabs[selectedIndex]) {
        postToParent("request-close-tab", { tabId: filteredTabs[selectedIndex].id });
      }
      break;
    default:
      break;
  }
}

function handleSearchInput(event) {
  const nextValue = event.target.value;
  filterTabs(nextValue);
  postToParent("search-term-changed", { value: nextValue });
}

function applyPayload(payload) {
  tabs = payload.tabs ?? [];
  settings = payload.settings ?? settings;
  filteredTabs = [...tabs];
  if (payload.selectedTabId) {
    const idx = filteredTabs.findIndex((tab) => tab.id === payload.selectedTabId);
    if (idx >= 0) {
      selectedIndex = idx;
    }
  } else {
    selectedIndex = 0;
  }
  renderCards();
  renderStats();
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  const { type, payload } = event.data ?? {};
  switch (type) {
    case "tabs-data":
      applyPayload(payload);
      if (payload.searchTerm != null) {
        searchInput.value = payload.searchTerm;
        filterTabs(payload.searchTerm);
      }
      break;
    case "highlight-index":
      if (typeof payload?.index === "number") {
        selectIndex(payload.index);
      } else if (typeof payload?.direction === "number") {
        moveSelection(payload.direction);
      }
      break;
    case "focus-search":
      searchInput.focus({ preventScroll: true });
      break;
    case "update-screenshot":
      if (payload?.tabId) {
        const tab = tabs.find((t) => t.id === payload.tabId);
        if (tab) {
          tab.screenshot = payload.screenshot;
          filterTabs(searchInput.value);
        }
      }
      break;
    default:
      break;
  }
});

searchInput.addEventListener("input", handleSearchInput);
app.addEventListener("keydown", handleKeyDown);

window.addEventListener("load", () => {
  app.focus({ preventScroll: true });
  postToParent("overlay-ready");
});

