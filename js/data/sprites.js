/**
 * Seed data for the current season.
 * Compiled from community guides (see README). Locations are hints, not guarantees.
 * To update the list, edit this file. Progress is stored by "spriteId:variantId",
 * so renaming a sprite or variant never breaks saved progress (changing an id does).
 */
(function (app) {
  "use strict";

  app.SEASON = {
    name: "Chapter 7 Season 4: Override",
    dataCheckedOn: "2026-10-26",
  };

  app.RARITIES = ["Rare", "Epic", "Legendary", "Mythic", "Unknown"];

  // Display order of variants inside a sprite card.
  app.VARIANTS = [
    { id: "base", name: "Base" },
    { id: "gold", name: "Gold" },
    { id: "cheat-master", name: "Cheat Master" },
    { id: "loot-hacker", name: "Loot Hacker" },
    { id: "bounty-hunter", name: "Bounty Hunter" },
    { id: "trick-or-treat", name: "Trick or Treat" },
    { id: "quack", name: "Quack" },
  ];

  const STANDARD = Object.freeze(["base", "gold", "cheat-master", "loot-hacker", "bounty-hunter", "trick-or-treat"]);
  const WITH_QUACK = Object.freeze(STANDARD.concat("quack"));
  const BASE_ONLY = Object.freeze(["base"]);
  const QUACK_TIP = {
    text: "If you carry its Quack variant, every other Sprite you carry gains an extra 50% of Quack's progress.",
    sources: [
      {
        label: "Epic Games",
        url: "https://communities.epicgames.com/thread/v41-30-act-iii-battle-royale-update-notes/LMZJ",
      },
    ],
  };
  // `source` is null when the guides did not name a specific way to get the sprite.
  app.SPRITES = [
    // Rare
    {
      id: "adventure",
      name: "Adventure",
      rarity: "Rare",
      source: "Starts in your inventory each match",
      levelingTip: QUACK_TIP,
      variants: WITH_QUACK,
    },
    {
      id: "bush",
      name: "Bush",
      rarity: "Rare",
      source: "Starts in your inventory each match",
      levelingTip: QUACK_TIP,
      variants: WITH_QUACK,
    },
    {
      id: "jonesy",
      name: "Jonesy",
      rarity: "Rare",
      source: "Starts in your inventory each match",
      levelingTip: QUACK_TIP,
      variants: WITH_QUACK,
    },
    { id: "8-bit", name: "8-Bit", rarity: "Rare", source: "Blue Cheat Code panels", variants: STANDARD },
    { id: "birthday", name: "Birthday", rarity: "Rare", source: "Enter cheat code FM1 in the Admin Panel", variants: STANDARD },
    { id: "mega-man", name: "Mega Man", rarity: "Rare", source: "Blue Cheat Code chests", variants: BASE_ONLY },
    { id: "onigiri", name: "Onigiri", rarity: "Rare", source: "Blue Cheat Code chests", variants: STANDARD },
    { id: "overshield", name: "Overshield", rarity: "Rare", source: "Chests or Cheat Code chests", variants: STANDARD },
    { id: "storm-scout", name: "Storm Scout", rarity: "Rare", source: "Blue Cheat Codes (purple for rarer variants)", variants: STANDARD },

    // Epic
    { id: "dumpster-dive", name: "Dumpster Dive", rarity: "Epic", source: "Any Cheat Code or Pumpkin Chest, no fixed spawn", variants: STANDARD },
    { id: "killswitch", name: "Killswitch", rarity: "Epic", source: "Cheat Code panels (night versions)", variants: STANDARD },
    { id: "morgana", name: "Morgana", rarity: "Epic", source: null, variants: STANDARD },
    { id: "pond", name: "Pond", rarity: "Epic", source: "Epic Cheat Code chests", variants: STANDARD },
    { id: "shadow", name: "Shadow", rarity: "Epic", source: "Cheat Code panels", variants: STANDARD },
    { id: "sonic", name: "Sonic", rarity: "Epic", source: "Cheat Code panels", variants: STANDARD },
    { id: "tails", name: "Tails", rarity: "Epic", source: "Cheat Code panels", variants: STANDARD },

    // Legendary
    { id: "blinky", name: "Blinky", rarity: "Legendary", source: "Defeat the floating Pac-Man boss", variants: STANDARD },
    { id: "crash-bandicoot", name: "Crash Bandicoot", rarity: "Legendary", source: "Defeat the Adam Smasher boss", variants: STANDARD },
    { id: "jackrabbit", name: "Jackrabbit", rarity: "Legendary", source: "Defeat the Hush boss", variants: STANDARD },
    { id: "the-deer", name: "The Deer", rarity: "Legendary", source: "Fortnitemares sprite", variants: STANDARD },
    { id: "vampire", name: "Vampire", rarity: "Legendary", source: "Gold Cheat Codes, Pumpkin Chests", variants: STANDARD },
    { id: "x-ray", name: "X-Ray", rarity: "Legendary", source: "Purple or gold Cheat Codes", variants: STANDARD },

    // Mythic
    {
      id: "crown",
      name: "Crown",
      rarity: "Mythic",
      source: null,
      levelingTip: {
        text: "Crown only levels when you win matches. Winning with a crown (a Crown Win) levels it faster.",
        exclusive: true,
        sources: [
          {
            label: "Destructoid",
            url: "https://www.destructoid.com/how-to-get-and-level-up-a-crown-sprite-in-fortnite-chapter-7-season-4/",
          },
        ],
      },
      variants: STANDARD,
    },
    {
      id: "klombo",
      name: "Klombo",
      rarity: "Mythic",
      source: null,
      levelingTip: {
        text:
          "Use healing and shield consumables (such as Medkits or Shield Potions) to level Klombo. Its Quack variant also shares " +
          "an extra 50% of Quack's progress with each other Sprite you carry.",
        exclusive: true,
        sources: [
          {
            label: "Destructoid",
            url: "https://www.destructoid.com/how-to-get-klombo-sprite-in-fortnite-chapter-7-season-4/",
          },
          {
            label: "Epic Games",
            url: "https://communities.epicgames.com/thread/v41-30-act-iii-battle-royale-update-notes/LMZJ",
          },
        ],
      },
      variants: WITH_QUACK,
    },
    { id: "one-wish-willow", name: "One Wish Willow", rarity: "Mythic", source: "Pumpkin Chests, vaults, high-rarity Cheat Codes", variants: STANDARD },
    {
      id: "spooky-dash",
      name: "Spooky Dash",
      rarity: "Mythic",
      source: "Pumpkin Chests, normal chests, Cheat Codes",
      levelingTip: QUACK_TIP,
      variants: WITH_QUACK,
    },

    // Rarity not confirmed by the guides
    { id: "honey", name: "Honey", rarity: "Unknown", source: "Added with v42.40 (Oct 15)", variants: STANDARD },
  ];
})((window.SpriteTracker = window.SpriteTracker || {}));
