const port = (window.location.port.length === 0) ? (window.location.protocol === "https" ? "443" : "80") : window.location.port;

const connectingElt = document.querySelector(".connecting") as HTMLDivElement;
const formElt = document.querySelector(".login") as HTMLDivElement;

formElt.hidden = true;

let serverName: string;

SupClient.fetch("superpowers.json", "json", (err, data) => {
  serverName = data.serverName;
  SupClient.i18n.load([{ root: "/", name: "hub" }, { root: "/", name: "login" }], start);
});

function start() {
  if (serverName == null) serverName = SupClient.i18n.t(`hub:serverAddress`, { hostname: window.location.hostname, port });
  document.querySelector(".server-name").textContent = serverName;

  formElt.hidden = false;
  connectingElt.hidden = true;
}
