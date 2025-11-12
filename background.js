// Background service worker for Visual Tab Switcher
// ============================================================================
// PERFORMANCE-OPTIMIZED IMPLEMENTATION
// Target: <100ms overlay open, <50MB with 100 tabs, 60fps animations
// ============================================================================

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================
class LRUCache {
  constructor(maxTabs = 30, maxBytes = 20 * 1024 * 1024) {
    this.cache = new Map(); // Map for O(1) access
    this.maxTabs = maxTabs;
    this.maxBytes = maxBytes;
    this.currentBytes = 0;
    this.accessOrder = []; // Track access order for LRU
  }

  // Get item and mark as recently used
  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Move to front of access order (most recent)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.unshift(key);
    
    return this.cache.get(key);
  }

  // Set item with automatic eviction
  set(key, value) {
    const size = this._estimateSize(value);
    
    // Remove existing entry if updating
    if (this.cache.has(key)) {
      const oldSize = this.cache.get(key).size;
      this.currentBytes -= oldSize;
    }
    
    // Evict if necessary
    while (
      (this.cache.size >= this.maxTabs || this.currentBytes + size > this.maxBytes) &&
      this.cache.size > 0
    ) {
      this._evictLRU();
    }
    
    // Add new entry
    this.cache.set(key, { data: value, size, timestamp: Date.now() });
    this.currentBytes += size;
    
    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.unshift(key);
  }

  // Remove specific entry
  delete(key) {
    if (!this.cache.has(key)) return false;
    
    const entry = this.cache.get(key);
    this.currentBytes -= entry.size;
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    
    return true;
  }

  // Evict least recently used entry
  _evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder.pop(); // Remove from end (least recent)
    const entry = this.cache.get(lruKey);
    
    if (entry) {
      this.currentBytes -= entry.size;
      this.cache.delete(lruKey);
      console.debug(`[LRU] Evicted tab ${lruKey} (${(entry.size / 1024).toFixed(1)}KB)`);
    }
  }

  // Estimate size of base64 screenshot
  _estimateSize(data) {
    // Base64 string size in bytes
    return Math.ceil(data.length * 0.75); // Base64 is ~33% larger than binary
  }

  // Get cache statistics
  getStats() {
    return {
      entries: this.cache.size,
      bytes: this.currentBytes,
      maxTabs: this.maxTabs,
      maxBytes: this.maxBytes,
      utilizationPercent: ((this.currentBytes / this.maxBytes) * 100).toFixed(1)
    };
  }

  // Clear all entries
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.currentBytes = 0;
  }
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const PERF_CONFIG = {
  MAX_CACHED_TABS: 30,              // LRU cache size
  MAX_CACHE_BYTES: 20 * 1024 * 1024, // 20MB total cache
  MAX_SCREENSHOT_SIZE: 200 * 1024,   // 200KB per screenshot
  JPEG_QUALITY: 60,                  // JPEG compression quality
  CAPTURE_DELAY: 100,                // Delay before capture (ms)
  SCREENSHOT_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CAPTURES_PER_SECOND: 2,        // Chrome API limit
  THROTTLE_INTERVAL: 500,            // Min time between captures (ms)
  PERFORMANCE_LOGGING: true          // Enable performance metrics
};

// ============================================================================
// GLOBAL STATE
// ============================================================================
const screenshotCache = new LRUCache(
  PERF_CONFIG.MAX_CACHED_TABS,
  PERF_CONFIG.MAX_CACHE_BYTES
);
const recentTabOrder = []; // Track tab access order
const captureQueue = []; // Queue for rate-limited captures
let lastCaptureTime = 0; // Timestamp of last capture
let isProcessingQueue = false; // Queue processing flag

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================
const perfMetrics = {
  overlayOpenTimes: [],
  captureCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  
  recordOverlayOpen(duration) {
    this.overlayOpenTimes.push(duration);
    if (this.overlayOpenTimes.length > 100) this.overlayOpenTimes.shift();
    
    if (PERF_CONFIG.PERFORMANCE_LOGGING) {
      console.log(`[PERF] Overlay open: ${duration.toFixed(2)}ms (Target: <100ms)`);
    }
  },
  
  getAverageOverlayTime() {
    if (this.overlayOpenTimes.length === 0) return 0;
    const sum = this.overlayOpenTimes.reduce((a, b) => a + b, 0);
    return sum / this.overlayOpenTimes.length;
  },
  
  logStats() {
    const cacheStats = screenshotCache.getStats();
    const avgOverlay = this.getAverageOverlayTime();
    
    console.log(`[STATS] ═══════════════════════════════════════`);
    console.log(`[STATS] Cache: ${cacheStats.entries}/${cacheStats.maxTabs} tabs`);
    console.log(`[STATS] Memory: ${(cacheStats.bytes / 1024 / 1024).toFixed(2)}MB / ${(cacheStats.maxBytes / 1024 / 1024).toFixed(2)}MB (${cacheStats.utilizationPercent}%)`);
    console.log(`[STATS] Captures: ${this.captureCount} (Hits: ${this.cacheHits}, Misses: ${this.cacheMisses})`);
    console.log(`[STATS] Avg Overlay Open: ${avgOverlay.toFixed(2)}ms (Target: <100ms)`);
    console.log(`[STATS] ═══════════════════════════════════════`);
  }
};

