# Contributing to Tab Flow

First off, thanks for taking the time to contribute! 🎉

Tab Flow is a community-driven project, and we welcome contributions of all kinds – whether it's fixing a typo, reporting a bug, suggesting a feature, or submitting code.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Your First Contribution](#your-first-contribution)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

---

## Code of Conduct

Be kind. Be respectful. We're all here to make something useful.

That's really it. Treat others the way you'd want to be treated. If someone's being a jerk, we'll deal with it.

---

## I Have a Question

Before opening an issue:

1. **Search existing issues** – Someone might have already asked the same thing
2. **Check the README** – The answer might be there
3. **Still stuck?** – Open an issue with the "question" label

We're happy to help, just make sure you've done a quick search first.

---

## Reporting Bugs

Found something broken? Help us fix it by opening an issue with:

### What to Include

- **What happened** – Describe the bug clearly
- **What you expected** – What should have happened instead
- **Steps to reproduce** – How can we see the bug ourselves?
- **Browser & version** – Chrome 120, Edge 119, etc.
- **Screenshots** – If it's a visual bug, show us
- **Console errors** – Open DevTools (F12) → Console tab → copy any red errors

### Example Bug Report

```
**Bug:** Tab Flow overlay doesn't open on YouTube

**Expected:** Pressing Alt+Q should show the tab switcher

**Steps to reproduce:**
1. Open youtube.com
2. Press Alt+Q
3. Nothing happens

**Browser:** Chrome 120 on Windows 11
**Console error:** "Uncaught TypeError: Cannot read property 'id' of undefined"
```

The more details you give, the faster we can fix it.

---

## Suggesting Features

Got an idea? We'd love to hear it.

Open an issue with the "enhancement" label and tell us:

- **What's the problem you're trying to solve?**
- **How do you imagine the solution?**
- **Are there alternatives you've considered?**

Keep in mind:

- We try to keep Tab Flow focused on its core purpose (fast tab switching)
- Features that add complexity without clear value might not make it in
- But we're always open to good ideas!

---

## Your First Contribution

Never contributed to open source before? No worries – everyone starts somewhere.

### Good First Issues

Look for issues labeled:

- `good first issue` – Simple fixes, great for beginners
- `help wanted` – We'd appreciate help with these
- `documentation` – No code required, just writing

### Not Sure Where to Start?

Here are some easy ways to contribute:

- Fix typos in documentation
- Improve error messages
- Add comments to confusing code
- Write tests
- Update the README

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (recommended) or npm
- Chrome, Edge, or Brave browser
- Git

### Getting Started

1. **Fork the repo** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/TabFlow.git
   cd TabFlow
   ```

3. **Install dependencies:**

   ```bash
   bun install
   # or
   npm install
   ```

4. **Start development mode:**

   ```bash
   bun run dev
   # or
   npm run dev
   ```

5. **Load the extension in Chrome:**

   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

6. **Make changes and test:**
   - Vite will rebuild automatically when you save
   - Click the refresh icon on the extension card to reload
   - Press `Alt+Q` to test your changes

### Project Structure

```
TabFlow/
├── src/
│   ├── background/      # Service worker (screenshot capture, tab management)
│   ├── content/         # Content script (overlay UI, keyboard handling)
│   │   ├── ui/          # Rendering and styles
│   │   └── input/       # Keyboard and focus management
│   ├── flow/            # Popup window fallback for protected pages
│   └── popup/           # Extension popup (shortcut hints)
├── icons/               # Extension icons
├── manifest.json        # Extension manifest
└── vite.config.ts       # Build configuration
```

---

## Pull Request Process

### Before You Start

1. **Open an issue first** for significant changes – Let's discuss before you spend time coding
2. **One thing per PR** – Keep pull requests focused on a single change
3. **Check existing PRs** – Someone might already be working on it

### Making Your Changes

1. **Create a branch:**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Write your code** – Follow the [style guide](#style-guide)

3. **Test your changes:**

   - Does it work as expected?
   - Did you break anything else?
   - Test on at least one browser

4. **Build for production:**
   ```bash
   bun run build
   ```
   Make sure there are no errors.

### Submitting Your PR

1. **Push your branch:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template:**

   - What does this change do?
   - Why is it needed?
   - How did you test it?

4. **Wait for review** – We'll get back to you as soon as we can

### What We Look For

- Does the code work?
- Is it readable and maintainable?
- Does it follow existing patterns in the codebase?
- Are there any security concerns?
- Is it tested?

---

## Style Guide

### TypeScript

- Use TypeScript for all new code
- Enable strict mode (already configured in `tsconfig.json`)
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names

```typescript
// Good
const activeTabId = tabs.find((tab) => tab.active)?.id;

// Not great
const id = tabs.find((t) => t.active)?.id;
```

### Code Organization

- Keep functions small and focused
- Extract reusable logic into separate functions
- Add comments for non-obvious code
- Use meaningful commit messages

### DOM Manipulation

For security, prefer DOM methods over `innerHTML`:

```typescript
// Preferred
const div = document.createElement("div");
div.className = "tab-card";
div.textContent = title;

// Avoid (unless content is static/trusted)
element.innerHTML = `<div class="tab-card">${title}</div>`;
```

### Commit Messages

Write clear commit messages:

```
Good:
- "Fix overlay not closing on Escape key"
- "Add keyboard shortcut for muting tabs"
- "Improve screenshot capture performance"

Not great:
- "fix bug"
- "updates"
- "asdfasdf"
```

---

## Questions?

If something in this guide is unclear, open an issue and let us know. We're happy to help and always looking to improve our documentation.

Thanks for contributing! 🙏
