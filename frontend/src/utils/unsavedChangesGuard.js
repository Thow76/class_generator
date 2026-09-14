export const discardUnsavedChangesMessage =
  "You have unsaved changes. Continue without saving?";

export function createBeforeUnloadHandler(hasUnsavedChanges) {
  return function handleBeforeUnload(event) {
    if (!hasUnsavedChanges) return undefined;

    event.preventDefault();
    event.returnValue = "";
    return "";
  };
}
