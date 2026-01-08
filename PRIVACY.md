# Privacy Policy for Tab Flow

**Last Updated:** January 2026

## Overview

Tab Flow is a browser extension that helps you navigate between your open tabs quickly and visually. We built it with privacy as a core principle – your data stays on your device, and we don't collect or transmit any personal information.

## What Data We Access

To provide the tab switching functionality, Tab Flow accesses:

- **Tab Information:** Title, URL, and favicon of your open tabs (to display in the tab switcher)
- **Tab Screenshots:** Visual captures of your tabs (to show thumbnail previews)
- **Tab Groups:** Names and colors of your Chrome tab groups (to organize the display)
- **Recently Closed Tabs:** Session information for tabs you've recently closed (to allow restoration)

## How We Store Data

All data is stored **locally on your device** using:

- **IndexedDB:** Tab screenshots are cached locally to improve performance
- **Chrome Storage API:** User preferences (like view mode) are stored locally

**We do not:**

- Send any data to external servers
- Use analytics or tracking services
- Share data with third parties
- Collect personally identifiable information
- Store your browsing history

## Data Retention

- **Screenshots:** Cached using an LRU (Least Recently Used) algorithm, automatically cleared as new tabs are captured. Maximum cache size is approximately 20MB.
- **Preferences:** Stored until you uninstall the extension or clear extension data.

## Permissions Explained

| Permission   | Why We Need It                                      |
| ------------ | --------------------------------------------------- |
| `tabs`       | Access tab titles, URLs, and favicons for display   |
| `tabGroups`  | Read tab group information to organize the display  |
| `activeTab`  | Interact with the currently active tab              |
| `storage`    | Save your preferences and cache screenshots locally |
| `scripting`  | Inject the tab switcher overlay into web pages      |
| `sessions`   | Access recently closed tabs for the restore feature |
| `favicon`    | Display website icons in the tab list               |
| `alarms`     | Schedule background tasks for screenshot updates    |
| `<all_urls>` | Capture screenshots and show overlay on any webpage |

## Host Permissions

Tab Flow requires access to all URLs (`<all_urls>`) for two reasons:

1. **Screenshot Capture:** To capture visual previews of your tabs, we need permission to access the visible content of any webpage.
2. **Overlay Injection:** The tab switcher overlay needs to be displayed on any page you're viewing.

We do **not** read, analyze, or store the content of web pages beyond capturing screenshots for the preview tiles.

## Limited Use Disclosure

Tab Flow's use of information received from Google APIs adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/), including the Limited Use requirements.

Specifically:

- We only use the data to provide the tab switching functionality
- We do not transfer data to third parties
- We do not use data for advertising purposes
- We do not sell user data

## Your Control

You have full control over Tab Flow:

- **Uninstall:** Remove the extension at any time to delete all associated data
- **Clear Data:** Use Chrome's extension settings to clear stored data
- **Disable:** Temporarily disable the extension without losing your preferences

## Children's Privacy

Tab Flow does not knowingly collect any information from children under 13 years of age.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date at the top of this document. Significant changes will be noted in the extension's release notes.

## Open Source

Tab Flow is open source. You can review the complete source code at:
https://github.com/prabhjot0109/TabFlow

This transparency ensures you can verify exactly what the extension does with your data.

## Contact

If you have questions about this privacy policy or Tab Flow's data practices, please open an issue on our GitHub repository:
https://github.com/prabhjot0109/TabFlow/issues

---

**Summary:** Tab Flow stores tab data locally on your device to enable the tab switching feature. We don't collect, transmit, or sell any user data. Everything stays on your computer.
