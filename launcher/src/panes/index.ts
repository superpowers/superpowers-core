import "./servers";
import "./settings";
import "./community";

// Panes
let paneButtonsContainer = <HTMLDivElement>document.querySelector(".pane-buttons");
let panesContainer = <HTMLDivElement>document.querySelector(".panes");

for (let i = 0; i < paneButtonsContainer.children.length; i++) {
  ((button: HTMLButtonElement, i: number) => {
    button.addEventListener("click", (event) => {
      (<HTMLButtonElement>paneButtonsContainer.querySelector("button.active")).classList.remove("active");
      (<HTMLDivElement>panesContainer.querySelector(".active")).classList.remove("active");
      (<HTMLButtonElement>event.target).classList.add("active");
      (<HTMLDivElement>panesContainer.children[i]).classList.add("active");
    });
  })(<HTMLButtonElement>paneButtonsContainer.children[i], i);
}

(<HTMLButtonElement>paneButtonsContainer.children[0]).classList.add("active");
(<HTMLDivElement>panesContainer.children[0]).classList.add("active");
