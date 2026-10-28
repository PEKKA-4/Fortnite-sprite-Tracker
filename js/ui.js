/**
 * Rendering only. Reads the DOM elements from index.html and draws a view model.
 * User-provided text is always set via textContent (never innerHTML),
 * so custom sprite names cannot inject markup.
 */
(function (app) {
  "use strict";

  const els = {
    seasonLabel: document.getElementById("season-label"),
    saveButton: document.getElementById("save-button"),
    saveStatus: document.getElementById("save-status"),
    fileNotice: document.getElementById("file-notice"),
    fileNoticeLoad: document.getElementById("file-notice-load"),
    fileNoticeKeep: document.getElementById("file-notice-keep"),
    foundBar: document.getElementById("found-bar"),
    foundCount: document.getElementById("found-count"),
    masteredBar: document.getElementById("mastered-bar"),
    masteredCount: document.getElementById("mastered-count"),
    filterButtons: Array.from(document.querySelectorAll(".filter")),
    search: document.getElementById("search"),
    storageWarning: document.getElementById("storage-warning"),
    list: document.getElementById("sprite-list"),
    emptyState: document.getElementById("empty-state"),
    addForm: document.getElementById("add-form"),
    addName: document.getElementById("add-name"),
    addRarity: document.getElementById("add-rarity"),
    addError: document.getElementById("add-error"),
    profileSelect: document.getElementById("profile-select"),
    profileName: document.getElementById("profile-name"),
    addProfileButton: document.getElementById("add-profile-button"),
    renameProfileButton: document.getElementById("rename-profile-button"),
    deleteProfileButton: document.getElementById("delete-profile-button"),
    profileError: document.getElementById("profile-error"),
    celebration: document.getElementById("celebration"),
    resetButton: document.getElementById("reset-button"),
  };

  const ICON_SIZES = { large: 56, small: 44 };

  const SAVE_STATUS_TEXT = {
    unsaved: "Not saved to the folder yet.",
    saved: "Folder file is up to date.",
    none: "",
  };

  // Icons that failed to load. They render as placeholders, so a re-render
  // (which happens on every click) does not request them again.
  const failedIcons = new Set();

  let currentSaveStatus = "none";
  let saveMessage = null; // { text, kind } from the last save attempt, shown until the next change
  let celebrationTimeout = 0;

  function createPlaceholder(label, size) {
    const placeholder = document.createElement("span");
    placeholder.className = "icon icon--placeholder icon--" + size;
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = label.charAt(0).toUpperCase();
    return placeholder;
  }

  /** `size` is a key of ICON_SIZES. Falls back to a letter placeholder if there is no image. */
  function createIcon(url, label, size) {
    if (!url || failedIcons.has(url)) return createPlaceholder(label, size);

    const image = document.createElement("img");
    image.className = "icon icon--" + size;
    image.width = ICON_SIZES[size];
    image.height = ICON_SIZES[size];
    image.alt = ""; // decorative: the name is always shown next to it
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = url;
    image.addEventListener(
      "error",
      () => {
        failedIcons.add(url);
        image.replaceWith(createPlaceholder(label, size));
      },
      { once: true }
    );
    return image;
  }

  function createCheckbox(sprite, variant, field, labelText) {
    const label = document.createElement("label");
    label.className = "check";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = variant[field];
    input.dataset.key = variant.key;
    input.dataset.field = field;
    // Full context for screen readers, since "Found" alone repeats for every variant.
    input.setAttribute("aria-label", labelText + ": " + variant.name + " " + sprite.name);

    const text = document.createElement("span");
    text.textContent = labelText;

    label.append(input, text);
    return label;
  }

  function createVariant(sprite, variant) {
    const item = document.createElement("li");
    item.className = "variant";
    if (variant.mastered) item.classList.add("variant--mastered");
    else if (variant.found) item.classList.add("variant--found");

    const name = document.createElement("span");
    name.className = "variant__name";
    name.textContent = variant.name;

    const checks = document.createElement("div");
    checks.className = "variant__checks";
    checks.append(createCheckbox(sprite, variant, "found", "Found"), createCheckbox(sprite, variant, "mastered", "Mastered"));

    const body = document.createElement("div");
    body.className = "variant__body";
    body.append(name, checks);

    item.append(createIcon(variant.iconUrl, sprite.name, "small"), body);
    return item;
  }

  function createTip(text, sources, label) {
    const tip = document.createElement("p");
    tip.className = "sprite__tip";
    tip.append(document.createTextNode(label + ": " + text));
    sources.forEach((source) => {
      tip.append(document.createTextNode(" "));
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.label;
      tip.append(link);
    });
    return tip;
  }

  function createRow(sprite) {
    const item = document.createElement("li");
    item.className = "sprite";
    if (sprite.mastered === sprite.total) item.classList.add("sprite--mastered");
    else if (sprite.found === sprite.total) item.classList.add("sprite--found");
    if (sprite.highlighted) item.classList.add("sprite--highlighted");

    const info = document.createElement("div");
    info.className = "sprite__info";

    const title = document.createElement("div");
    title.className = "sprite__title";

    const name = document.createElement("span");
    name.className = "sprite__name";
    name.textContent = sprite.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.dataset.rarity = sprite.rarity;
    badge.textContent = sprite.rarity;

    title.append(name, badge);
    info.append(title);

    if (sprite.source) {
      const source = document.createElement("p");
      source.className = "sprite__source";
      source.textContent = sprite.source;
      info.append(source);
    }

    if (sprite.generalLevelingTip) {
      info.append(
        createTip(sprite.generalLevelingTip.text, sprite.generalLevelingTip.sources, "General leveling tip")
      );
    }
    if (sprite.levelingTip) {
      info.append(createTip(sprite.levelingTip.text, sprite.levelingTip.sources, "Sprite tip"));
    }

    const summary = document.createElement("div");
    summary.className = "sprite__summary";

    const counts = document.createElement("span");
    counts.textContent =
      "Found " + sprite.found + "/" + sprite.total + " · Mastered " + sprite.mastered + "/" + sprite.total;
    summary.append(counts);

    const highlight = document.createElement("button");
    highlight.type = "button";
    highlight.className = "button button--ghost sprite__highlight";
    highlight.dataset.action = "highlight";
    highlight.dataset.id = sprite.id;
    highlight.textContent = sprite.highlighted ? "★" : "☆";
    highlight.setAttribute("aria-label", (sprite.highlighted ? "Remove " : "Add ") + sprite.name + " highlight");
    highlight.setAttribute("aria-pressed", String(sprite.highlighted));
    summary.append(highlight);

    if (sprite.updatedAt) {
      const updated = document.createElement("time");
      updated.className = "sprite__updated";
      updated.dateTime = sprite.updatedAt;
      updated.textContent = "Updated " + new Date(sprite.updatedAt).toLocaleDateString();
      summary.append(updated);
    }

    if (sprite.custom) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button--ghost";
      remove.dataset.action = "remove";
      remove.dataset.id = sprite.id;
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + sprite.name);
      summary.append(remove);
    }

    const header = document.createElement("div");
    header.className = "sprite__header";
    header.dataset.id = sprite.id;
    header.append(createIcon(sprite.iconUrl, sprite.name, "large"), info, summary);

    const variants = document.createElement("ul");
    variants.className = "variants";
    variants.append(...sprite.variants.map((variant) => createVariant(sprite, variant)));

    item.append(header, variants);
    return item;
  }

  /** Remembers which control had focus so a re-render does not drop it. */
  function captureFocus() {
    const active = document.activeElement;
    if (!active || !els.list.contains(active)) return null;
    const { key, id, field, action } = active.dataset;
    if (!key && !id) return null;
    return { key: key || null, id: id || null, field: field || null, action: action || null };
  }

  function restoreFocus(saved) {
    if (!saved) return;
    const match = Array.from(els.list.querySelectorAll("input[data-key], button[data-id]")).find(
      (node) =>
        (node.dataset.key || null) === saved.key &&
        (node.dataset.id || null) === saved.id &&
        (node.dataset.field || null) === saved.field &&
        (node.dataset.action || null) === saved.action
    );
    if (match) match.focus();
  }

  function renderProgress(stats) {
    const max = Math.max(stats.total, 1);
    els.foundBar.max = max;
    els.foundBar.value = stats.found;
    els.foundCount.textContent = stats.found + " / " + stats.total;
    els.masteredBar.max = max;
    els.masteredBar.value = stats.mastered;
    els.masteredCount.textContent = stats.mastered + " / " + stats.total;
  }

  /** The message of the last save attempt wins over the general status until something changes. */
  function renderSaveStatus() {
    const text = saveMessage ? saveMessage.text : SAVE_STATUS_TEXT[currentSaveStatus];
    els.saveStatus.textContent = text;
    els.saveStatus.dataset.kind = saveMessage ? saveMessage.kind : currentSaveStatus;
  }

  function renderProfiles(view) {
    const selected = view.activeProfileId;
    els.profileSelect.replaceChildren(
      ...view.profiles.map((profile) => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.name;
        return option;
      })
    );
    els.profileSelect.value = selected;
    const activeProfile = view.profiles.find((profile) => profile.id === selected);
    if (activeProfile && document.activeElement !== els.profileName) {
      els.profileName.value = activeProfile.name;
    }
    els.deleteProfileButton.disabled = view.profiles.length <= 1;
  }

  app.ui = {
    els,

    /** One-time setup that depends on the seed data. */
    init() {
      els.seasonLabel.textContent = app.SEASON.name + " (data checked " + app.SEASON.dataCheckedOn + ")";
      app.RARITIES.forEach((rarity) => {
        const option = document.createElement("option");
        option.value = rarity;
        option.textContent = rarity;
        els.addRarity.append(option);
      });
      els.addRarity.value = "Unknown";
    },

    /** view = { sprites, stats, filter, canPersist, profiles, activeProfileId, saveStatus, fileIsNewer } */
    render(view) {
      const focus = captureFocus();

      renderProgress(view.stats);

      els.filterButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.filter === view.filter));
      });

      els.storageWarning.hidden = view.canPersist;
      els.fileNotice.hidden = !view.fileIsNewer;

      currentSaveStatus = view.saveStatus;
      renderSaveStatus();
      renderProfiles(view);

      els.list.replaceChildren(...view.sprites.map((sprite) => createRow(sprite)));
      els.emptyState.hidden = view.sprites.length > 0;
      els.emptyState.textContent =
        view.filter === "highlighted"
          ? "No sprites are highlighted yet. Click a sprite or its star to highlight it."
          : view.filter === "recent"
            ? "No sprites have been updated yet."
            : "No sprites match this filter.";

      restoreFocus(focus);
    },

    showCelebration(message) {
      window.clearTimeout(celebrationTimeout);
      els.celebration.textContent = message;
      els.celebration.hidden = false;
      els.celebration.classList.remove("celebration--visible");
      window.requestAnimationFrame(() => els.celebration.classList.add("celebration--visible"));
      celebrationTimeout = window.setTimeout(() => {
        els.celebration.classList.remove("celebration--visible");
        window.setTimeout(() => {
          els.celebration.hidden = true;
        }, 250);
      }, 3500);
    },

    /** kind is "success", "info" or "error"; it only changes the color. */
    showSaveMessage(text, kind) {
      saveMessage = { text, kind };
      renderSaveStatus();
    },

    clearSaveMessage() {
      saveMessage = null;
    },

    showAddError(message) {
      els.addError.textContent = message;
      els.addError.hidden = false;
    },

    showProfileError(message) {
      els.profileError.textContent = message;
      els.profileError.hidden = false;
    },

    clearProfileError() {
      els.profileError.textContent = "";
      els.profileError.hidden = true;
    },

    clearAddError() {
      els.addError.textContent = "";
      els.addError.hidden = true;
    },
  };
})((window.SpriteTracker = window.SpriteTracker || {}));
