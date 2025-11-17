// Dark Mode Reader - background service worker

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.postMessage({ type: "DDM_TOGGLE_FROM_ACTION" }, "*");
        return true;
      }
    });
  } catch (e) {
    console.warn("Dark Mode Reader: toggle failed", e);
  }
});


