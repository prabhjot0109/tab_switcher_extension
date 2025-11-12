(() => {
  if (window.__visualTabSwitcherInjected) {
    return;
  }
  window.__visualTabSwitcherInjected = true;

  const state = {
    isOpen: false,
    windowId: null,
    tabs: [],
    filteredTabs: [],
    selectedIndex: 0,
    searchTerm: "",
    ctrlKeyDown: false
  };

  const host = document.createElement("div");
  host.id = "visual-tab-switcher-host";
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      contain: layout style;
    }
    .vts-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 12, 0.6);
      backdrop-filter: blur(6px);
      color: #f5f5f5;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    .vts-backdrop[data-visible="true"] {
      display: flex;
    }
    .vts-container {
      width: min(95vw, 1120px);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: rgba(18, 18, 22, 0.96);
      border-radius: 16px;
      padding: 20px 24px 28px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .vts-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .vts-search {
      flex: 1;
      min-width: 0;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      padding: 10px 16px;
      background: rgba(32, 32, 38, 0.96);
      color: inherit;
      font-size: 14px;
      line-height: 20px;
      outline: none;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .vts-search:focus {
      border-color: rgba(102, 166, 255, 0.85);
      background: rgba(42, 42, 50, 0.98);
    }
    .vts-meta {
      font-size: 13px;
      opacity: 0.7;
    }
    .vts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 18px;
      overflow-y: auto;
      padding-right: 6px;
      padding-bottom: 4px;
    }
    .vts-grid::-webkit-scrollbar {
      width: 8px;
    }
    .vts-grid::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 999px;
    }
    .vts-card {
      position: relative;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      border: 2px solid transparent;
      background: rgba(32, 32, 38, 0.92);
      cursor: pointer;
      transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
      min-height: 165px;
    }
    .vts-card:hover {
      transform: translateY(-2px);
      background: rgba(40, 40, 48, 0.96);
    }
    .vts-card[data-selected="true"] {
      border-color: rgba(102, 166, 255, 0.9);
      box-shadow: 0 0 0 2px rgba(102, 166, 255, 0.3);
    }
    .vts-card-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 12px 16px 16px;
      gap: 12px;
    }
    .vts-preview {
      position: relative;
      border-radius: 10px;
      background: rgba(18, 18, 22, 0.8);
      overflow: hidden;
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.35);
      font-size: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .vts-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .vts-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .vts-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #f5f5f5;
      line-height: 1.4;
    }
    .vts-favicon {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.12);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .vts-favicon img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .vts-fallback-favicon {
      font-size: 10px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }
    .vts-url {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vts-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.65);
    }
    .vts-badge {
      padding: 3px 6px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .vts-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(20, 20, 24, 0.9);
      color: #f5f5f5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .vts-card:hover .vts-close {
      opacity: 1;
    }
    .vts-empty {
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .vts-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.45);
    }
    .vts-shortcuts {
      display: flex;
      gap: 12px;
    }
    .vts-shortcut {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .vts-key {
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
  `;

  const backdrop = document.createElement("div");
  backdrop.className = "vts-backdrop";

  const container = document.createElement("div");
  container.className = "vts-container";

  const header = document.createElement("div");
  header.className = "vts-header";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "vts-search";
  searchInput.placeholder = "Search tabs...";
  searchInput.setAttribute("aria-label", "Filter tabs");

  const meta = document.createElement("div");
  meta.className = "vts-meta";

  header.append(searchInput, meta);

  const grid = document.createElement("div");
  grid.className = "vts-grid";
  grid.setAttribute("role", "list");

  const footer = document.createElement("div");
  footer.className = "vts-footer";
  footer.innerHTML = `
    <div class="vts-shortcuts">
      <span class="vts-shortcut"><span class="vts-key">Ctrl</span><span class="vts-key">Tab</span></span>
      <span class="vts-shortcut"><span class="vts-key">Arrows</span> Navigate</span>
      <span class="vts-shortcut"><span class="vts-key">Esc</span> Close</span>
    </div>
    <div>Hold Ctrl to keep the switcher open.</div>
  `;

  container.append(header, grid, footer);
  backdrop.append(container);
  shadow.append(style, backdrop);

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop && state.isOpen) {
      closeWithoutCommit();
    }
  });

  const attachHost = () => {
    if (!document.documentElement.contains(host)) {
      document.documentElement.appendChild(host);
    }
  };

  attachHost();

  function openOverlay({ tabs = [], windowId = null, initialTabId = null }) {
    state.tabs = Array.isArray(tabs) ? tabs : [];
    state.windowId = windowId;
    state.searchTerm = "";
    applyFilter();
    const initialIndex = initialTabId != null ? state.filteredTabs.findIndex((tab) => tab.id === initialTabId) : 0;
    state.selectedIndex = initialIndex >= 0 ? initialIndex : 0;
    renderTabs();
    updateMeta();
    toggleOverlay(true);
    ensureSelectionVisible();
    notifySelectionChange();
  }

  function toggleOverlay(visible) {
    state.isOpen = Boolean(visible);
    backdrop.dataset.visible = state.isOpen ? "true" : "false";
    if (state.isOpen) {
      requestAnimationFrame(() => {
        searchInput.blur();
      });
    } else {
      searchInput.value = "";
      state.searchTerm = "";
    }
  }

  function renderTabs() {
    grid.innerHTML = "";
    if (!state.filteredTabs.length) {
      const empty = document.createElement("div");
      empty.className = "vts-empty";
      empty.textContent = "No tabs match your search.";
      grid.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    state.filteredTabs.forEach((tab, index) => {
      const card = createTabCard(tab, index);
      fragment.append(card);
    });
    grid.append(fragment);
    highlightSelection();
  }

  function createTabCard(tab, index) {
    const card = document.createElement("div");
    card.className = "vts-card";
    card.dataset.index = String(index);
    card.dataset.tabId = String(tab.id);
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", tab.title ?? "Tab");

    card.addEventListener("mousedown", (event) => event.preventDefault());
    card.addEventListener("mouseenter", () => setSelection(index, { notify: true }));

    card.addEventListener("click", (event) => {
      event.preventDefault();
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.action === "close") {
        requestTabClose(tab.id);
        return;
      }
      activateSelection(index);
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "vts-close";
    close.dataset.action = "close";
    close.textContent = "X";
    close.title = "Close tab";

    const body = document.createElement("div");
    body.className = "vts-card-body";

    const preview = document.createElement("div");
    preview.className = "vts-preview";
    if (tab.preview) {
      const img = document.createElement("img");
      img.src = tab.preview;
      img.alt = tab.title ?? "Tab preview";
      preview.append(img);
    } else {
      preview.textContent = "Preview not available";
    }

    const info = document.createElement("div");
    info.className = "vts-info";

    const titleRow = document.createElement("div");
    titleRow.className = "vts-title";

    const faviconWrapper = document.createElement("span");
    faviconWrapper.className = "vts-favicon";
    if (tab.favIconUrl) {
      const favicon = document.createElement("img");
      favicon.src = tab.favIconUrl;
      favicon.alt = "";
      faviconWrapper.append(favicon);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "vts-fallback-favicon";
      fallback.textContent = deriveFallbackMonogram(tab);
      faviconWrapper.append(fallback);
    }

    const titleText = document.createElement("span");
    titleText.textContent = tab.title || tab.url || "Untitled";

    titleRow.append(faviconWrapper, titleText);

    const urlText = document.createElement("div");
    urlText.className = "vts-url";
    urlText.textContent = tab.url ?? "";

    const badges = document.createElement("div");
    badges.className = "vts-badges";
    if (tab.pinned) {
      badges.append(createBadge("Pinned"));
    }
    if (tab.audible) {
      badges.append(createBadge(tab.muted ? "Muted" : "Audio"));
    }
    if (tab.incognito) {
      badges.append(createBadge("Incognito"));
    }

    info.append(titleRow, urlText, badges);
    body.append(preview, info);
    card.append(close, body);
    return card;
  }

  function createBadge(text) {
    const badge = document.createElement("span");
    badge.className = "vts-badge";
    badge.textContent = text;
    return badge;
  }

  function deriveFallbackMonogram(tab) {
    const source = tab.title || tab.url || "?";
    const trimmed = source.trim();
    const letter = trimmed ? trimmed[0] : "?";
    return letter.toUpperCase();
  }

  function applyFilter() {
    const term = state.searchTerm.trim().toLowerCase();
    if (!term) {
      state.filteredTabs = [...state.tabs];
      return;
    }
    state.filteredTabs = state.tabs.filter((tab) => {
      const title = tab.title?.toLowerCase() ?? "";
      const url = tab.url?.toLowerCase() ?? "";
      return title.includes(term) || url.includes(term);
    });
  }

  function updateMeta() {
    meta.textContent = `${state.filteredTabs.length} of ${state.tabs.length} tabs`;
  }

  function highlightSelection() {
    const cards = grid.querySelectorAll(".vts-card");
    cards.forEach((card, index) => {
      card.dataset.selected = index === state.selectedIndex ? "true" : "false";
    });
  }

  function ensureSelectionVisible() {
    const selected = grid.querySelector(`.vts-card[data-index="${state.selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function setSelection(index, { notify } = { notify: false }) {
    if (!state.filteredTabs.length) {
      return;
    }
    const count = state.filteredTabs.length;
    const nextIndex = ((index % count) + count) % count;
    if (state.selectedIndex === nextIndex) {
      return;
    }
    state.selectedIndex = nextIndex;
    highlightSelection();
    ensureSelectionVisible();
    if (notify) {
      notifySelectionChange();
    }
  }

  function cycleSelection(delta) {
    if (!state.filteredTabs.length) {
      return;
    }
    setSelection(state.selectedIndex + delta, { notify: true });
  }

  function notifySelectionChange() {
    const current = state.filteredTabs[state.selectedIndex];
    if (!current) {
      return;
    }
    chrome.runtime.sendMessage({
      type: "tab-switcher/selection-changed",
      payload: {
        windowId: state.windowId,
        tabId: current.id
      }
    });
  }

  function activateSelection(index = state.selectedIndex) {
    const tab = state.filteredTabs[index];
    if (!tab) {
      return;
    }
    chrome.runtime.sendMessage({
      type: "tab-switcher/activate-tab",
      payload: {
        tabId: tab.id,
        windowId: tab.windowId ?? state.windowId
      }
    });
    toggleOverlay(false);
  }

  function requestTabClose(tabId) {
    chrome.runtime.sendMessage({
      type: "tab-switcher/close-tab",
      payload: { tabId }
    });
  }

  function closeWithoutCommit() {
    const current = state.filteredTabs[state.selectedIndex];
    chrome.runtime.sendMessage({
      type: "tab-switcher/close",
      payload: {
        windowId: state.windowId,
        lastSelectedTabId: current?.id ?? null
      }
    });
    toggleOverlay(false);
  }

  function focusSearchWithInitial(char) {
    if (document.activeElement !== searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    if (char) {
      const newValue = char.length === 1 ? char : "";
      if (newValue) {
        searchInput.value = newValue;
        triggerInputEvent();
        const offset = searchInput.value.length;
        searchInput.setSelectionRange(offset, offset);
        return;
      }
    }
  }

  function triggerInputEvent() {
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  searchInput.addEventListener("input", () => {
    state.searchTerm = searchInput.value;
    const previousTabId = state.filteredTabs[state.selectedIndex]?.id;
    applyFilter();
    if (!state.filteredTabs.length) {
      state.selectedIndex = 0;
    } else if (previousTabId != null) {
      const nextIndex = state.filteredTabs.findIndex((tab) => tab.id === previousTabId);
      state.selectedIndex = nextIndex >= 0 ? nextIndex : 0;
    } else {
      state.selectedIndex = 0;
    }
    renderTabs();
    updateMeta();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (!state.isOpen) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      cycleSelection(event.key === "ArrowDown" ? 1 : -1);
    }
  });

  const keydownHandler = (event) => {
    if (!state.isOpen) {
      return;
    }

    const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

    if (key === "Escape") {
      event.preventDefault();
      closeWithoutCommit();
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      activateSelection();
      return;
    }

    if (key === "Tab" && ctrlKey) {
      event.preventDefault();
      cycleSelection(shiftKey ? -1 : 1);
      return;
    }

    if (key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      const horizontal = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
      const vertical = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
      const columns = estimateColumnCount();
      const delta = horizontal !== 0 ? horizontal : vertical * columns;
      cycleSelection(delta === 0 ? 1 : delta);
      return;
    }

    if (key === "Control") {
      state.ctrlKeyDown = true;
    }

    const isCharacter = key.length === 1 && !ctrlKey && !altKey && !metaKey;
    if (isCharacter) {
      if (document.activeElement !== searchInput) {
        event.preventDefault();
        focusSearchWithInitial(key);
      }
      return;
    }
  };

  const keyupHandler = (event) => {
    if (!state.isOpen) {
      return;
    }
    if (event.key === "Control") {
      state.ctrlKeyDown = false;
      activateSelection();
    }
  };

  document.addEventListener("keydown", keydownHandler, true);
  document.addEventListener("keyup", keyupHandler, true);

  const resizeObserver = new ResizeObserver(() => {
    if (!state.isOpen) {
      return;
    }
    ensureSelectionVisible();
  });
  resizeObserver.observe(container);

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object" || !message.type?.startsWith("tab-switcher/")) {
      return;
    }
    const { type, payload } = message;
    if (type === "tab-switcher/open") {
      openOverlay(payload ?? {});
    } else if (type === "tab-switcher/cycle") {
      const direction = payload?.direction === "previous" ? -1 : 1;
      cycleSelection(direction);
    }
  });

  function estimateColumnCount() {
    const card = grid.querySelector(".vts-card");
    if (!card) {
      return 1;
    }
    const cardWidth = card.getBoundingClientRect().width;
    const gridWidth = grid.getBoundingClientRect().width;
    const columns = Math.max(1, Math.round(gridWidth / Math.max(cardWidth, 1)));
    return columns;
  }
})();
