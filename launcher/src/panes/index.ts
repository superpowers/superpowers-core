import "./servers";
import "./settings";
import "./community";

// Panes
let paneButtonsContainer = (document as HTMLDivElement).querySelector(".pane-buttons");
let panesContainer = (document as HTMLDivElement).querySelector(".panes");

for (let i = 0; i < paneButtonsContainer.children.length; i++) {
  ((button: HTMLButtonElement, i: number) => {
    button.addEventListener("click", (event) => {
      ((pane as HTMLButtonElement)ButtonsContainer.querySelector("button.active")).classList.remove("active");
      ((panes as HTMLDivElement)Container.querySelector(".active")).classList.remove("active");
      ((event as HTMLButtonElement).target).classList.add("active");
      ((panes as HTMLDivElement)Container.children[i]).classList.add("active");
    });
  })((pane as HTMLButtonElement)ButtonsContainer.children[i], i);
}

((pane as HTMLButtonElement)ButtonsContainer.children[0]).classList.add("active");
((panes as HTMLDivElement)Container.children[0]).classList.add("active");
