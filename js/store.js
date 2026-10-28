/**
 * Application state and rules. No DOM access in this file.
 *
 * State:
 *  - progress:      { ["spriteId:variantId"]: { found, mastered } }
 *  - customSprites: sprites the user added on top of the seed data (Base variant only)
 *  - savedAt:       ISO time of the last change ("" if unknown), used to compare with the save file
 *
 * Rules (applied per variant):
 *  - Mastering a variant also marks it as found.
 *  - Un-finding a variant also removes its mastery.
 */
(function (app) {
  "use strict";

  const MAX_NAME_LENGTH = 40;
  const MAX_PROFILE_NAME_LENGTH = 30;
  const FILTERS = ["all", "not-found", "not-mastered", "mastered", "recent", "highlighted"];
  const KEY_SEPARATOR = ":";
  const BASE_ONLY = Object.freeze(["base"]);
  const ISO_TIME = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
  let generatedProfileId = 0;

  const variantNames = new Map(app.VARIANTS.map((variant) => [variant.id, variant.name]));
  const listeners = [];
  let profiles = [{ id: "player-1", name: "Player 1", progress: {}, highlighted: [], recentlyUpdated: {} }];
  let activeProfileId = "player-1";
  let progress = {};
  let highlightedSprites = new Set();
  let recentlyUpdated = {};
  let customSprites = [];
  let savedAt = "";
  let fileSavedAt = ""; // savedAt of the save file as loaded or as last written by this page
  let pendingFile = null; // a newer save file that waits for the user's decision
  let saveFailed = false;

  /* ---------- sanitizing (saved data is untrusted input) ---------- */

  function normalizeName(name) {
    return name.trim().replace(/\s+/g, " ");
  }

  function sanitizeProgress(raw) {
    const clean = {};
    if (!raw || typeof raw !== "object") return clean;
    Object.keys(raw).forEach((key) => {
      if (!key.includes(KEY_SEPARATOR)) return;
      const entry = raw[key];
      if (!entry || typeof entry !== "object") return;
      const mastered = entry.mastered === true;
      const found = entry.found === true || mastered;
      if (found) clean[key] = { found, mastered };
    });
    return clean;
  }

  function sanitizeProfileCollection(raw, validSpriteIds) {
    const seenIds = new Set();
    const seenNames = new Set();
    const clean = [];
    if (Array.isArray(raw)) {
      raw.forEach((profile) => {
        if (!profile || typeof profile.id !== "string" || !/^[a-z0-9-]+$/.test(profile.id)) return;
        if (seenIds.has(profile.id)) return;
        const name = typeof profile.name === "string" ? normalizeName(profile.name).slice(0, MAX_PROFILE_NAME_LENGTH) : "";
        if (!name || seenNames.has(name.toLowerCase())) return;
        seenIds.add(profile.id);
        seenNames.add(name.toLowerCase());
        const recentlyUpdated = {};
        if (profile.recentlyUpdated && typeof profile.recentlyUpdated === "object") {
          Object.keys(profile.recentlyUpdated).forEach((id) => {
            const timestamp = sanitizeSavedAt(profile.recentlyUpdated[id]);
            if (timestamp && validSpriteIds.has(id)) recentlyUpdated[id] = timestamp;
          });
        }
        clean.push({
          id: profile.id,
          name,
          progress: sanitizeProgress(profile.progress),
          highlighted: Array.isArray(profile.highlighted)
            ? Array.from(new Set(profile.highlighted.filter((id) => typeof id === "string" && validSpriteIds.has(id))))
            : [],
          recentlyUpdated,
        });
      });
    }
    return clean.length
      ? clean
      : [{ id: "player-1", name: "Player 1", progress: {}, highlighted: [], recentlyUpdated: {} }];
  }

  function sanitizeCustomSprites(raw) {
    if (!Array.isArray(raw)) return [];
    const seedIds = new Set(app.SPRITES.map((sprite) => sprite.id));
    const seen = new Set();
    const clean = [];
    raw.forEach((item) => {
      if (!item || typeof item.id !== "string" || typeof item.name !== "string") return;
      if (item.id.includes(KEY_SEPARATOR)) return;
      if (seedIds.has(item.id) || seen.has(item.id)) return;
      const name = item.name.trim().slice(0, MAX_NAME_LENGTH);
      if (!name) return;
      const rarity = app.RARITIES.includes(item.rarity) ? item.rarity : "Unknown";
      seen.add(item.id);
      clean.push({ id: item.id, name, rarity, source: null, variants: BASE_ONLY });
    });
    return clean;
  }

  function sanitizeSavedAt(raw) {
    return typeof raw === "string" && ISO_TIME.test(raw) ? raw : "";
  }

  /** Turns a migrated snapshot from the browser or the save file into trusted state. */
  function cleanSnapshot(raw) {
    const cleanCustomSprites = sanitizeCustomSprites(raw.customSprites);
    const validSpriteIds = new Set(app.SPRITES.concat(cleanCustomSprites).map((sprite) => sprite.id));
    const cleanProfiles = sanitizeProfileCollection(raw.profiles, validSpriteIds);
    return {
      savedAt: sanitizeSavedAt(raw.savedAt),
      activeProfileId: cleanProfiles.some((profile) => profile.id === raw.activeProfileId)
        ? raw.activeProfileId
        : cleanProfiles[0].id,
      profiles: cleanProfiles,
      customSprites: cleanCustomSprites,
    };
  }

  function loadActiveProfile() {
    const profile = profiles.find((item) => item.id === activeProfileId) || profiles[0];
    activeProfileId = profile.id;
    progress = profile.progress;
    highlightedSprites = new Set(profile.highlighted);
    recentlyUpdated = profile.recentlyUpdated;
  }

  function captureActiveProfile() {
    const profile = profiles.find((item) => item.id === activeProfileId);
    if (!profile) return;
    profile.progress = progress;
    profile.highlighted = Array.from(highlightedSprites);
    profile.recentlyUpdated = recentlyUpdated;
  }

  function applySnapshot(snapshot) {
    savedAt = snapshot.savedAt;
    activeProfileId = snapshot.activeProfileId;
    profiles = snapshot.profiles;
    loadActiveProfile();
    customSprites = snapshot.customSprites;
  }

  /* ---------- helpers ---------- */

  // Variants of custom sprites are always Base only, so they are not stored.
  function toSavedSprite(sprite) {
    return { id: sprite.id, name: sprite.name, rarity: sprite.rarity };
  }

  function getSnapshot() {
    captureActiveProfile();
    return {
      savedAt,
      activeProfileId,
      profiles,
      customSprites: customSprites.map(toSavedSprite),
    };
  }

  /** True if two clean snapshots hold the same progress, ignoring timestamps. */
  function sameContent(a, b) {
    if (JSON.stringify(a.customSprites.map(toSavedSprite)) !== JSON.stringify(b.customSprites.map(toSavedSprite))) {
      return false;
    }
    return a.activeProfileId === b.activeProfileId && JSON.stringify(a.profiles) === JSON.stringify(b.profiles);
  }

  function persist() {
    saveFailed = !app.storage.save(getSnapshot());
    notify();
  }

  /**
   * An ISO timestamp that is always later than the previous one. Two changes in the same
   * millisecond, or a clock that went backwards, would otherwise look like "nothing changed".
   */
  function nextTimestamp() {
    const now = Date.now();
    const previous = Date.parse(savedAt);
    return new Date(Number.isNaN(previous) ? now : Math.max(now, previous + 1)).toISOString();
  }

  /** Call after every change the user makes: stamps the time and saves in the browser. */
  function commit() {
    savedAt = nextTimestamp();
    captureActiveProfile();
    persist();
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function slugify(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function makeKey(spriteId, variantId) {
    return spriteId + KEY_SEPARATOR + variantId;
  }

  function allBaseSprites() {
    return app.SPRITES.concat(customSprites);
  }

  function hasSprite(id) {
    return allBaseSprites().some((sprite) => sprite.id === id);
  }

  function isKnownKey(key) {
    const parts = String(key).split(KEY_SEPARATOR);
    if (parts.length !== 2) return false;
    const sprite = allBaseSprites().find((item) => item.id === parts[0]);
    return Boolean(sprite && sprite.variants.includes(parts[1]));
  }

  function getEntry(key) {
    return progress[key] || { found: false, mastered: false };
  }

  function storeEntry(key, entry) {
    if (entry.found || entry.mastered) progress[key] = entry;
    else delete progress[key];
  }

  /** Sprites with all variants and their status. */
  function buildSprites() {
    return allBaseSprites().map((sprite) => {
      const variants = sprite.variants.map((variantId) => {
        const key = makeKey(sprite.id, variantId);
        const entry = progress[key];
        return {
          key,
          id: variantId,
          name: variantNames.get(variantId) || variantId,
          iconUrl: app.getIconUrl(sprite.id, variantId),
          found: Boolean(entry && entry.found),
          mastered: Boolean(entry && entry.mastered),
        };
      });
      return {
        id: sprite.id,
        name: sprite.name,
        rarity: sprite.rarity,
        source: sprite.source,
        levelingTip: sprite.levelingTip || null,
        iconUrl: app.getIconUrl(sprite.id, "base"),
        custom: customSprites.some((custom) => custom.id === sprite.id),
        highlighted: highlightedSprites.has(sprite.id),
        updatedAt: recentlyUpdated[sprite.id] || "",
        variants,
        // Counts over ALL variants of this sprite, regardless of filters.
        total: variants.length,
        found: variants.filter((variant) => variant.found).length,
        mastered: variants.filter((variant) => variant.mastered).length,
      };
    });
  }

  function matchesFilter(variant, filter) {
    switch (filter) {
      case "not-found":
        return !variant.found;
      case "not-mastered":
        return !variant.mastered;
      case "mastered":
        return variant.mastered;
      default:
        return true;
    }
  }

  function touchSprite(spriteId) {
    recentlyUpdated[spriteId] = new Date().toISOString();
  }

  function makeProfileId() {
    let id;
    do {
      generatedProfileId += 1;
      id = "profile-" + Date.now().toString(36) + "-" + generatedProfileId.toString(36);
    } while (profiles.some((profile) => profile.id === id));
    return id;
  }

  /* ---------- public API ---------- */

  app.store = {
    FILTERS,
    MAX_NAME_LENGTH,

    /**
     * Loads the progress saved in this browser and the save file from the project folder.
     * - Only the file exists (e.g. someone sent you the folder): the file is used.
     * - Both exist: the browser wins, unless the file is newer and different. In that case
     *   the file waits in `pendingFile` so the user can choose (see useSaveFile()).
     */
    init() {
      const local = app.storage.load();
      const file = app.storage.loadSaveFile();
      const cleanFile = file ? cleanSnapshot(file) : null;
      fileSavedAt = cleanFile ? cleanFile.savedAt : "";

      if (local) {
        const cleanLocal = cleanSnapshot(local);
        applySnapshot(cleanLocal);
        if (cleanFile && cleanFile.savedAt > cleanLocal.savedAt && !sameContent(cleanFile, cleanLocal)) {
          pendingFile = cleanFile;
        }
      } else if (cleanFile) {
        applySnapshot(cleanFile);
        persist();
      }
    },

    subscribe(listener) {
      listeners.push(listener);
    },

    /** True if progress is currently being saved to the browser. */
    canPersist() {
      return app.storage.isAvailable() && !saveFailed;
    },

    getSprites() {
      return buildSprites();
    },

    getProfiles() {
      return profiles.map(({ id, name }) => ({ id, name }));
    },

    getActiveProfileId() {
      return activeProfileId;
    },

    /**
     * Applies the filter per variant: a sprite is returned only with the variants
     * that match, and sprites without any matching variant are left out.
     * The search matches every word against "<variant> <sprite>", so
     * "gold", "sonic" and "gold sonic" all work.
     */
    getVisibleSprites(filter, query) {
      const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const result = [];
      buildSprites().forEach((sprite) => {
        if (filter === "highlighted" && !sprite.highlighted) return;
        if (filter === "recent" && !sprite.updatedAt) return;
        const variants = sprite.variants.filter((variant) => {
          if (tokens.length) {
            const haystack = (variant.name + " " + sprite.name).toLowerCase();
            if (!tokens.every((token) => haystack.includes(token))) return false;
          }
          return matchesFilter(variant, filter);
        });
        if (variants.length > 0) result.push(Object.assign({}, sprite, { variants }));
      });
      if (filter === "recent") result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return result;
    },

    /** Totals over every variant of every sprite. */
    getStats() {
      return buildSprites().reduce(
        (stats, sprite) => ({
          total: stats.total + sprite.total,
          found: stats.found + sprite.found,
          mastered: stats.mastered + sprite.mastered,
        }),
        { total: 0, found: 0, mastered: 0 }
      );
    },

    /** `key` is "spriteId:variantId". */
    setFound(key, value) {
      if (!isKnownKey(key)) return;
      const entry = Object.assign({}, getEntry(key));
      const found = Boolean(value);
      if (entry.found === found && (found || !entry.mastered)) return;
      entry.found = found;
      if (!entry.found) entry.mastered = false;
      storeEntry(key, entry);
      touchSprite(String(key).split(KEY_SEPARATOR)[0]);
      commit();
    },

    /** Ticking also ticks Found. */
    setMastered(key, value) {
      if (!isKnownKey(key)) return;
      const entry = Object.assign({}, getEntry(key));
      const mastered = Boolean(value);
      if (entry.mastered === mastered && (!mastered || entry.found)) return;
      entry.mastered = mastered;
      if (entry.mastered) entry.found = true;
      storeEntry(key, entry);
      touchSprite(String(key).split(KEY_SEPARATOR)[0]);
      commit();
    },

    toggleHighlighted(spriteId) {
      if (!hasSprite(spriteId)) return;
      if (highlightedSprites.has(spriteId)) highlightedSprites.delete(spriteId);
      else highlightedSprites.add(spriteId);
      commit();
    },

    switchProfile(id) {
      if (id === activeProfileId || !profiles.some((profile) => profile.id === id)) return;
      captureActiveProfile();
      activeProfileId = id;
      loadActiveProfile();
      commit();
    },

    addProfile(rawName) {
      const name = normalizeName(String(rawName || ""));
      if (!name) return { ok: false, error: "Please enter a profile name." };
      if (name.length > MAX_PROFILE_NAME_LENGTH) {
        return { ok: false, error: "Profile names must be at most " + MAX_PROFILE_NAME_LENGTH + " characters." };
      }
      if (profiles.some((profile) => profile.name.toLowerCase() === name.toLowerCase())) {
        return { ok: false, error: "A profile with this name already exists." };
      }
      const profile = { id: makeProfileId(), name, progress: {}, highlighted: [], recentlyUpdated: {} };
      profiles.push(profile);
      activeProfileId = profile.id;
      loadActiveProfile();
      commit();
      return { ok: true };
    },

    renameActiveProfile(rawName) {
      const name = normalizeName(String(rawName || ""));
      if (!name) return { ok: false, error: "Please enter a profile name." };
      if (name.length > MAX_PROFILE_NAME_LENGTH) {
        return { ok: false, error: "Profile names must be at most " + MAX_PROFILE_NAME_LENGTH + " characters." };
      }
      if (profiles.some((profile) => profile.id !== activeProfileId && profile.name.toLowerCase() === name.toLowerCase())) {
        return { ok: false, error: "A profile with this name already exists." };
      }
      const profile = profiles.find((item) => item.id === activeProfileId);
      if (profile.name === name) return { ok: true };
      profile.name = name;
      commit();
      return { ok: true };
    },

    deleteActiveProfile() {
      if (profiles.length <= 1) return { ok: false, error: "You cannot delete the only profile." };
      profiles = profiles.filter((profile) => profile.id !== activeProfileId);
      activeProfileId = profiles[0].id;
      loadActiveProfile();
      commit();
      return { ok: true };
    },

    /** Returns { ok: true } or { ok: false, error: string }. */
    addSprite(rawName, rarity) {
      const name = normalizeName(String(rawName || ""));
      if (!name) return { ok: false, error: "Please enter a name." };
      if (name.length > MAX_NAME_LENGTH) {
        return { ok: false, error: "Name must be at most " + MAX_NAME_LENGTH + " characters." };
      }
      const lower = name.toLowerCase();
      if (allBaseSprites().some((sprite) => sprite.name.toLowerCase() === lower)) {
        return { ok: false, error: "A sprite with this name already exists." };
      }

      const baseSlug = slugify(name) || "sprite";
      let id = "custom-" + baseSlug;
      let counter = 2;
      while (hasSprite(id)) {
        id = "custom-" + baseSlug + "-" + counter;
        counter += 1;
      }

      customSprites.push({
        id,
        name,
        rarity: app.RARITIES.includes(rarity) ? rarity : "Unknown",
        source: null,
        variants: BASE_ONLY,
      });
      commit();
      return { ok: true };
    },

    /** Only user-added sprites can be removed; seed data is edited in the data file. */
    removeSprite(id) {
      const index = customSprites.findIndex((sprite) => sprite.id === id);
      if (index === -1) return;
      customSprites.splice(index, 1);
      profiles.forEach((profile) => {
        Object.keys(profile.progress).forEach((key) => {
          if (key.startsWith(id + KEY_SEPARATOR)) delete profile.progress[key];
        });
        profile.highlighted = profile.highlighted.filter((highlightedId) => highlightedId !== id);
        delete profile.recentlyUpdated[id];
      });
      loadActiveProfile();
      commit();
    },

    /** Clears all progress but keeps user-added sprites. */
    resetProgress() {
      progress = {};
      recentlyUpdated = {};
      commit();
    },

    /* ----- save file in the project folder ----- */

    /** The text for saves/progress.js with the current progress. */
    createSaveFileContent() {
      if (!savedAt) {
        // Data from an old version has no timestamp; the file needs one to be comparable.
        savedAt = new Date().toISOString();
        persist();
      }
      return app.storage.serializeSaveFile(getSnapshot());
    },

    /** Call after the save file was written successfully. */
    markFileSaved() {
      fileSavedAt = savedAt;
      pendingFile = null;
      notify();
    },

    /** True while a newer save file is waiting for the user's decision. */
    hasNewerSaveFile() {
      return pendingFile !== null;
    },

    /** Replaces the progress in this browser with the newer save file. */
    useSaveFile() {
      if (!pendingFile) return;
      applySnapshot(pendingFile);
      pendingFile = null;
      persist();
    },

    /** Keeps the browser's progress and ignores the newer save file. */
    dismissSaveFile() {
      if (!pendingFile) return;
      pendingFile = null;
      notify();
    },

    /** "unsaved": changes not in the file yet. "saved": file is up to date. "none": nothing to report. */
    getSaveStatus() {
      if (pendingFile) return "none"; // the notice about the newer file explains the situation
      if (savedAt === fileSavedAt) return fileSavedAt ? "saved" : "none";
      return "unsaved";
    },
  };
})((window.SpriteTracker = window.SpriteTracker || {}));
