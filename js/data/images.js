/**
 * Icon URLs, hotlinked from fortnite.gg (the artwork belongs to Epic Games).
 * Filenames follow T_Icon_BR_Creature_Sprite_<stem><suffix>_L.webp, but a few
 * variants use a different stem; those are listed in STEM_OVERRIDES.
 * Copied from the markup of https://fortnite.gg/sprites on 2026-10-26.
 * If an icon fails to load, the UI shows a placeholder instead, so a wrong
 * entry here is harmless, just worth fixing.
 */
(function (app) {
  "use strict";

  const BASE_URL = "https://fortnite.gg/img/x/sprites/icons/";
  const PREFIX = "T_Icon_BR_Creature_Sprite_";
  const EXTENSION = "_L.webp";

  // Filename part for each variant id.
  const SUFFIXES = {
    base: "",
    gold: "_Gold",
    "cheat-master": "_Cheatmaster",
    "loot-hacker": "_Hacker",
    "bounty-hunter": "_BountyHunter",
    "trick-or-treat": "_TrickTreat",
    quack: "_Quack",
  };

  // Internal game name for each sprite id.
  const STEMS = {
    adventure: "Dwarf",
    birthday: "Birthday",
    blinky: "GhostDamage",
    bush: "BushRanger",
    "crash-bandicoot": "BodySlam",
    crown: "Crown",
    "dumpster-dive": "WinnerD",
    honey: "WinnerE",
    jackrabbit: "JazzJackrabbit",
    jonesy: "Jonesy",
    killswitch: "Killswitch",
    klombo: "Klombo",
    "mega-man": "ImprovedSlide",
    morgana: "IncreaseHeals",
    onigiri: "WinnerC",
    "one-wish-willow": "CargoLying",
    overshield: "Overshield",
    pond: "WinnerA",
    shadow: "NarrowFlea_Scribe",
    sonic: "NarrowFlea_Obsidian",
    "spooky-dash": "PhaseDash",
    "storm-scout": "StormScout",
    tails: "NarrowFlea_Monkey",
    "the-deer": "IncreasedMelee",
    vampire: "HealthSiphon",
    "x-ray": "WinnerB",
    "8-bit": "EightBitBlaster",
  };

  // Variants whose icon file uses a different stem than the rest of their sprite.
  const STEM_OVERRIDES = {
    "sonic:loot-hacker": "NarrowFlea",
    "sonic:bounty-hunter": "NarrowFlea",
    "sonic:trick-or-treat": "NarrowFlea",
    "tails:bounty-hunter": "NarrowFleaMonkey",
    "tails:trick-or-treat": "NarrowFleaMonkey",
    "shadow:loot-hacker": "ReloadOverTime",
    "shadow:bounty-hunter": "ReloadOverTime",
    "shadow:trick-or-treat": "ReloadOverTime",
    "8-bit:bounty-hunter": "8BitBlaster",
    "8-bit:trick-or-treat": "8BitBlaster",
    "jackrabbit:loot-hacker": "DoubleJump",
    "jackrabbit:bounty-hunter": "DoubleJump",
    "jackrabbit:trick-or-treat": "DoubleJump",
  };

  function ownValue(table, key) {
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
  }

  /** Returns the icon URL for a sprite variant, or null if there is none (e.g. custom sprites). */
  app.getIconUrl = function getIconUrl(spriteId, variantId) {
    const stem = ownValue(STEM_OVERRIDES, spriteId + ":" + variantId) || ownValue(STEMS, spriteId);
    const suffix = ownValue(SUFFIXES, variantId);
    if (typeof stem !== "string" || typeof suffix !== "string") return null;
    return BASE_URL + PREFIX + stem + suffix + EXTENSION;
  };
})((window.SpriteTracker = window.SpriteTracker || {}));
