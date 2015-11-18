export function handleError(error:string) {
  document.body.innerHTML = "";
  if (error === "invalidCredentials") {
    promptServerPassword((serverPassword) => {
      promptUsername((username) => {
        setupAuth(serverPassword, username);
      });
    });
  }
  else if (error === "invalidUsername") {
    promptUsername((username) => {
      setupAuth("", username);
    });
  }
}

function promptServerPassword(callback: (password: string) => any) {
  SupClient.dialogs.prompt("Please enter the server password.", "", "", "Connect", { type: "password" }, callback);
}

function promptUsername(callback: (username: string) => any) {
  SupClient.dialogs.prompt("Please choose a username.", "", "", "Connect", { pattern: "[A-Za-z0-9_]{3,20}" }, callback);
}

function setupAuth(serverPassword: string, username: string) {
  localStorage.setItem("supServerAuth", JSON.stringify({ serverPassword, username }));
  window.location.reload();
}
