# Visual Tab Switcher - Chrome Extension

A powerful Chrome extension that provides a visual tab switcher with thumbnail previews, similar to Windows Alt+Tab or macOS Mission Control. Navigate through your open tabs with ease using keyboard shortcuts, mouse clicks, or arrow keys.

![Extension Preview](./preview.png)

## ✨ Features

### Core Functionality

- 🖼️ **Visual Thumbnails**: See live preview screenshots of all your open tabs
- ⌨️ **Keyboard Navigation**: Navigate using Tab, Arrow keys, or custom shortcuts
- 🖱️ **Mouse Support**: Click any thumbnail to instantly switch tabs
- 🔍 **Search & Filter**: Quickly find tabs by typing title or URL
- 📌 **Pinned Tab Indicator**: Visual indicator for pinned tabs
- 🎯 **Recently Used Sorting**: Tabs sorted by most recently accessed
- ⚡ **Performance Optimized**: Screenshot caching for smooth experience

### User Interface

- Modern, dark-themed overlay with smooth animations
- Responsive grid layout that adapts to screen size
- Semi-transparent backdrop with blur effect
- Visual feedback for selected tab
- Favicon display for easy tab identification
- Tab close button (X) on hover

### Keyboard Shortcuts

- **Default: Alt+Q** - Show tab switcher (customizable to Ctrl+Tab)
- **Tab / Arrow Keys** - Navigate between tabs
- **Enter** - Switch to selected tab
- **Delete / Backspace** - Close selected tab
- **Esc** - Close overlay without switching
- Type to search and filter tabs

## 📋 Installation

### Method 1: Load Unpacked (Development)

1. **Clone or Download** this repository:

   ```bash
   git clone https://github.com/prabhjot0109/tab_switcher_extension.git
   cd tab_switcher_extension
   ```

2. **Generate Icons** (if not already present):

   - Open `icons/generate-icons.html` in Chrome
   - Click the download buttons to save `icon16.png`, `icon48.png`, and `icon128.png`
   - Place them in the `icons/` folder

3. **Load Extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the extension folder

4. **Configure Shortcuts** (Optional):
   - Go to `chrome://extensions/shortcuts`
   - Find "Visual Tab Switcher"
   - Change "Show visual tab switcher" to `Ctrl+Tab` if desired
   - Note: Ctrl+Tab is protected by Chrome, so you must manually set it

### Method 2: Chrome Web Store (Coming Soon)

_This extension will be published to the Chrome Web Store soon._

## 🎮 Usage

### Opening the Tab Switcher

1. Press **Alt+Q** (or your configured shortcut)
2. The overlay appears with thumbnails of all open tabs
3. The currently active tab is highlighted

### Navigation Options

**Keyboard:**

- Press **Tab** or use **Arrow Keys** to cycle through tabs
- Press **Enter** to switch to the selected tab
- Press **Delete** to close the selected tab
- Press **Esc** to close the overlay

**Mouse:**

- Click on any thumbnail to instantly switch to that tab
- Click the **X** button on a thumbnail to close that tab
- Click outside the overlay to close it

**Search:**

- Start typing to filter tabs by title or URL
- Use arrow keys to navigate filtered results
- Press **Enter** to switch to the highlighted tab

### Customizing Keyboard Shortcuts

Chrome protects certain shortcuts like `Ctrl+Tab`. To use it:

1. Navigate to `chrome://extensions/shortcuts`
2. Find "Visual Tab Switcher"
3. Click in the shortcut field
4. Press your desired key combination (e.g., `Ctrl+Tab`)
5. Click outside to save

## 🛠️ Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension architecture
- **Service Worker**: Background script for tab management and screenshot capture
- **Content Script**: Injected overlay UI for visual tab switching
- **Permissions**: `tabs`, `activeTab`, `storage`, `<all_urls>`

### File Structure

```
visual-tab-switcher/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker for tab management
├── content.js             # Content script for overlay UI
├── overlay.css            # Styles for the tab switcher overlay
├── popup.html             # Extension popup with info and settings
├── icons/
│   ├── icon16.png        # 16x16 icon
│   ├── icon48.png        # 48x48 icon
│   ├── icon128.png       # 128x128 icon
│   └── generate-icons.html  # Icon generator utility
└── README.md             # This file
```