// ============================================================================
// SCREENSHOT CAPTURE WITH RATE LIMITING
// ============================================================================

// Add capture to queue
function queueCapture(tabId, priority = false) {
  // Check if already in queue
  if (captureQueue.some(item => item.tabId === tabId)) {
    return;
  }
  
  const queueItem = { tabId, timestamp: Date.now() };
  
  if (priority) {
    captureQueue.unshift(queueItem);
  } else {
    captureQueue.push(queueItem);
  }
  
  processQueue();
}

// Process capture queue with rate limiting
async function processQueue() {
  if (isProcessingQueue || captureQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (captureQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastCapture = now - lastCaptureTime;
    
    // Enforce rate limit: max 2 captures per second
    if (timeSinceLastCapture < PERF_CONFIG.THROTTLE_INTERVAL) {
      const waitTime = PERF_CONFIG.THROTTLE_INTERVAL - timeSinceLastCapture;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const item = captureQueue.shift();
    await captureTabScreenshot(item.tabId);
    lastCaptureTime = Date.now();
  }
  
  isProcessingQueue = false;
}

// Capture screenshot with error handling and compression
async function captureTabScreenshot(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    // Check if tab is capturable
    if (!isTabCapturable(tab)) {
      console.debug(`[CAPTURE] Tab ${tabId} not capturable: ${tab.url}`);
      return null;
    }
    
    // Small delay for rendering
    await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.CAPTURE_DELAY));
    
    // Capture screenshot
    const startTime = performance.now();
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: PERF_CONFIG.JPEG_QUALITY
    });
    const captureTime = performance.now() - startTime;
    
    // Check size and compress if needed
    const size = screenshotCache._estimateSize(screenshot);
    if (size > PERF_CONFIG.MAX_SCREENSHOT_SIZE) {
      console.warn(`[CAPTURE] Screenshot too large: ${(size / 1024).toFixed(1)}KB, skipping`);
      return null;
    }
    
    // Store in LRU cache
    screenshotCache.set(tabId, screenshot);
    perfMetrics.captureCount++;
    
    if (PERF_CONFIG.PERFORMANCE_LOGGING) {
      console.debug(`[CAPTURE] Tab ${tabId}: ${captureTime.toFixed(2)}ms, ${(size / 1024).toFixed(1)}KB`);
    }
    
    return screenshot;
  } catch (error) {
    console.debug(`[CAPTURE] Failed for tab ${tabId}:`, error.message);
    return null;
  }
}

// Check if tab can be captured
function isTabCapturable(tab) {
  if (tab.discarded) return false;
  if (!tab.url) return false;
  
  const protectedSchemes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'file://'];
  return !protectedSchemes.some(scheme => tab.url.startsWith(scheme));
}

// ============================================================================
// TAB EVENT LISTENERS
// ============================================================================

// Listen for tab activation - auto-capture screenshots
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateRecentTabOrder(activeInfo.tabId);
  
  // Queue capture for newly activated tab (non-blocking)
  queueCapture(activeInfo.tabId, true); // Priority capture for active tab
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  screenshotCache.delete(tabId);
  removeFromRecentOrder(tabId);
  console.debug(`[CLEANUP] Removed tab ${tabId} from cache`);
});

// Update tab order tracking
function updateRecentTabOrder(tabId) {
  removeFromRecentOrder(tabId);
  recentTabOrder.unshift(tabId);
  
  // Keep only necessary entries
  if (recentTabOrder.length > PERF_CONFIG.MAX_CACHED_TABS * 2) {
    recentTabOrder.length = PERF_CONFIG.MAX_CACHED_TABS * 2;
  }
}

function removeFromRecentOrder(tabId) {
  const index = recentTabOrder.indexOf(tabId);
  if (index !== -1) {
    recentTabOrder.splice(index, 1);
  }
}

// ============================================================================
// COMMAND HANDLER - SHOW TAB SWITCHER
// ============================================================================

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "show-tab-switcher" || command === "cycle-next-tab") {
    handleShowTabSwitcher();
  }
});

