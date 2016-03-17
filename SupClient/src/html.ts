const specialOptionKeys = [ "parent", "style", "dataset" ];

export default function html(tag: string, classList: string|string[], options?: SupClient.HTMLInputOptions) {
  if (options == null) {
    if (typeof classList === "object" && !Array.isArray(classList)) {
      options = classList;
      classList = null;
    } else {
      options = {};
    }
  }
  if (typeof classList === "string") classList = [ classList ] as any;

  const elt = document.createElement(tag);
  if (classList != null) {
    // NOTE: `elt.classList.add.apply(elt, classList);`
    // throws IllegalInvocationException at least in Chrome
    for (const name of classList) elt.classList.add(name);
  }

  for (const key in options) {
    if (specialOptionKeys.indexOf(key) !== -1) continue;
    const value = (options as any)[key];
    (elt as any)[key] = value;
  }

  if (options.parent != null) options.parent.appendChild(elt);
  if (options.style != null) for (const key in options.style) (elt.style as any)[key] = (options.style as any)[key];
  if (options.dataset != null) for (const key in options.dataset) elt.dataset[key] = options.dataset[key];

  return elt;
}
