import "./servers";
import "./settings";
import "./community";

// Panes
let paneButtonsContainer = document.querySelector(".pane-buttons") as HTMLDivElement;
let panesContainer = document.querySelector(".panes") as HTMLDivElement;

for (let i = 0; i < paneButtonsContainer.children.length; i++) {
  ((button: HTMLButtonElement, i: number) => {
    button.addEventListener("click", (event) => {
      (paneButtonsContainer.querySelector("button.active") as HTMLButtonElement).classList.remove("active");
      (panesContainer.querySelector(".active") as HTMLDivElement).classList.remove("active");
      (event.target as HTMLButtonElement).classList.add("active");
      (panesContainer.children[i] as HTMLDivElement).classList.add("active");
    });
  })(paneButtonsContainer.children[i] as HTMLButtonElement, i);
}

(paneButtonsContainer.children[0] as HTMLButtonElement).classList.add("active");
(panesContainer.children[0] as HTMLDivElement).classList.add("active");
