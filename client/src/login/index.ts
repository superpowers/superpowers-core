import "../window";

let port = (window.location.port.length === 0) ? "80" : window.location.port;

const connectionInfoElt = document.querySelector(".connection") as HTMLDivElement;
const formElt = document.querySelector(".login") as HTMLDivElement;
let serverPasswordElt = document.querySelector(".server-password") as HTMLInputElement;
let usernameElt = document.querySelector(".username") as HTMLInputElement;

formElt.hidden = true;
connectionInfoElt.hidden = false;

let supServerAuth = SupClient.cookies.getJSON("supServerAuth");

// NOTE: Superpowers used to store auth info in local storage
if (supServerAuth == null) {
  let supServerAuthJSON = localStorage.getItem("supServerAuth");
  if (supServerAuthJSON != null) supServerAuth = JSON.parse(supServerAuthJSON);
}

if (supServerAuth != null) {
  serverPasswordElt.value = supServerAuth.serverPassword;
  usernameElt.value = supServerAuth.username;
}

let redirect: string = (SupClient.query as any).redirect;
if (redirect == null) redirect = "/";

SupClient.fetch("superpowers.json", "json", (err, data) => {
  serverPasswordElt.parentElement.parentElement.hidden = data.hasPassword === false;
  SupClient.i18n.load([{ root: "/", name: "hub" }, { root: "/", name: "login" }], start);
});

function start() {
  formElt.hidden = false;
  connectionInfoElt.hidden = true;
  document.querySelector(".server-name").textContent = SupClient.i18n.t("hub:serverAddress", { hostname: window.location.hostname, port });
  document.querySelector("form.login").addEventListener("submit", onFormSubmit);
}

function onFormSubmit(event: Event) {
  event.preventDefault();

  SupClient.cookies.set("supServerAuth", { serverPassword: serverPasswordElt.value, username: usernameElt.value }, { expires: 7 });
  window.location.replace(redirect);
}