// Handle showing the tab switcher - OPTIMIZED FOR <100ms
async function handleShowTabSwitcher() {
  const startTime = performance.now();
  
  try {
    // Get current window tabs (cached query when possible)
    const currentWindow = await chrome.windows.getCurrent();
    const tabs = await chrome.tabs.query({ windowId: currentWindow.id });
    
    // Sort by recent order
    const sortedTabs = sortTabsByRecent(tabs);
    
    // INSTANT RESPONSE: Build tab data with cached screenshots only
    // No waiting for captures - overlay opens immediately
    const tabsData = sortedTabs.map(tab => {
      const screenshot = screenshotCache.get(tab.id);
      
      if (screenshot) {
        perfMetrics.cacheHits++;
      } else {
        perfMetrics.cacheMisses++;
        // Queue background capture for next time (non-blocking)
        queueCapture(tab.id, false);
      }
      
      return {
        id: tab.id,
        title: tab.title || "Untitled",
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        screenshot: screenshot ? screenshot.data : null,
        pinned: tab.pinned,
        index: tab.index,
        active: tab.active
      };
    });
    
    // Get active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send to content script IMMEDIATELY
    await sendMessageWithRetry(activeTab.id, {
      action: "showTabSwitcher",
      tabs: tabsData,
      activeTabId: activeTab.id
    });
    
    // Record performance
    const duration = performance.now() - startTime;
    perfMetrics.recordOverlayOpen(duration);
    
  } catch (error) {
    console.error("[ERROR] Failed to show tab switcher:", error);
  }
}

// Send message with automatic script injection
async function sendMessageWithRetry(tabId, message, retries = 1) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    if (retries > 0 && err.message.includes('Could not establish connection')) {
      console.log("[INJECT] Content script not ready, injecting...");
      
      try {
        // Inject content script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"]
        });
        
        // Inject CSS
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ["overlay.css"]
        });
        
        // Retry after injection
        await new Promise(resolve => setTimeout(resolve, 150));
        await chrome.tabs.sendMessage(tabId, message);
      } catch (injectErr) {
        if (injectErr.message.includes('cannot be scripted')) {
          console.warn('[INJECT] Cannot inject on this page (protected URL). Try on a regular webpage.');
        } else {
          throw injectErr;
        }
      }
    } else {
      throw err;
    }
  }
}

// Sort tabs by recent usage
function sortTabsByRecent(tabs) {
  return tabs.sort((a, b) => {
    const aIndex = recentTabOrder.indexOf(a.id);
    const bIndex = recentTabOrder.indexOf(b.id);
    
    // If neither in recent order, sort by tab index
    if (aIndex === -1 && bIndex === -1) return a.index - b.index;
    
    // If only one in recent order, prioritize it
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    
    // Both in recent order, sort by recent order
    return aIndex - bIndex;
  });
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations properly
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case "switchToTab":
        await chrome.tabs.update(request.tabId, { active: true });
        sendResponse({ success: true });
        break;
        
      case "closeTab":
        await chrome.tabs.remove(request.tabId);
        // Cache cleanup handled by onRemoved listener
        sendResponse({ success: true });
        break;
        
      case "refreshTabList":
        await handleShowTabSwitcher();
        sendResponse({ success: true });
        break;
        
      case "captureTabScreenshot":
        // Manual capture request
        const screenshot = await captureTabScreenshot(request.tabId);
        sendResponse({ 
          success: !!screenshot, 
          screenshot: screenshot 
        });
        break;
        
      case "getCacheStats":
        const stats = screenshotCache.getStats();
        sendResponse({ success: true, stats });
        break;
        
      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error(`[ERROR] Message handler failed:`, error);
    sendResponse({ success: false, error: error.message });
  }
}

// ============================================================================
// PERIODIC MAINTENANCE
// ============================================================================

// Log performance stats periodically
if (PERF_CONFIG.PERFORMANCE_LOGGING) {
  setInterval(() => {
    perfMetrics.logStats();
  }, 60000); // Every minute
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log("═══════════════════════════════════════════════════════");
console.log("Visual Tab Switcher - Performance Optimized");
console.log("═══════════════════════════════════════════════════════");
console.log(`Cache: Max ${PERF_CONFIG.MAX_CACHED_TABS} tabs, ${(PERF_CONFIG.MAX_CACHE_BYTES / 1024 / 1024).toFixed(2)}MB`);
console.log(`Screenshots: Max ${(PERF_CONFIG.MAX_SCREENSHOT_SIZE / 1024).toFixed(0)}KB each, ${PERF_CONFIG.JPEG_QUALITY}% quality`);
console.log(`Rate Limit: ${PERF_CONFIG.MAX_CAPTURES_PER_SECOND} captures/sec`);
console.log(`Target: <100ms overlay open, <50MB memory, 60fps`);
console.log("═══════════════════════════════════════════════════════");
