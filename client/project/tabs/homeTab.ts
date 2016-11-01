// FIXME: This shouldn't be directly on the client since it comes from a plugin?

import { manifest } from "../network";
import * as tabs from "./";

let homeTab: HTMLLIElement;
export function setup(tab: HTMLLIElement) {
  homeTab = tab;
}

export function onMessageChat(message: string) {
  if (homeTab == null) return;

  const isHomeTabVisible = homeTab.classList.contains("active");
  if (isHomeTabVisible && !document.hidden) return;

  if (!isHomeTabVisible) homeTab.classList.add("unread");

  if (localStorage.getItem("superpowers-disable-notifications") != null) return;

  function doNotification() {
    const title = SupClient.i18n.t("project:header.notifications.new", { projectName: manifest.pub.name });
    const notification = new (window as any).Notification(title, { icon: "/images/icon.png", body: message });

    const closeTimeoutId = setTimeout(() => { notification.close(); }, 5000);

    notification.addEventListener("click", () => {
      window.focus();
      tabs.onActivate(homeTab);
      clearTimeout(closeTimeoutId);
      notification.close();
    });
  }

  if ((window as any).Notification.permission === "granted") doNotification();
  else if ((window as any).Notification.permission !== "denied") {
    (window as any).Notification.requestPermission((status: string) => {
      (window as any).Notification.permission = status;
      if ((window as any).Notification.permission === "granted") doNotification();
    });
  }
}
