# Sprite Tracker

Track which Fortnite sprites you have found and which you have mastered.
Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

- Open `index.html` in a browser, or
- In VS Code, install the "Live Server" extension, right-click `index.html` and choose "Open with Live Server".

Progress is saved automatically in your browser's `localStorage`. It stays on this browser and this device.
To share your progress, or to keep a backup in the project folder, use **Save to folder** (see below).

## Features

- Every sprite lists all of its variants (Base, Gold, Cheat Master, ...), 162 in total this season, each with its own **Found** and **Mastered** checkbox
- Mastering a variant also marks it as found. Un-finding a variant removes its mastery.
- Sprite-specific leveling tips with source links appear where reliable advice is available.
- Create named player profiles to keep progress separate on this device.
- Click a sprite card or its star to highlight it, then use the **Highlighted** filter to find it again.
- **Recently updated** sorts sprites by the latest Found or Mastered change in the active profile.
- A celebration appears when you master a sprite or the entire collection.
- **Save to folder** writes your progress into the project folder, so anyone who gets the folder has the same progress
- Sprite and variant icons, the same ones fortnite.gg uses (loaded from their site, so you need an internet connection to see them)
- Filters (applied per variant): All, **Not found yet**, **Not mastered yet**, Mastered
- Search by sprite or variant name, e.g. `gold`, `jonesy` or `gold jonesy`
- Progress bars for found and mastered
- Add your own sprites (and remove them again)

## Saving and sharing

Click **Save to folder** in the top right. The status next to it tells you if there is anything not saved yet.

- **Chrome and Edge:** the first click per session asks you to pick the project folder (the one that contains `index.html`).
  The browser then asks for permission to edit files in it. The app writes `saves/progress.js` and does not ask again until you reload the page.
- **Other browsers (e.g. Firefox):** they cannot write into folders, so `progress.js` is downloaded.
  Move it into the `saves` folder and replace the old file.

`saves/progress.js` is loaded automatically when the page starts. To share your progress, click **Save to folder** and then send the whole folder
(for example as a zip). The other person opens `index.html` and sees your progress.

Profiles are stored in the save data, so saving the project file carries all profiles with it. They are separate progress sets on this device,
not shared live across different devices.
The reset button clears progress only for the selected profile; deleting a profile removes only that profile.

If the browser already has progress and the file in the folder is newer and different, a notice lets you choose between
**Load save file** and **Keep browser progress**. Saving while that notice is open asks before it replaces the newer file.

Notes:

- `progress.js` is JavaScript, not plain data (that is what lets it load when you double-click `index.html`). Only open project folders from people you trust.
- `.vscode/settings.json` tells Live Server to ignore the `saves` folder, so the page does not reload every time you save.
  This only applies if you open the project folder itself in VS Code.
- Deleting the `saves` folder is fine, but keep an empty `saves/progress.js` that sets `window.SpriteTracker.savedProgress = null;`, otherwise the browser logs a harmless 404.

## Project structure

```
index.html          Page markup
css/styles.css      All styling
js/
  data/sprites.js   Seed data: season name, rarities, variants, sprite list
  data/images.js    Icon URL for every sprite variant (hotlinked from fortnite.gg)
  storage.js        localStorage and save file format, migrations (no DOM)
  store.js          State and rules (no DOM)
  fileSave.js       Writes the save file into the folder (or downloads it)
  ui.js             Rendering (no business rules)
  main.js           Event wiring
saves/progress.js   Your saved progress (overwritten by "Save to folder")
.vscode/settings.json  Live Server setting
```

Scripts are loaded as classic scripts in this order, so the page also works when opened directly from disk.

## Updating the sprite list

Edit `js/data/sprites.js`. Each sprite needs a unique, stable `id` and a `variants` list (ids from `VARIANTS`).
Progress is saved per `spriteId:variantId`, so renaming a sprite or variant keeps its progress, but changing an `id` loses it.
Progress saved by older versions of the app is converted automatically (see `migrate()` in `js/storage.js`); existing progress moves into a
default **Player 1** profile.
When the saved format changes, bump `SCHEMA_VERSION` there and add a migration step, because old browser data and old save files must keep loading.

## Data notes

The list was compiled on 2026-10-26 from community guides for Chapter 7 Season 4: Override
and may be incomplete or change with patches (the sprite count was 27 at v42.40).

- Variants per sprite: https://fortnite.gg/sprites
- Sprite list and variants: https://accountshark.net/fortnite-sprite-checklist
- Count and ability data: https://spritechecklist.org/all-sprites/
- Quack's shared XP effect: https://communities.epicgames.com/thread/v41-30-act-iii-battle-royale-update-notes/LMZJ
- Crown Sprite leveling: https://www.destructoid.com/how-to-get-and-level-up-a-crown-sprite-in-fortnite-chapter-7-season-4/
- Klombo Sprite leveling: https://www.destructoid.com/how-to-get-klombo-sprite-in-fortnite-chapter-7-season-4/
- Rarity and how to get: https://www.altchar.com/guides/fortnite-all-sprites-and-how-to-get-them-october-2026-aRXW58a1yt9o
- Fortnitemares sprites: https://www.destructoid.com/all-fortnite-fortnitemares-sprites-abilities-and-how-to-get-them/
- One Wish Willow: https://games.gg/fortnite/guides/fortnite-how-to-get-one-wish-willow-sprite/
- Mastery rules: https://quackadex.com/guides/sprite-mastery

## Icons

The icons are Epic Games artwork, loaded directly from `https://fortnite.gg/img/x/sprites/icons/`. Nothing is copied into this project.
That means they only show with an internet connection, and they stop working if fortnite.gg moves or blocks the files.
An icon that fails to load is replaced by a placeholder with the sprite's first letter, and the rest of the app keeps working.
A few variants use a different filename than their sprite (for example Tails' Bounty Hunter), which is why `images.js` has a `STEM_OVERRIDES` table.
When a new sprite is added, add its entry to `STEMS` in `images.js`; sprites you add in the app have no icon.

## Not included

The rarity of each individual variant is not shown. Only the sprite's own rarity is, because the sources I found do not list a rarity per variant.
