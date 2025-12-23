import { state } from "../state";
import {
  closeOverlay,
  switchToTab,
  toggleMute,
  restoreSession,
  closeTab,
  switchToActive,
  switchToRecent,
  createGroup,
} from "../actions";
import {
  updateSelection,
  updateHistorySelection,
  activateSelectedHistoryItem,
} from "../ui/rendering";

export function handleGridClick(e: MouseEvent) {
  try {
    const target = e.target as HTMLElement;

    // Handle close button
    if (
      target.dataset.action === "close" ||
      target.classList.contains("tab-close-btn")
    ) {
      e.stopPropagation();
      const tabId = parseInt(
        target.dataset.tabId || target.parentElement!.dataset.tabId || "0"
      );
      const index = parseInt(
        target.dataset.tabIndex || target.parentElement!.dataset.tabIndex || "0"
      );

      if (tabId && !Number.isNaN(tabId)) {
        closeTab(tabId, index);
      }
      return;
    }

    // Handle mute button
    if (target.dataset.action === "mute" || target.closest(".tab-mute-btn")) {
      e.stopPropagation();
      const btn = target.closest(".tab-mute-btn") as HTMLElement;
      const tabId = parseInt(btn.dataset.tabId || "0");

      if (tabId && !Number.isNaN(tabId)) {
        toggleMute(tabId, btn);
      }
      return;
    }

    // Handle tab card click
    const tabCard = target.closest(".tab-card") as HTMLElement;
    if (tabCard) {
      if (state.viewMode === "recent" || tabCard.dataset.recent === "1") {
        const sessionId = tabCard.dataset.sessionId;
        if (sessionId) {
          restoreSession(sessionId);
        }
        return;
      }
      if (tabCard.dataset.webSearch === "1") {
        const query = tabCard.dataset.searchQuery;
        if (query) {
          window.open(
            `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            "_blank"
          );
          closeOverlay();
        }
        return;
      }
      const tabId = parseInt(tabCard.dataset.tabId || "0");
      if (tabId && !Number.isNaN(tabId)) {
        switchToTab(tabId);
      } else {
        console.error("[TAB SWITCHER] Invalid tab ID in card:", tabCard);
      }
    }
  } catch (error) {
    console.error("[TAB SWITCHER] Error in handleGridClick:", error);
  }
}

function isHistoryModeActive() {
  const v =
    (state.domCache?.searchBox &&
    typeof state.domCache.searchBox.value === "string"
      ? state.domCache.searchBox.value
      : "") || "";
  return v.trim().startsWith(",");
}

export function handleKeyDown(e: KeyboardEvent) {
  if (!state.isOverlayVisible) return;

  const isInSearchBox = e.target === state.domCache.searchBox;
  const isInHistoryMode = isHistoryModeActive() && state.history.active;

  // In history mode, allow arrow keys and Enter through even from search box
  const historyNavKeys = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Enter",
  ];
  const isHistoryNavKey = isInHistoryMode && historyNavKeys.includes(e.key);

  // Avoid double-handling when typing in the search box; allow Escape and history nav keys through
  if (isInSearchBox && e.key !== "Escape" && !isHistoryNavKey) {
    return;
  }

  // Throttle to ~60fps for repeated nav keys
  const now = performance.now();
  if (now - state.lastKeyTime < state.keyThrottleMs) {
    e.preventDefault();
    return;
  }
  state.lastKeyTime = now;

  try {
    // History mode keyboard navigation
    if (isInHistoryMode) {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeOverlay();
          return;

        case "Enter":
          e.preventDefault();
          activateSelectedHistoryItem();
          return;

        case "ArrowDown": {
          e.preventDefault();
          const list =
            state.history.column === "forward"
              ? state.history.forwardEls
              : state.history.backEls;
          if (list.length) {
            state.history.index = Math.min(
              state.history.index + 1,
              list.length - 1
            );
            updateHistorySelection();
          }
          return;
        }

        case "ArrowUp": {
          e.preventDefault();
          const list =
            state.history.column === "forward"
              ? state.history.forwardEls
              : state.history.backEls;
          if (list.length) {
            state.history.index = Math.max(state.history.index - 1, 0);
            updateHistorySelection();
          }
          return;
        }

        case "ArrowLeft": {
          e.preventDefault();
          if (
            state.history.column === "forward" &&
            state.history.backEls.length
          ) {
            state.history.column = "back";
            state.history.index = Math.min(
              state.history.index,
              state.history.backEls.length - 1
            );
            updateHistorySelection();
          }
          return;
        }

        case "ArrowRight": {
          e.preventDefault();
          if (
            state.history.column === "back" &&
            state.history.forwardEls.length
          ) {
            state.history.column = "forward";
            state.history.index = Math.min(
              state.history.index,
              state.history.forwardEls.length - 1
            );
            updateHistorySelection();
          }
          return;
        }
      }
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        closeOverlay();
        break;

      case "Enter":
        e.preventDefault();
        if (
          state.filteredTabs.length > 0 &&
          state.selectedIndex >= 0 &&
          state.selectedIndex < state.filteredTabs.length
        ) {
          const selectedTab = state.filteredTabs[state.selectedIndex];
          if (selectedTab) {
            // Group Header handling removed

            if (state.viewMode === "recent" && selectedTab.sessionId) {
              restoreSession(selectedTab.sessionId);
            } else if (selectedTab.id) {
              switchToTab(selectedTab.id);
            }
          }
        }
        break;

      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          selectPrevious();
        } else {
          selectNext();
        }
        break;

      case "ArrowRight":
        e.preventDefault();
        selectRight();
        break;

      case "ArrowLeft":
        e.preventDefault();
        selectLeft();
        break;

      case "ArrowDown":
        e.preventDefault();
        selectDown();
        break;

      case "ArrowUp":
        e.preventDefault();
        selectUp();
        break;

      case "Delete":
        // Delete only applies to active tabs view
        if (
          state.viewMode !== "recent" &&
          state.filteredTabs.length > 0 &&
          state.selectedIndex >= 0 &&
          state.selectedIndex < state.filteredTabs.length
        ) {
          e.preventDefault();
          const tab = state.filteredTabs[state.selectedIndex];
          if (tab?.id) {
            closeTab(tab.id, state.selectedIndex);
          }
        }
        break;

      case "g":
      case "G":
        if (e.altKey) {
          e.preventDefault();
          if (
            state.viewMode !== "recent" &&
            state.filteredTabs.length > 0 &&
            state.selectedIndex >= 0 &&
            state.selectedIndex < state.filteredTabs.length
          ) {
            const tab = state.filteredTabs[state.selectedIndex];
            if (tab?.id) {
              createGroup(tab.id);
            }
          }
        }
        break;
    }
  } catch (error) {
    console.error("[TAB SWITCHER] Error in handleKeyDown:", error);
  }
}

export function handleKeyUp() {
  // Reserved for future use
}

export function handleSearchKeydown(e: KeyboardEvent) {
  try {
    // In history mode, let the main handleKeyDown deal with navigation
    const isInHistoryMode = isHistoryModeActive() && state.history.active;
    const historyNavKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
    ];
    if (isInHistoryMode && historyNavKeys.includes(e.key)) {
      // Don't handle here - let it bubble to handleKeyDown
      // But prevent default to stop cursor movement in input
      e.preventDefault();
      return;
    }

    // Throttle navigation keys to ~60fps similar to global handler
    const navKeys = [
      "Delete",
      "Tab",
      "ArrowDown",
      "ArrowUp",
      "ArrowRight",
      "ArrowLeft",
      "Enter",
    ];
    if (navKeys.includes(e.key)) {
      const now = performance.now();
      if (now - state.lastKeyTime < state.keyThrottleMs) {
        e.preventDefault();
        return;
      }
      state.lastKeyTime = now;
    }
    // '.' toggles between Active and Recently Closed when input empty
    if (e.key === ".") {
      const val = (e.target as HTMLInputElement).value || "";
      if (val.length === 0) {
        e.preventDefault();
        if (state.viewMode === "recent") {
          switchToActive();
        } else {
          switchToRecent();
        }
        return;
      }
    }
    // Backspace: if empty in recent mode, go back to active
    if (e.key === "Backspace") {
      const val = (e.target as HTMLInputElement).value || "";
      if (val.length === 0 && state.viewMode === "recent") {
        e.preventDefault();
        switchToActive();
        return;
      }
      // else allow default deletion
      return;
    }

    // Delete key: Close selected tab even from search box
    if (e.key === "Delete") {
      e.preventDefault();
      if (
        state.viewMode !== "recent" &&
        state.filteredTabs.length > 0 &&
        state.selectedIndex >= 0 &&
        state.selectedIndex < state.filteredTabs.length
      ) {
        const tab = state.filteredTabs[state.selectedIndex];
        if (tab?.id) closeTab(tab.id, state.selectedIndex);
      }
      return;
    }

    // Tab key: Navigate down (Shift+Tab goes backward/up)
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: Move to previous (up)
        selectPrevious();
      } else {
        // Tab: Move to next (down)
        selectNext();
      }
      return;
    }

    // Arrow Down: Move to next row (down)
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectDown();
      return;
    }

    // Arrow Up: Move to previous row (up)
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectUp();
      return;
    }

    // Arrow Right: Move to right in grid
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectRight();
      return;
    }

    // Arrow Left: Move to left in grid
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectLeft();
      return;
    }

    // Enter: Switch/restore selected item
    if (e.key === "Enter") {
      e.preventDefault();
      if (
        state.filteredTabs.length > 0 &&
        state.selectedIndex >= 0 &&
        state.selectedIndex < state.filteredTabs.length
      ) {
        const selectedTab = state.filteredTabs[state.selectedIndex];

        // Group Header handling removed

        if (state.viewMode === "recent" && selectedTab?.sessionId) {
          restoreSession(selectedTab.sessionId);
        } else if (selectedTab?.isWebSearch) {
          window.open(
            `https://www.google.com/search?q=${encodeURIComponent(
              selectedTab.searchQuery!
            )}`,
            "_blank"
          );
          closeOverlay();
        } else if (selectedTab?.id && selectedTab.id >= 0) {
          // Ensure positive ID
          switchToTab(selectedTab.id);
        }
      }
      return;
    }
  } catch (error) {
    console.error("[TAB SWITCHER] Error in handleSearchKeydown:", error);
  }
}

// Simple linear navigation - next item
export function selectNext() {
  if (!state.filteredTabs || state.filteredTabs.length === 0) return;
  state.selectedIndex++;
  if (state.selectedIndex >= state.filteredTabs.length) {
    state.selectedIndex = 0;
  }
  updateSelection();
}

// Simple linear navigation - previous item
export function selectPrevious() {
  if (!state.filteredTabs || state.filteredTabs.length === 0) return;
  state.selectedIndex--;
  if (state.selectedIndex < 0) {
    state.selectedIndex = state.filteredTabs.length - 1;
  }
  updateSelection();
}

// All arrow keys use simple linear navigation
function selectDown() {
  selectNext();
}

function selectUp() {
  selectPrevious();
}

function selectRight() {
  selectNext();
}

function selectLeft() {
  selectPrevious();
}
