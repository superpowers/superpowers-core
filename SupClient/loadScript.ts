export default function loadScript(url: string, callback: Function) {
  const script = document.createElement("script");
  script.src = url;
  script.addEventListener("load", () => { callback(); } );
  script.addEventListener("error", () => { callback(); } );
  document.body.appendChild(script);
}
