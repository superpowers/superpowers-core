import "../window";

const port = (window.location.port.length === 0) ? (window.location.protocol === "https" ? "443": "80")  : window.location.port;

const connectingElt = document.querySelector(".connecting") as HTMLDivElement;
const formElt = document.querySelector(".login") as HTMLDivElement;
const serverPasswordElt = document.querySelector(".server-password") as HTMLInputElement;
const usernameElt = document.querySelector(".username") as HTMLInputElement;

formElt.hidden = true;

let supServerAuth = SupClient.cookies.getJSON("supServerAuth");

// NOTE: Superpowers used to store auth info in local storage
if (supServerAuth == null) {
  const supServerAuthJSON = localStorage.getItem("supServerAuth");
  if (supServerAuthJSON != null) supServerAuth = JSON.parse(supServerAuthJSON);
}

if (supServerAuth != null) {
  serverPasswordElt.value = supServerAuth.serverPassword;
  usernameElt.value = supServerAuth.username;
}

const redirect: string = (SupClient.query as any).redirect != null ? (SupClient.query as any).redirect : "/";

SupClient.fetch("superpowers.json", "json", (err, data) => {
  serverPasswordElt.parentElement.parentElement.hidden = data.hasPassword === false;
  SupClient.i18n.load([{ root: "/", name: "hub" }, { root: "/", name: "login" }], start);
});

function start() {
  formElt.hidden = false;
  connectingElt.hidden = true;
  document.querySelector(".server-name").textContent = SupClient.i18n.t("hub:serverAddress", { hostname: window.location.hostname, port });
  document.querySelector("form.login").addEventListener("submit", onFormSubmit);
}

function onFormSubmit(event: Event) {
  event.preventDefault();

  SupClient.cookies.set("supServerAuth", { serverPassword: serverPasswordElt.value, username: usernameElt.value }, { expires: 7 });
  window.location.replace(redirect);
}
