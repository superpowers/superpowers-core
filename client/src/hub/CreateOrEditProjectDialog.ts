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

    // Prompt
    SupClient.html("div", "group", {
      parent: this.formElt,
      textContent: SupClient.i18n.t(this.existingProject == null ? "hub:newProject.prompt" : "hub:editDetails.prompt")
    });

    const containerElt = SupClient.html("div", "group", { parent: this.formElt, style: { display: "flex" }});

    // Icon
    this.iconInputElt = SupClient.html("input", { type: "file", hidden: true, accept: "image/png", parent: containerElt });

    const iconButtonElt = SupClient.html("button", {
      type: "button", parent: containerElt,
      style: {
        cursor: "pointer",
        background: "transparent",
        width: "72px", height: "72px",
        margin: "0", padding: "0", border: "0",
        fontSize: "0"
      }
    });
    iconButtonElt.addEventListener("click", () => this.iconInputElt.click());

    const iconSrc = options.existingProject == null ? "/images/default-project-icon.png" : (`/projects/${options.existingProject.id}/icon.png`);
    this.iconElt = SupClient.html("img", {
      src: iconSrc, draggable: false, parent: iconButtonElt,
      style: {
        width: "72px", height: "72px",
        border: "1px solid rgba(0,0,0,0.2)",
        borderRadius: "4px",
        background: "#eee"
      }
    });
    this.iconInputElt.addEventListener("change", this.onIconChange);

    const textContainerElt = SupClient.html("div", { parent: containerElt });
    textContainerElt.style.flex = "1";
    textContainerElt.style.display = "flex";
    textContainerElt.style.flexFlow = "column";
    textContainerElt.style.marginLeft = "0.5em";

    // Name
    this.nameInputElt = SupClient.html("input", {
      parent: textContainerElt,
      required: true,
      placeholder: SupClient.i18n.t("hub:newProject.namePlaceholder"),
      pattern: SupClient.namePattern,
      title: SupClient.i18n.t("common:namePatternDescription")
    });
    this.nameInputElt.style.marginBottom = "0.5em";

    // Description
    this.descriptionInputElt = SupClient.html("textarea", {
      parent: textContainerElt, placeholder: SupClient.i18n.t("hub:newProject.descriptionPlaceholder"),
      style: { flex: "1", resize: "none" }
    });
    this.descriptionInputElt.addEventListener("keypress", this.onFieldKeyDown);

    // Down
    const downElt = SupClient.html("div", { style: { display: "flex", alignItems: "center" } });

    if (options.existingProject == null) {
      // Project type
      this.projectTypeSelectElt = SupClient.html("select", { parent: this.formElt, style: { marginBottom: "0.5em" } });
      for (const systemId in systemsById) {
        const systemInfo = systemsById[systemId];

        const optGroupElt = SupClient.html("optgroup", {
          parent: this.projectTypeSelectElt,
          label: SupClient.i18n.t(`system-${systemId}:title`)
        });

        SupClient.html("option", {
          parent: optGroupElt, value: `${systemId}.empty`,
          textContent: SupClient.i18n.t("hub:newProject.emptyProject.title")
        });

        for (const templateName of systemInfo) {
          SupClient.html("option", {
            parent: optGroupElt, value: `${systemId}.${templateName}`,
            textContent: SupClient.i18n.t(`${systemId}-${templateName}:title`)
          });
        }
      }

      // Template description
      const descriptionContainerElt = SupClient.html("div", {
        parent: this.formElt,
        style: {
          backgroundColor: "#eee",
          border: "1px solid #ccc",
          padding: "0.5em",
          color: "#444",
          marginBottom: "0.5em"
        }
      });

      this.templateDescriptionElt = SupClient.html("div", "template-description", { parent: descriptionContainerElt });
      this.systemDescriptionElt = SupClient.html("div", "system-description", { parent: descriptionContainerElt });
      this.onProjectTypeChange();

      // Auto-open checkbox
      this.openCheckboxElt = SupClient.html("input", {
        parent: downElt,
        type: "checkbox", id: "auto-open-checkbox",
        checked: options.autoOpen,
        style: { margin: "0 0.5em 0 0" }
      });

      SupClient.html("label", {
        parent: downElt,
        textContent: SupClient.i18n.t("hub:newProject.autoOpen"),
        htmlFor: "auto-open-checkbox",
        style: { flex: "1", margin: "0" }
      });
    }

    this.formElt.appendChild(downElt);

    // Buttons
    const buttonsElt = SupClient.html("div", "buttons", { parent: downElt });
    if (options.existingProject != null) buttonsElt.style.flex = "1";
    buttonsElt.className = "buttons";

    const cancelButtonElt = SupClient.html("button", "cancel-button", {
      parent: buttonsElt,
      type: "button", textContent: SupClient.i18n.t("common:actions.cancel")
    });
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = SupClient.html("button", "validate-button", {
      textContent: SupClient.i18n.t(options.existingProject == null ? "common:actions.create" : "common:actions.update"),
    });

    if (navigator.platform === "Win32") buttonsElt.insertBefore(this.validateButtonElt, cancelButtonElt);
    else buttonsElt.appendChild(this.validateButtonElt);

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
