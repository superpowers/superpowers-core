let helpCallback: Function = null;
export function setupHelpCallback(callback: Function) { helpCallback = callback; }

export default function() {
  let isBackspaceDown = false;

  document.addEventListener("keydown", (event) => {
    if (document.querySelector(".dialog") != null) return;

    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    const origin = window.location.origin;
    function sendMessage(action: string) {
      window.top.postMessage({ type: "hotkey", content: action }, origin);
    }

    if (localStorage.getItem("superpowers-dev-mode") != null && window.parent != null) {
      window.onerror = () => { window.parent.postMessage({ type: "error" }, origin); };
    }

    if (event.keyCode === 8 /* Backspace */) isBackspaceDown = true;

    if (event.keyCode === 78 && ctrlOrCmd) { // Ctrl+N
      event.preventDefault();
      if (event.shiftKey) sendMessage("newFolder");
      else sendMessage("newAsset");
    }

    if ((event.keyCode === 79 || event.keyCode === 80) && ctrlOrCmd) { // Ctrl+O or Ctrl+P
      event.preventDefault(); sendMessage("searchEntry");
    }

    if (event.keyCode === 87 && ctrlOrCmd) { // Ctrl+W
      event.preventDefault(); sendMessage("closeTab");
    }

    if (event.keyCode === 9 && event.ctrlKey) { // Ctrl+Tab
      event.preventDefault();
      if (event.shiftKey) sendMessage("previousTab");
      else sendMessage("nextTab");
    }

    if (event.keyCode === 112) { // F1
        event.preventDefault();
        if (helpCallback != null) helpCallback();
    }
    if (event.keyCode === 116 || (event.keyCode === 80 && event.metaKey)) { // F5 || Cmd+P
      event.preventDefault(); sendMessage("run");
    }
    if (event.keyCode === 117 || (event.keyCode === 80 && event.metaKey && event.shiftKey)) { // F6 or Cmd+Shift-P
      event.preventDefault(); sendMessage("debug");
    }

    if (event.keyCode === 123) { // F12
      sendMessage("devtools");
    }
  });

  document.addEventListener("keyup", (event) => {
    if (event.keyCode === 8 /* Backspace */) isBackspaceDown = false;
  });

  window.addEventListener("beforeunload", (event) => {
    if (isBackspaceDown) {
      isBackspaceDown = false;
      event.returnValue = "You pressed backspace.";
      return "You pressed backspace.";
    }
    return null;
  });

  const hotkeyButtons = document.querySelectorAll("[data-hotkey]") as NodeListOf<HTMLButtonElement>;
  for (let i = 0; i < hotkeyButtons.length; i++) {
    const hotkeyButton = hotkeyButtons[i];
    const hotkeys = hotkeyButton.dataset["hotkey"].split("+");
    let hotkeyComplete = "";
    for (const hotkey of hotkeys) {
      let hotkeyPartKey: string;
      if (hotkey === "control" && window.navigator.platform === "MacIntel") hotkeyPartKey = `common:hotkeys.command`;
      else hotkeyPartKey = `common:hotkeys.${hotkey}`;

      const hotkeyPartString = SupClient.i18n.t(hotkeyPartKey);
      if (hotkeyComplete !== "") hotkeyComplete += "+";
      if (hotkeyPartString === hotkeyPartKey) hotkeyComplete += hotkey;
      else hotkeyComplete += hotkeyPartString;
    }
    hotkeyButton.title += ` (${hotkeyComplete})`;
  }
}
