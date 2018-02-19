const port = (window.location.port.length === 0) ? (window.location.protocol === "https" ? "443" : "80") : window.location.port;

const connectingElt = document.querySelector(".connecting") as HTMLDivElement;
const formElt = document.querySelector(".login") as HTMLDivElement;
const serverPasswordElt = document.querySelector(".server-password") as HTMLInputElement;

formElt.hidden = true;

SupClient.fetch("superpowers.json", "json", (err, data) => {
  serverPasswordElt.parentElement.parentElement.hidden = data.hasPassword === false;
  SupClient.i18n.load([{ root: "/", name: "hub" }, { root: "/", name: "login" }], start);

  let serverName = data.serverName;
  if (serverName == null) serverName = SupClient.i18n.t(`hub:serverAddress`, { hostname: window.location.hostname, port });
  document.querySelector(".server-name").textContent = serverName;
});

function start() {
  formElt.hidden = false;
  connectingElt.hidden = true;
}
