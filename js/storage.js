/**
 * Persistence: the browser's localStorage plus the optional save file in the project folder.
 * Every localStorage access is wrapped in try/catch because storage can be blocked
 * (private windows, strict privacy settings) or full.
 *
 * Saved data (browser and file share one format, a "snapshot"):
 *   { version, savedAt, activeProfileId, profiles, customSprites }
 *
 * Old versions are upgraded step by step by migrate(); data with an unknown version
 * is ignored. Add a migration step for every schema version bump.
 */
(function (app) {
  "use strict";

  // The key keeps its "v1" name on purpose: the schema version lives inside the data.
  const STORAGE_KEY = "sprite-tracker:v1";
  const SCHEMA_VERSION = 5;
  const SAVE_FILE_PATH = "saves/progress.js";

  const SAVE_FILE_HEADER =
    "/**\n" +
    " * Sprite Tracker save file. The \"Save to folder\" button overwrites it.\n" +
    " * Keep it in the saves folder when you share the project: it is loaded automatically on start.\n" +
    " * It is JavaScript, so only open projects from people you trust.\n" +
    " */\n";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /** v1 to v2: one entry per sprite ("sonic") became one entry per variant ("sonic:base"). */
  function migrateV1(data) {
    const oldProgress = isObject(data.progress) ? data.progress : {};
    const progress = {};
    Object.keys(oldProgress).forEach((spriteId) => {
      progress[spriteId + ":base"] = oldProgress[spriteId];
    });
    return { version: 2, progress, customSprites: data.customSprites };
  }

  /** v2 to v3: added the independent personal checkbox ("mine"), its name, and a timestamp. */
  function migrateV2(data) {
    const oldProgress = isObject(data.progress) ? data.progress : {};
    const progress = {};
    Object.keys(oldProgress).forEach((key) => {
      const entry = oldProgress[key];
      if (!isObject(entry)) return;
      progress[key] = Object.assign({}, entry, { mine: false });
    });
    // savedAt "" means unknown, so a save file with a real timestamp counts as newer.
    return { version: 3, savedAt: "", progress, customSprites: data.customSprites };
  }

  /** v3 to v4: removed the personal checkbox and its name. */
  function migrateV3(data) {
    const oldProgress = isObject(data.progress) ? data.progress : {};
    const progress = {};
    Object.keys(oldProgress).forEach((key) => {
      const entry = oldProgress[key];
      if (!isObject(entry)) return;
      progress[key] = { found: entry.found === true, mastered: entry.mastered === true };
    });
    return { version: 4, savedAt: data.savedAt, progress, customSprites: data.customSprites };
  }

  /** v4 to v5: move progress into the first named profile. */
  function migrateV4(data) {
    const progress = isObject(data.progress) ? data.progress : {};
    return {
      version: 5,
      savedAt: data.savedAt,
      activeProfileId: "player-1",
      profiles: [
        {
          id: "player-1",
          name: "Player 1",
          progress,
          highlighted: [],
          recentlyUpdated: {},
        },
      ],
      customSprites: data.customSprites,
    };
  }

  /** Upgrades saved data to the current schema, or returns null if it is not understood. */
  function migrate(data) {
    if (!isObject(data)) return null;
    let current = data;
    if (current.version === 1) current = migrateV1(current);
    if (current.version === 2) current = migrateV2(current);
    if (current.version === 3) current = migrateV3(current);
    if (current.version === 4) current = migrateV4(current);
    return current.version === SCHEMA_VERSION ? current : null;
  }

  function getStorage() {
    try {
      const storage = window.localStorage;
      const probeKey = "__sprite_tracker_probe__";
      storage.setItem(probeKey, "1");
      storage.removeItem(probeKey);
      return storage;
    } catch (error) {
      return null;
    }
  }

  const storage = getStorage();

  /** Plain object with only the persisted fields, progress keys sorted so saved files diff nicely. */
  function toPlainSnapshot(snapshot) {
    return {
      version: SCHEMA_VERSION,
      savedAt: snapshot.savedAt,
      activeProfileId: snapshot.activeProfileId,
      profiles: snapshot.profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        progress: Object.keys(profile.progress)
          .sort()
          .reduce((sorted, key) => {
            sorted[key] = profile.progress[key];
            return sorted;
          }, {}),
        highlighted: profile.highlighted.slice(),
        recentlyUpdated: profile.recentlyUpdated,
      })),
      customSprites: snapshot.customSprites,
    };
  }

  app.storage = {
    SAVE_FILE_PATH,

    isAvailable() {
      return storage !== null;
    },

    /** Returns the snapshot saved in this browser, or null if nothing valid is saved. */
    load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return migrate(JSON.parse(raw));
      } catch (error) {
        return null;
      }
    },

    /** Returns true if the snapshot was saved successfully. */
    save(snapshot) {
      if (!storage) return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(toPlainSnapshot(snapshot)));
        return true;
      } catch (error) {
        return false;
      }
    },

    /** Returns the snapshot from saves/progress.js (loaded by index.html), or null. */
    loadSaveFile() {
      try {
        return migrate(app.savedProgress);
      } catch (error) {
        return null;
      }
    },

    /** The text to write into saves/progress.js. */
    serializeSaveFile(snapshot) {
      return (
        SAVE_FILE_HEADER +
        "window.SpriteTracker = window.SpriteTracker || {};\n" +
        "window.SpriteTracker.savedProgress = " +
        JSON.stringify(toPlainSnapshot(snapshot), null, 2) +
        ";\n"
      );
    },
  };
})((window.SpriteTracker = window.SpriteTracker || {}));
