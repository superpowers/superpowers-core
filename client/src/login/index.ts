import "../window";

let port = (window.location.port.length === 0) ? "80" : window.location.port;

document.querySelector(".server-name").textContent = `${window.location.hostname} on port ${port}`;
document.querySelector("form.login").addEventListener("submit", onFormSubmit);

let serverPasswordElt = document.querySelector(".server-password") as HTMLInputElement;
let usernameElt = document.querySelector(".username") as HTMLInputElement;

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

function onFormSubmit(event: Event) {
  event.preventDefault();

  SupClient.cookies.set("supServerAuth", { serverPassword: serverPasswordElt.value, username: usernameElt.value }, { expires: 7 });
  window.location.replace(redirect);
}
