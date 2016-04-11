import * as dialogs from "simple-dialogs";

// Help callback
let helpCallback: Function = null;
export function setupHelpCallback(callback: Function) {
  helpCallback = callback;
}

// Development mode
if (localStorage.getItem("superpowers-dev-mode") != null && window.top != null) window.onerror = onError;

function onError() {
  window.top.postMessage({ type: "error" }, window.location.origin);
}

// Auto-select number fields when focusing them
document.body.addEventListener("focus", onFocus, true);

function onFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  if (target.tagName !== "INPUT" || target.type !== "number") return;

  target.select();
}

// Hotkey handling
export function setupHotkeys() {
  console.warn("SupClient.setupHotkeys() has been removed, it is no longer necessary to call it.");
}

function sendHotkey(content: string) {
  window.top.postMessage({ type: "hotkey", content }, window.location.origin);
}

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);
window.addEventListener("beforeunload", onBeforeUnload);

let isBackspaceDown = false;

function onKeyDown(event: KeyboardEvent) {
  if ((dialogs.BaseDialog as any).activeDialog != null) return;

  const ctrlOrCmd = event.ctrlKey || event.metaKey;

  // Backspace
  if (event.keyCode === 8) isBackspaceDown = true;

  // Ctrl+N
  if (event.keyCode === 78 && ctrlOrCmd) {
    event.preventDefault();
    if (event.shiftKey) sendHotkey("newFolder");
    else sendHotkey("newAsset");
  }

  // Ctrl+O or Ctrl+P
  if ((event.keyCode === 79 || event.keyCode === 80) && ctrlOrCmd) {
    event.preventDefault(); sendHotkey("searchEntry");
  }

  // Ctrl+W
  if (event.keyCode === 87 && ctrlOrCmd) {
    event.preventDefault(); sendHotkey("closeTab");
  }

  // Ctrl+Tab or Ctrl+Shift+Tab
  if (event.keyCode === 9 && event.ctrlKey) {
    event.preventDefault();
    if (event.shiftKey) sendHotkey("previousTab");
    else sendHotkey("nextTab");
  }

  // F1
  if (event.keyCode === 112) {
    event.preventDefault();
    if (helpCallback != null) helpCallback();
  }

  // F5 or Cmd+P
  if (event.keyCode === 116 || (event.keyCode === 80 && event.metaKey)) {
    event.preventDefault(); sendHotkey("run");
  }

  // F6 or Cmd+Shift-P
  if (event.keyCode === 117 || (event.keyCode === 80 && event.metaKey && event.shiftKey)) {
    event.preventDefault(); sendHotkey("debug");
  }

  // F12
  if (event.keyCode === 123) {
    sendHotkey("devtools");
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.keyCode === 8 /* Backspace */) isBackspaceDown = false;
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (isBackspaceDown) {
    isBackspaceDown = false;
    event.returnValue = "You pressed backspace.";
    return "You pressed backspace.";
  }
  return null;
}
