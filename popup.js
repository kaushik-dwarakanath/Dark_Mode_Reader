const STORAGE_KEY = "deepDarkModeEnabled";

function setToggleState(checked) {
  const input = document.getElementById("toggle");
  const pill = document.getElementById("status-pill");
  if (!input || !pill) return;

  input.checked = checked;
  pill.textContent = checked ? "On" : "Off";
  pill.classList.toggle("on", checked);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const toggle = document.getElementById("toggle");
  if (!toggle) return;

  const tab = await getActiveTab();
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "DDM_GET_STATE" }, (response) => {
    if (chrome.runtime.lastError) {
      setToggleState(false);
      return;
    }
    setToggleState(Boolean(response?.enabled));
  });

  toggle.addEventListener("change", async () => {
    const t = await getActiveTab();
    if (!t?.id) return;
    chrome.tabs.sendMessage(t.id, { type: "DDM_TOGGLE" }, (response) => {
      if (!chrome.runtime.lastError) {
        setToggleState(Boolean(response?.enabled));
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", init);


