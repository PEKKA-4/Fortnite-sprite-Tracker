/**
 * Entry point: wires user events to the store and re-renders on every change.
 * View state (filter, search text) lives here because it is not saved.
 */
(function (app) {
  "use strict";

  const { store, ui, fileSave, storage } = app;
  const { els } = ui;

  const view = { filter: "all", query: "" };

  function render() {
    ui.render({
      sprites: store.getVisibleSprites(view.filter, view.query),
      stats: store.getStats(),
      filter: view.filter,
      canPersist: store.canPersist(),
      profiles: store.getProfiles(),
      activeProfileId: store.getActiveProfileId(),
      saveStatus: store.getSaveStatus(),
      fileIsNewer: store.hasNewerSaveFile(),
    });
  }

  function timeLabel() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function handleSave() {
    if (
      store.hasNewerSaveFile() &&
      !window.confirm(
        "The save file in the folder is newer than the progress in this browser.\n" +
          "Saving now replaces it with this browser's progress. Continue?"
      )
    ) {
      return;
    }

    els.saveButton.disabled = true;
    try {
      const result = await fileSave.save(store.createSaveFileContent());
      if (result.status === "saved") {
        // markFileSaved() re-renders and clears old messages, so show the new one after it.
        store.markFileSaved();
        ui.showSaveMessage("Saved to " + storage.SAVE_FILE_PATH + " at " + timeLabel() + ".", "success");
      } else if (result.status === "downloaded") {
        ui.showSaveMessage(
          "Your browser cannot write into folders, so progress.js was downloaded. " +
            "Move it into the saves folder and replace the old file.",
          "info"
        );
      } else if (result.status === "wrong-folder") {
        ui.showSaveMessage("That folder does not contain index.html. Pick the project folder.", "error");
      }
      // "cancelled": the user closed the picker, so keep the normal status.
    } catch (error) {
      const reason = error && error.message ? error.message : "unknown error";
      ui.showSaveMessage("Could not save: " + reason, "error");
    } finally {
      els.saveButton.disabled = false;
    }
  }

  function bindEvents() {
    // Checkboxes (event delegation, so re-rendered rows keep working)
    els.list.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;
      const spriteId = input.dataset.key.split(":")[0];
      const previous = store.getSprites().find((sprite) => sprite.id === spriteId);
      if (input.dataset.field === "found") store.setFound(input.dataset.key, input.checked);
      if (input.dataset.field === "mastered") store.setMastered(input.dataset.key, input.checked);
      if (input.dataset.field === "mastered" && input.checked && previous && previous.mastered < previous.total) {
        const mastered = store.getSprites().find((sprite) => sprite.id === spriteId);
        if (mastered && mastered.mastered === mastered.total) {
          const stats = store.getStats();
          ui.showCelebration(
            stats.mastered === stats.total ? "Collection mastered! Amazing work!" : mastered.name + " mastered!"
          );
        }
      }
    });

    els.list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (button && button.dataset.action === "highlight") {
        store.toggleHighlighted(button.dataset.id);
        return;
      }
      if (button && button.dataset.action === "remove") {
        if (window.confirm("Remove this sprite and its progress?")) {
          store.removeSprite(button.dataset.id);
        }
        return;
      }
      const header = event.target.closest(".sprite__header");
      if (header && !event.target.closest("button, a, input, label")) {
        store.toggleHighlighted(header.dataset.id);
      }
    });

    els.filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        view.filter = button.dataset.filter;
        render();
      });
    });

    els.search.addEventListener("input", () => {
      view.query = els.search.value;
      render();
    });

    els.addForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = store.addSprite(els.addName.value, els.addRarity.value);
      if (!result.ok) {
        ui.showAddError(result.error);
        els.addName.focus();
        return;
      }
      ui.clearAddError();
      els.addForm.reset();
      els.addRarity.value = "Unknown";
      // Make sure the new sprite is visible right away.
      view.filter = "all";
      view.query = "";
      els.search.value = "";
      render();
    });

    els.profileSelect.addEventListener("change", () => {
      ui.clearProfileError();
      store.switchProfile(els.profileSelect.value);
    });

    els.addProfileButton.addEventListener("click", () => {
      const result = store.addProfile(els.profileName.value);
      if (!result.ok) {
        ui.showProfileError(result.error);
        els.profileName.focus();
        return;
      }
      ui.clearProfileError();
      els.profileName.value = "";
    });

    els.renameProfileButton.addEventListener("click", () => {
      const result = store.renameActiveProfile(els.profileName.value);
      if (!result.ok) {
        ui.showProfileError(result.error);
        els.profileName.focus();
        return;
      }
      ui.clearProfileError();
    });

    els.deleteProfileButton.addEventListener("click", () => {
      const profile = store.getProfiles().find((item) => item.id === store.getActiveProfileId());
      if (!profile || !window.confirm('Delete the "' + profile.name + '" profile and its progress?')) return;
      const result = store.deleteActiveProfile();
      if (!result.ok) ui.showProfileError(result.error);
      else ui.clearProfileError();
    });

    els.saveButton.addEventListener("click", handleSave);
    els.fileNoticeLoad.addEventListener("click", () => store.useSaveFile());
    els.fileNoticeKeep.addEventListener("click", () => store.dismissSaveFile());

    els.resetButton.addEventListener("click", () => {
      if (window.confirm("Reset all Found and Mastered checkboxes for this profile?")) {
        store.resetProgress();
      }
    });
  }

  store.init();
  ui.init();
  store.subscribe(() => {
    ui.clearSaveMessage();
    render();
  });
  bindEvents();
  render();
})(window.SpriteTracker);
