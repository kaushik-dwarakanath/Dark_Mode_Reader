// Dark Mode Reader - content script

const STORAGE_KEY = "deepDarkModeEnabled";

// Basic config that can be extended
const CONFIG = {
  transitionDuration: 200,
  ignoreSelectors: [
    "img",
    "video",
    "canvas",
    "svg",
    "iframe",
    "object",
    "embed"
  ]
};

let isEnabled = false;

function setRootDarkAttributes(enable) {
  const html = document.documentElement;
  if (enable) {
    html.classList.add("deep-dark-mode-root");
  } else {
    html.classList.remove("deep-dark-mode-root");
  }
}

function applyInlineOverrides(enable) {
  // We avoid heavy DOM walks; instead rely on CSS variables + high-level rules.
  if (enable) {
    document.documentElement.style.setProperty("--dd-background", "#050608");
    document.documentElement.style.setProperty("--dd-surface", "#111827");
    document.documentElement.style.setProperty("--dd-surface-soft", "#020617");
    document.documentElement.style.setProperty("--dd-text", "#e5e7eb");
    document.documentElement.style.setProperty("--dd-text-soft", "#9ca3af");
    document.documentElement.style.setProperty("--dd-accent", "#3b82f6");
  } else {
    document.documentElement.style.removeProperty("--dd-background");
    document.documentElement.style.removeProperty("--dd-surface");
    document.documentElement.style.removeProperty("--dd-surface-soft");
    document.documentElement.style.removeProperty("--dd-text");
    document.documentElement.style.removeProperty("--dd-text-soft");
    document.documentElement.style.removeProperty("--dd-accent");
  }
}

async function loadInitialState() {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEY]);
    isEnabled = Boolean(result[STORAGE_KEY]);
  } catch {
    isEnabled = true;
  }

  if (isEnabled) {
    enableDarkMode();
  }
}

function enableDarkMode() {
  isEnabled = true;
  setRootDarkAttributes(true);
  applyInlineOverrides(true);
}

function disableDarkMode() {
  isEnabled = false;
  setRootDarkAttributes(false);
  applyInlineOverrides(false);
}

function toggleDarkMode() {
  if (isEnabled) {
    disableDarkMode();
  } else {
    enableDarkMode();
  }

  chrome.storage.sync.set({ [STORAGE_KEY]: isEnabled }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "DDM_TOGGLE") {
    toggleDarkMode();
    sendResponse({ enabled: isEnabled });
  } else if (message?.type === "DDM_GET_STATE") {
    sendResponse({ enabled: isEnabled });
  }
});

// Allow background action button to toggle via window message
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "DDM_TOGGLE_FROM_ACTION") {
    toggleDarkMode();
  }
});

// Initialize early
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadInitialState, { once: true });
} else {
  loadInitialState();
}


