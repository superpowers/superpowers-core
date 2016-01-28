interface ExistingProject {
  id: string;
  name: string;
  description: string;
  systemId: string;
}

type NewProjectResult = {
  project: {
    name: string;
    description: string;
    systemId: string;
    icon: File;
  };
  open: boolean;
}

export interface SystemsData {
  [value: string]: string[];
}

export default class CreateOrEditProjectDialog extends SupClient.Dialogs.BaseDialog<NewProjectResult> {
  private systemsById: SystemsData;

  private nameInputElt: HTMLInputElement;
  private descriptionInputElt: HTMLTextAreaElement;
  private iconInputElt: HTMLInputElement;

  private projectType: { systemId: string; templateName: string; };
  private projectTypeSelectElt: HTMLSelectElement;
  private systemDescriptionElt: HTMLDivElement;
  private templateDescriptionElt: HTMLDivElement;
  private iconFile: File = null;
  private iconElt: HTMLImageElement;

  private existingProject: ExistingProject;
  private openCheckboxElt: HTMLInputElement;

  constructor(systemsById: SystemsData,
  options: { autoOpen?: boolean, existingProject?: ExistingProject }, callback: (result: NewProjectResult) => void) {
    super(callback);

    this.systemsById = systemsById;

    if (options == null) options = {};
    if (options.autoOpen == null) options.autoOpen = true;
    this.existingProject = options.existingProject;

    // Prompt name
    const labelElt = document.createElement("label");
    if (this.existingProject == null) labelElt.textContent = SupClient.i18n.t("hub:newProject.prompt");
    else labelElt.textContent = SupClient.i18n.t("hub:editDetails.prompt");
    this.formElt.appendChild(labelElt);

    const containerElt = document.createElement("div");
    containerElt.className = "group";
    containerElt.style.display = "flex";
    this.formElt.appendChild(containerElt);

    // Icon
    this.iconInputElt = document.createElement("input");
    this.iconInputElt.hidden = true;
    this.iconInputElt.type = "file";
    this.iconInputElt.accept = "image/png";
    containerElt.appendChild(this.iconInputElt);

    const iconButtonElt = document.createElement("button");
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

    const textContainerElt = document.createElement("div");
    textContainerElt.style.flex = "1";
    textContainerElt.style.display = "flex";
    textContainerElt.style.flexFlow = "column";
    textContainerElt.style.marginLeft = "0.5em";
    containerElt.appendChild(textContainerElt);

    // Name
    this.nameInputElt = document.createElement("input");
    this.nameInputElt.required = true;
    this.nameInputElt.placeholder = SupClient.i18n.t("hub:newProject.namePlaceholder");
    this.nameInputElt.pattern = SupClient.namePattern;
    this.nameInputElt.title = SupClient.i18n.t("common:namePatternDescription");
    textContainerElt.appendChild(this.nameInputElt);

    // Description
    this.descriptionInputElt = document.createElement("textarea");
    this.descriptionInputElt.style.flex = "1";
    (this.descriptionInputElt.style as any).resize = "none";
    this.descriptionInputElt.placeholder = SupClient.i18n.t("hub:newProject.descriptionPlaceholder");
    this.descriptionInputElt.addEventListener("keypress", this.onFieldKeyDown);
    textContainerElt.appendChild(this.descriptionInputElt);

    // Down
    const downElt = document.createElement("div");
    downElt.style.display = "flex";
    downElt.style.alignItems = "center";

    if (options.existingProject == null) {
      // Project type
      this.projectTypeSelectElt = document.createElement("select");
      for (const systemId in systemsById) {
        const systemInfo = systemsById[systemId];

        const optGroupElt = document.createElement("optgroup");
        optGroupElt.label = SupClient.i18n.t(`system-${systemId}:title`);
        this.projectTypeSelectElt.appendChild(optGroupElt);

        const emptyOptionElt = document.createElement("option");
        emptyOptionElt.value = `${systemId}.empty`;
        emptyOptionElt.textContent = SupClient.i18n.t("hub:newProject.emptyProject.title");
        optGroupElt.appendChild(emptyOptionElt);

        for (const templateName of systemInfo) {
          const optionElt = document.createElement("option");
          optionElt.value = `${systemId}.${templateName}`;
          optionElt.textContent = SupClient.i18n.t(`${systemId}-${templateName}:title`);
          optGroupElt.appendChild(optionElt);
        }
      }
      this.formElt.appendChild(this.projectTypeSelectElt);

      // Template description
      const descriptionContainerElt = document.createElement("div");
      descriptionContainerElt.style.backgroundColor = "#eee";
      descriptionContainerElt.style.border = "1px solid #ccc";
      descriptionContainerElt.style.padding = "0.5em";
      descriptionContainerElt.style.color = "#444";
      descriptionContainerElt.style.marginBottom = "0.5em";

      this.templateDescriptionElt = document.createElement("div");
      this.templateDescriptionElt.className = "template-description";
      descriptionContainerElt.appendChild(this.templateDescriptionElt);

      this.systemDescriptionElt = document.createElement("div");
      this.systemDescriptionElt.className = "system-description";
      descriptionContainerElt.appendChild(this.systemDescriptionElt);

      this.formElt.appendChild(descriptionContainerElt);
      this.onProjectTypeChange();

      // Auto-open checkbox
      this.openCheckboxElt = document.createElement("input");
      this.openCheckboxElt.id = "auto-open-checkbox";
      this.openCheckboxElt.type = "checkbox";
      this.openCheckboxElt.checked = options.autoOpen;
      this.openCheckboxElt.style.margin = "0 0.5em 0 0";
      downElt.appendChild(this.openCheckboxElt);

      const openLabelElt = document.createElement("label");
      openLabelElt.textContent = SupClient.i18n.t("hub:newProject.autoOpen");
      openLabelElt.setAttribute("for", "auto-open-checkbox");
      openLabelElt.style.flex = "1";
      openLabelElt.style.margin = "0";
      downElt.appendChild(openLabelElt);
    }

    this.formElt.appendChild(downElt);

    // Buttons
    const buttonsElt = document.createElement("div");
    if (options.existingProject != null) buttonsElt.style.flex = "1";
    buttonsElt.className = "buttons";
    downElt.appendChild(buttonsElt);

    const cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = SupClient.i18n.t("common:actions.cancel");
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = document.createElement("button");
    if (options.existingProject == null) this.validateButtonElt.textContent = SupClient.i18n.t("common:actions.create");
    else this.validateButtonElt.textContent = SupClient.i18n.t("common:actions.update");
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
      this.projectTypeSelectElt.addEventListener("change", this.onProjectTypeChange);
      this.projectTypeSelectElt.addEventListener("keydown", this.onFieldKeyDown);
    }

