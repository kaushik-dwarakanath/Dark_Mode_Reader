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
let themeApplied = false;

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

function extractRGB(colorString) {
  if (!colorString) return null;
  const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3])
    };
  }
  const hexMatch = colorString.trim().match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const intVal = parseInt(hexMatch[1], 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    };
  }
  return null;
}

function relativeLuminance({ r, g, b }) {
  const normalize = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };

  const [R, G, B] = [normalize(r), normalize(g), normalize(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function resolveBackgroundColor(element, depth = 0) {
  if (!element || depth > 5) return null;
  const computed = window.getComputedStyle(element);
  const color = computed.backgroundColor;
  if (!color || color === "rgba(0, 0, 0, 0)" || color === "transparent") {
    return resolveBackgroundColor(element.parentElement, depth + 1);
  }
  return color;
}

function pageLooksLight() {
  const target = document.body || document.documentElement;
  const color = resolveBackgroundColor(target) || "rgb(255, 255, 255)";
  const rgb = extractRGB(color) || { r: 255, g: 255, b: 255 };
  const luminance = relativeLuminance(rgb);
  return luminance >= 0.35;
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
  const pageWasLight = pageLooksLight();
  isEnabled = true;
  if (!pageWasLight) {
    themeApplied = false;
    setRootDarkAttributes(false);
    applyInlineOverrides(false);
    return { applied: false, pageWasLight };
  }

  themeApplied = true;
  setRootDarkAttributes(true);
  applyInlineOverrides(true);
  return { applied: true, pageWasLight };
}

function disableDarkMode() {
  isEnabled = false;
  themeApplied = false;
  setRootDarkAttributes(false);
  applyInlineOverrides(false);
}

function toggleDarkMode() {
  let pageWasLight = pageLooksLight();
  if (isEnabled) {
    disableDarkMode();
  } else {
    const { pageWasLight: detectedLight } = enableDarkMode();
    pageWasLight = detectedLight;
  }

  chrome.storage.sync.set({ [STORAGE_KEY]: isEnabled }).catch(() => {});
  return { enabled: isEnabled, pageWasLight, themeApplied };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "DDM_TOGGLE") {
    const result = toggleDarkMode();
    sendResponse({
      enabled: result.enabled,
      pageWasLight: result.pageWasLight,
      themeApplied: result.themeApplied
    });
  } else if (message?.type === "DDM_GET_STATE") {
    sendResponse({ enabled: isEnabled, themeApplied, pageIsLight: pageLooksLight() });
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


