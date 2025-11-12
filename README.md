# Visual Tab Switcher

Visual Tab Switcher is a Manifest V3 Chrome extension that replaces the default tab switcher with a dimmed overlay showing live thumbnails, titles, and favicons for every open tab in the current window. Navigate with the keyboard or mouse, close tabs inline, and filter results instantly.

## Features

- Responsive overlay with a grid of tab thumbnails, titles, favicons, and status badges (pinned/incognito/audio).
- Keyboard navigation with `Ctrl+Tab` (or any custom shortcut), arrow keys, Enter, Escape, and search typing.
- Mouse support for click-to-activate or close tabs directly from the overlay.
- Semi-transparent backdrop that keeps focus on the switcher while dimming the page.
- Cached tab screenshots using `chrome.tabs.captureVisibleTab` for smooth previews, stored in `chrome.storage.session` with throttling.

## Getting Started

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select the repository folder (`Browser Tab Switch`).
4. The extension icon will appear in the toolbar; open the command shortcuts panel if you want to customise the hotkey.

### Keyboard Shortcut Notes

- Chrome blocks extensions from shipping with `Ctrl+Tab` pre-assigned. The extension defaults to `Ctrl+Shift+Space`.
- You can attempt to remap the shortcut via `chrome://extensions/shortcuts`, but Chrome still reserves certain combinations (including `Ctrl+Tab`) on most platforms. If that combination is rejected, choose an alternative or use an external tool (e.g. AutoHotkey on Windows) to forward `Ctrl+Tab` to the registered shortcut.

## Using the Switcher

- Invoke the shortcut to open the overlay. Keep the modifier key (`Ctrl`) held to keep it open while cycling.
- Press `Tab` while holding `Ctrl` to move forward; add `Shift` to reverse. Arrow keys move across the grid. `Enter` or releasing `Ctrl` activates the highlighted tab. `Escape` or clicking the backdrop cancels without switching.
- Start typing to filter tabs by title or URL. The search field focuses automatically when you type while the overlay is open.
- Click a thumbnail to activate its tab or hit the `X` badge to close it without switching.

## Implementation Highlights

- **Manifest V3 service worker** (`background.js`) listens for the keyboard command, builds the tab payload, and keeps track of overlay state per window.
- **Preview caching** captures the active tab whenever it changes (throttled to avoid API limits) and stores the JPEG data URL in memory plus `chrome.storage.session` for reuse during the browser session.
- **Content script overlay** (`contentScript.js`) injects a shadow DOM UI so site styles cannot interfere. It handles keyboard navigation, filtering, rendering, and messaging back to the service worker when the selection changes or a tab should be activated/closed.
- **Current window scope**: Only tabs from the active window are displayed to avoid cross-window surprises. This can be extended later via an options UI if desired.

## Known Limitations

- Chrome does not deliver `Ctrl+Tab` directly to extensions. Users must remap the command to a permitted shortcut or rely on external key remapping utilities.
- Thumbnail previews are only available for tabs that have been active since the extension was installed or last reloaded. Tabs never activated will display a placeholder until they are opened.
- Capturing is skipped for incognito tabs unless the extension is explicitly enabled for incognito windows.
- The overlay cannot appear on Chrome's internal pages (e.g. `chrome://` URLs) because content scripts are blocked there.

## Contributing

Pull requests are welcome. Please keep screenshots lightweight, respect Chrome API throttling limits, and document any new settings or required permissions in the README.
