interface ExistingProject {
  id: string;
  name: string;
  description: string;
  system: string;
}

interface NewProjectCallback {
  (project: {
    name: string;
    description: string;
    system: string;
    icon: File;
  }, open: boolean): any;
}

export interface SystemsData {
  [value: string]: {
    title: string;
    templatesByName: { [name: string]: { title: string; description: string; } };
  };
}

export default class CreateOrEditProjectDialog extends SupClient.dialogs.BaseDialog {
  private systemsByName: SystemsData;

  private nameInputElt: HTMLInputElement;
  private descriptionInputElt: HTMLTextAreaElement;
  private iconInputElt: HTMLInputElement;
  private systemSelectElt: HTMLSelectElement;
  private templateSelectElt: HTMLSelectElement;
  private templateDescriptionElt: HTMLInputElement;
  private iconFile: File = null;
  private iconElt: HTMLImageElement;

  private existingProject: ExistingProject;
  private openCheckboxElt: HTMLInputElement;

  constructor(systemsByName: SystemsData,
  options: { autoOpen?: boolean, existingProject?: ExistingProject }, private callback: NewProjectCallback) {
    super();

    this.systemsByName = systemsByName;

    if (options == null) options = {};
    if (options.autoOpen == null) options.autoOpen = true;
    this.existingProject = options.existingProject;

    // Prompt name
    let labelElt = document.createElement("label");
    labelElt.textContent = (this.existingProject == null) ? "Enter a name and select a type for the new project." : "Edit the project's details.";
    this.formElt.appendChild(labelElt);

    let containerElt = document.createElement("div");
    containerElt.className = "group";
    containerElt.style.display = "flex";
    this.formElt.appendChild(containerElt);

    // Icon
    this.iconInputElt = document.createElement("input");
    this.iconInputElt.hidden = true;
    this.iconInputElt.type = "file";
    this.iconInputElt.accept = "image/png";
    containerElt.appendChild(this.iconInputElt);

    let iconButtonElt = document.createElement("button");
    iconButtonElt.type = "button";
    iconButtonElt.style.cursor = "pointer";
    iconButtonElt.style.border = "0";
    iconButtonElt.style.background = "transparent";
    iconButtonElt.style.width = "72px";
    iconButtonElt.style.height = "72px";
    iconButtonElt.style.margin = "0";
    iconButtonElt.style.padding = "0";
    iconButtonElt.style.fontSize = "0";
    containerElt.appendChild(iconButtonElt);

    iconButtonElt.addEventListener("click", () => this.iconInputElt.click());

    this.iconElt = new Image();
    if (options.existingProject == null) this.iconElt.src = "/images/default-project-icon.png";
    else this.iconElt.src = `/projects/${options.existingProject.id}/icon.png`;
    this.iconElt.draggable = false;
    this.iconElt.style.width = "72px";
    this.iconElt.style.height = "72px";
    this.iconElt.style.border = "1px solid rgba(0,0,0,0.2)";
    this.iconElt.style.borderRadius = "4px";
    this.iconElt.style.background = "#eee";
    iconButtonElt.appendChild(this.iconElt);
    this.iconInputElt.addEventListener("change", this.onIconChange);

    let textContainerElt = document.createElement("div");
    textContainerElt.style.flex = "1";
    textContainerElt.style.display = "flex";
    textContainerElt.style.flexFlow = "column";
    textContainerElt.style.marginLeft = "0.5em";
    containerElt.appendChild(textContainerElt);

    // Name
    this.nameInputElt = document.createElement("input");
    this.nameInputElt.required = true;
    this.nameInputElt.placeholder = "Project name";
    this.nameInputElt.pattern = SupClient.namePattern;
    this.nameInputElt.title = SupClient.namePatternDescription;
    textContainerElt.appendChild(this.nameInputElt);

    // Description
    this.descriptionInputElt = document.createElement("textarea");
    this.descriptionInputElt.style.flex = "1";
    (<any>this.descriptionInputElt.style).resize = "none";
    this.descriptionInputElt.placeholder = "Description (optional)";
    this.descriptionInputElt.addEventListener("keypress", this.onFieldKeyDown);
    textContainerElt.appendChild(this.descriptionInputElt);

    // Down
    let downElt = document.createElement("div");
    downElt.style.display = "flex";
    downElt.style.alignItems = "center";

    if (options.existingProject == null) {
      // System
      this.systemSelectElt = document.createElement("select");
      for (let systemName in systemsByName) {
        let optionElt = document.createElement("option");
        optionElt.value = systemName;
        optionElt.textContent = systemsByName[systemName].title;
        this.systemSelectElt.appendChild(optionElt);
      }
      this.systemSelectElt.size = 5;
      this.formElt.appendChild(this.systemSelectElt);

      // Template
      let templateRowElt = document.createElement("div");
      templateRowElt.style.display = "flex";
      this.formElt.appendChild(templateRowElt);

      let templateLabelElt = document.createElement("label");
      templateLabelElt.style.marginRight = "0.5em";
      templateLabelElt.style.marginTop = "0.2em";
      templateLabelElt.textContent = "Template";
      templateRowElt.appendChild(templateLabelElt);

      this.templateSelectElt = document.createElement("select");
      this.templateSelectElt.style.flex = "1";
      templateRowElt.appendChild(this.templateSelectElt);
      this.addTemplateOption("empty", "Empty");

      this.templateDescriptionElt = document.createElement("input");
      this.templateDescriptionElt.readOnly = true;
      this.formElt.appendChild(this.templateDescriptionElt);

      this.onSystemChange();

      // Auto-open checkbox
      this.openCheckboxElt = document.createElement("input");
      this.openCheckboxElt.id = "auto-open-checkbox";
      this.openCheckboxElt.type = "checkbox";
      this.openCheckboxElt.checked = options.autoOpen;
      this.openCheckboxElt.style.margin = "0 0.5em 0 0";
      downElt.appendChild(this.openCheckboxElt);

      let openLabelElt = document.createElement("label");
      openLabelElt.textContent = "Open after creation";
      openLabelElt.setAttribute("for", "auto-open-checkbox");
      openLabelElt.style.flex = "1";
      openLabelElt.style.margin = "0";
      downElt.appendChild(openLabelElt);
    }

    this.formElt.appendChild(downElt);

    // Buttons
    let buttonsElt = document.createElement("div");
    if (options.existingProject != null) buttonsElt.style.flex = "1";
    buttonsElt.className = "buttons";
    downElt.appendChild(buttonsElt);

    let cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = "Cancel";
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = options.existingProject == null ? "Create" : "Update";
    this.validateButtonElt.className = "validate-button";

    if (navigator.platform === "Win32") {
      buttonsElt.appendChild(this.validateButtonElt);
      buttonsElt.appendChild(cancelButtonElt);
    } else {
      buttonsElt.appendChild(cancelButtonElt);
      buttonsElt.appendChild(this.validateButtonElt);
    }

    // Existing project
    if (options.existingProject != null) {
      this.nameInputElt.value = options.existingProject.name;
      this.descriptionInputElt.value = options.existingProject.description;
    } else {
      this.systemSelectElt.addEventListener("change", this.onSystemChange);
      this.systemSelectElt.addEventListener("keydown", this.onFieldKeyDown);
      this.systemSelectElt.addEventListener("dblclick", () => { this.submit(); });

      this.templateSelectElt.addEventListener("change", this.onTemplateChange);
      this.templateSelectElt.addEventListener("keydown", this.onFieldKeyDown);
      this.templateSelectElt.addEventListener("dblclick", () => { this.submit(); });
    }

    this.nameInputElt.focus();
  }

