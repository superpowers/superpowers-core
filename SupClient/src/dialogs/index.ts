/// <reference path="../../SupClient.d.ts" />

/* tslint:disable:no-unused-variable */
import BaseDialog from "./BaseDialog";
import PromptDialog from "./PromptDialog";
import ConfirmDialog from "./ConfirmDialog";
import InfoDialog from "./InfoDialog";
import SelectDialog from "./SelectDialog";
/* tslint:enable:no-unused-variable */
export { BaseDialog, PromptDialog, ConfirmDialog, InfoDialog, SelectDialog };

export function cancelDialogIfAny() {
  if (BaseDialog.activeDialog != null) BaseDialog.activeDialog.cancel();
}