    this.nameInputElt.focus();
  }

  submit() {
    let systemId: string = null;
    let templateName: string = null;
    if (this.projectTypeSelectElt != null) [ systemId, templateName ] = this.projectTypeSelectElt.value.split(".");

    const project = {
      name: this.nameInputElt.value,
      description: this.descriptionInputElt.value,
      systemId,
      template: templateName !== "empty" ? templateName : null,
      icon: this.iconFile
    };

    super.submit({ project, open: (this.openCheckboxElt != null) ? this.openCheckboxElt.checked : null });
  }

  private onIconChange = (event: UIEvent) => {
    if (this.iconInputElt.files.length === 0) {
      this.iconFile = null;
      if (this.existingProject == null) this.iconElt.src = "/images/default-project-icon.png";
      else this.iconElt.src = `/projects/${this.existingProject.id}/icon.png`;
    } else {
      this.iconFile = this.iconInputElt.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", (event) => { this.iconElt.src = (event.target as any).result; });
      reader.readAsDataURL(this.iconFile);
    }
  };

  private onFieldKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13 /* Return */) {
      event.preventDefault();
      this.submit();
    }
  };

  private onProjectTypeChange = () => {
    if (this.projectType != null) {
      const path = `${this.projectType.systemId}.${this.projectType.templateName}`;
      const oldOptionElt = this.projectTypeSelectElt.querySelector(`option[value="${path}"]`);
      const oldTemplate = this.getTemplate(this.projectType.systemId, this.projectType.templateName);
      oldOptionElt.textContent =  oldTemplate.title;
    }

    const [ systemId, templateName ] = this.projectTypeSelectElt.value.split(".");
    this.projectType = { systemId, templateName };

    const template = this.getTemplate(systemId, templateName);
    const systemTitle = SupClient.i18n.t(`system-${systemId}:title`);
    this.projectTypeSelectElt.querySelector("option:checked").textContent = `${systemTitle} — ${template.title}`;
    this.templateDescriptionElt.textContent = template.description;

    const systemDescription = SupClient.i18n.t(`system-${systemId}:description`);
    this.systemDescriptionElt.textContent = systemDescription;

    if (systemDescription.length === 0 && template.description.length === 0) {
      this.systemDescriptionElt.textContent = "(No description provided)";
    }
  };

  private getTemplate(systemId: string, templateName: string) {
    if (templateName !== "empty") {
      return {
        title: SupClient.i18n.t(`${systemId}-${templateName}:title`),
        description: SupClient.i18n.t(`${systemId}-${templateName}:description`)
      };
    }

    return {
      title: SupClient.i18n.t("hub:newProject.emptyProject.title"),
      description: SupClient.i18n.t("hub:newProject.emptyProject.description")
    };
  }
}