  submit() {
    if (!super.submit()) return false;

    let project = {
      name: this.nameInputElt.value,
      description: this.descriptionInputElt.value,
      system: this.systemSelectElt != null ? this.systemSelectElt.value : null,
      template: this.templateSelectElt != null && this.templateSelectElt.value !== "empty" ? this.templateSelectElt.value : null,
      icon: this.iconFile
    };

    this.callback(project, this.openCheckboxElt.checked);
    return true;
  }

  cancel() {
    super.cancel();
    if (this.callback != null) this.callback(null, null);
  }

  private onIconChange = (event: UIEvent) => {
    if (this.iconInputElt.files.length === 0) {
      this.iconFile = null;
      if (this.existingProject == null) this.iconElt.src = "/images/default-project-icon.png";
      else this.iconElt.src = `/projects/${this.existingProject.id}/icon.png`;
    } else {
      this.iconFile = this.iconInputElt.files[0];
      let reader = new FileReader();
      reader.addEventListener("load", (event) => { this.iconElt.src = (<any>event.target).result; });
      reader.readAsDataURL(this.iconFile);
    }
  };

  private onFieldKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13 /* Return */) {
      event.preventDefault();
      this.submit();
    }
  };

  private addTemplateOption(name: string, title: string) {
    let optionElt = document.createElement("option");
    optionElt.value = name;
    optionElt.textContent = title;
    this.templateSelectElt.appendChild(optionElt);
  }

  private onSystemChange = () => {
    while (this.templateSelectElt.children.length > 1) {
      let childElt = this.templateSelectElt.children[1];
      childElt.parentElement.removeChild(childElt);
    }

    let templatesByName = this.systemsByName[this.systemSelectElt.value].templatesByName;
    for (let templateName in templatesByName)
      this.addTemplateOption(templateName, templatesByName[templateName].title);
    this.onTemplateChange();
  };

  private onTemplateChange = () => {
    let template = this.systemsByName[this.systemSelectElt.value].templatesByName[this.templateSelectElt.value];
    this.templateDescriptionElt.value = template != null ? template.description : "An empty template to start fresh";
  };
}
