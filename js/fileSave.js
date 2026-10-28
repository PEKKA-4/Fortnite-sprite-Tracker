/**
 * Writes the save file into the project folder.
 *
 * Browsers cannot write files silently. In Chrome and Edge the File System Access API
 * lets the user pick the project folder once; after that this page can overwrite
 * saves/progress.js without asking again until the page is reloaded.
 * Other browsers get a normal download instead, and the user moves the file by hand.
 *
 * No business rules here: it only moves text into a file.
 */
(function (app) {
  "use strict";

  const PROJECT_MARKER = "index.html"; // proves the picked folder is the project folder
  const SAVE_DIR = "saves";
  const SAVE_FILE = "progress.js";
  // Errors that mean "the remembered folder is not usable any more, ask again".
  const STALE_HANDLE_ERRORS = ["NotAllowedError", "NotFoundError", "InvalidStateError", "SecurityError"];

  // Remembered for this page session only; the browser asks again after a reload.
  let projectDir = null;

  function errorName(error) {
    return error && typeof error === "object" ? error.name : "";
  }

  function canWriteToFolders() {
    return typeof window.showDirectoryPicker === "function";
  }

  /** Returns the folder handle, or null if the picked folder is not the project folder. */
  async function pickProjectFolder() {
    const handle = await window.showDirectoryPicker({ id: "sprite-tracker", mode: "readwrite" });
    try {
      await handle.getFileHandle(PROJECT_MARKER);
    } catch (error) {
      if (errorName(error) === "NotFoundError") return null;
      throw error;
    }
    return handle;
  }

  async function writeSaveFile(projectFolder, content) {
    const saveFolder = await projectFolder.getDirectoryHandle(SAVE_DIR, { create: true });
    const fileHandle = await saveFolder.getFileHandle(SAVE_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(content);
      await writable.close();
    } catch (error) {
      // Abort so a half-written file never replaces the old one.
      try {
        await writable.abort();
      } catch (ignored) {
        // Already closed, nothing to undo.
      }
      throw error;
    }
  }

  async function saveToFolder(content) {
    if (projectDir) {
      try {
        await writeSaveFile(projectDir, content);
        return { status: "saved" };
      } catch (error) {
        projectDir = null;
        if (!STALE_HANDLE_ERRORS.includes(errorName(error))) throw error;
        // Otherwise fall through and ask for the folder again.
      }
    }

    let handle;
    try {
      handle = await pickProjectFolder();
    } catch (error) {
      if (errorName(error) === "AbortError") return { status: "cancelled" };
      throw error;
    }
    if (!handle) return { status: "wrong-folder" };

    await writeSaveFile(handle, content);
    projectDir = handle;
    return { status: "saved" };
  }

  function download(content) {
    const blob = new Blob([content], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = SAVE_FILE;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  app.fileSave = {
    /**
     * Resolves to { status } where status is one of:
     *  "saved"       written into saves/progress.js in the project folder
     *  "downloaded"  browser cannot write into folders; the file was downloaded instead
     *  "cancelled"   the user closed the folder picker
     *  "wrong-folder" the picked folder does not contain index.html
     * Rejects on unexpected errors (e.g. disk full).
     */
    async save(content) {
      if (canWriteToFolders()) return saveToFolder(content);
      download(content);
      return { status: "downloaded" };
    },
  };
})((window.SpriteTracker = window.SpriteTracker || {}));