### Screenshot Capture

- Uses `chrome.tabs.captureVisibleTab()` API
- Caches screenshots for 30 seconds to improve performance
- Automatically captures tabs when overlay is opened
- Handles rate limiting and permission errors gracefully

### Performance Considerations

- **Screenshot Caching**: Recent screenshots are cached to avoid repeated captures
- **Lazy Loading**: Only visible tabs are rendered initially
- **Efficient Storage**: Screenshots are stored as compressed JPEG (quality: 50)
- **Cleanup**: Old screenshots are automatically cleaned up every minute
- **Optimized for 50+ tabs**: Tested with large numbers of open tabs

## 🔧 Configuration

### Storage Settings

The extension uses Chrome's storage API to save:

- Screenshot cache (temporary)
- Recent tab order
- User preferences (coming soon)

### Permissions Explained

- **tabs**: Access to tab information (title, URL, favicon)
- **activeTab**: Capture screenshots of the active tab
- **storage**: Store cached screenshots and preferences
- **<all_urls>**: Required to inject content script on all pages

## 🐛 Troubleshooting

### Extension not working?

1. **Check permissions**: Ensure all required permissions are granted
2. **Reload extension**: Go to `chrome://extensions/` and click the reload icon
3. **Try different shortcut**: Some shortcuts may conflict with other extensions
4. **Check console**: Open DevTools and check for error messages

### Screenshots not showing?

1. **Ensure activeTab permission**: Required for screenshot capture
2. **Try refreshing tabs**: Some tabs (like `chrome://` pages) cannot be captured
3. **Check for conflicts**: Disable other screenshot/tab extensions temporarily

### Keyboard shortcut not working?

1. **Check for conflicts**: Go to `chrome://extensions/shortcuts` to see conflicts
2. **Try different shortcut**: Some shortcuts are reserved by Chrome/OS
3. **Extension must be enabled**: Ensure extension is active

### Overlay not appearing?

1. **Reload the current tab**: The content script may need to be reinjected
2. **Check if site blocks content scripts**: Some sites have strict CSP policies
3. **Try on a different site**: Test on a regular website first

## 🚀 Future Enhancements

- [ ] Multi-window support with window selector
- [ ] Tab grouping visualization
- [ ] Customizable grid layout (columns/rows)
- [ ] Theme customization options
- [ ] Export/import tab sessions
- [ ] Tab preview on hover (live updates)
- [ ] Audio indicator for tabs playing media
- [ ] Duplicate tab detection and management
- [ ] Tab history and recently closed tabs
- [ ] Sync settings across devices

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/prabhjot0109/tab_switcher_extension.git
cd tab_switcher_extension

# Generate icons (open in browser)
open icons/generate-icons.html

# Load in Chrome for testing
# Go to chrome://extensions/ and load unpacked
```

### Testing

1. Load extension in developer mode
2. Open multiple tabs (try 20+ for best testing)
3. Test keyboard shortcuts
4. Test mouse interactions
5. Test search functionality
6. Check console for errors

## 📜 License

MIT License - feel free to use this code for your own projects!

## 🙏 Acknowledgments

- Inspired by Windows Alt+Tab and macOS Mission Control
- Built with Chrome Extension Manifest V3
- Uses Chrome Tabs API for tab management
- Styling inspired by VS Code's dark theme

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/prabhjot0109/tab_switcher_extension/issues)
3. Create a new issue with detailed information

## 🔒 Privacy

This extension:

- ✅ Does NOT collect or transmit any data
- ✅ Does NOT track browsing history
- ✅ Stores screenshots locally and temporarily
- ✅ All processing happens locally in your browser
- ✅ Open source - you can review all code

## 📊 Browser Support

- ✅ Chrome 88+
- ✅ Edge 88+ (Chromium-based)
- ✅ Brave (Chromium-based)
- ✅ Opera (Chromium-based)
- ❌ Firefox (different extension API)
- ❌ Safari (different extension API)

---

**Made with ❤️ for productivity enthusiasts**

_Star ⭐ this repo if you find it useful!_
