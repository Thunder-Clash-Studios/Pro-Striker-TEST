# Pro Striker — Ad / SDK Monetization: Deployment Guide

This document explains the monetization system added to Pro Striker: how it
works, what's supported on which platform, and exactly how to move Pro
Striker between platforms without touching the ad-integration code itself.

---

## 1. Architecture overview

Three layers, cleanly separated:

```
main.js / input.js / renderer.js / tournament.js   (CORE GAME — unchanged gameplay)
                    |
                    v
         js/platform/adManager.js                  (Pro Striker's AD STRATEGY:
                                                      when/why to show an ad,
                                                      frequency, once-only rules)
                    |
                    v
         js/platform/platformSDK.js                (generic PlatformSDK —
                                                      the only object the game
                                                      strategy layer talks to)
                    |
                    v
   js/platform/adapters/crazyGamesAdapter.js        (HOW each specific SDK is
   js/platform/adapters/gameMonetizeAdapter.js       actually driven)
   js/platform/adapters/gameDistributionAdapter.js
   js/platform/adapters/genericWebAdapter.js
```

The core game never imports or references "CrazyGames", "GameMonetize", or
"GameDistribution" by name anywhere. It only calls `AdManager`, which only
calls `PlatformSDK`, which picks and delegates to the correct adapter at
runtime.

`js/platform/platformConfig.js` is the **one file you edit** to change which
platform is active or to set a Game ID. You should not need to edit any other
file in `js/platform/` to switch platforms — see Section 5.

---

## 2. HOW TO UPLOAD PRO STRIKER TO ANOTHER PLATFORM

### To upload Pro Striker to CrazyGames:

1. **Change this configuration:** nothing, if you leave
   `ACTIVE_PLATFORM = 'auto'` in `js/platform/platformConfig.js` (the
   default). Auto-detect correctly identifies CrazyGames at runtime via
   `window.CrazyGames.SDK.environment`. If you want to force it explicitly,
   set `ACTIVE_PLATFORM = 'crazygames'` in that same file.
2. **Set this Game ID:** none needed. CrazyGames' HTML5 SDK does not require
   a Game ID in code at all — it infers which game is running from the page
   it's embedded in. `PLATFORM_SETTINGS.crazygames` in `platformConfig.js`
   is intentionally empty.
3. **SDK configuration used:** `js/platform/adapters/crazyGamesAdapter.js`
   loads `https://sdk.crazygames.com/crazygames-sdk-v3.js` and calls
   `window.CrazyGames.SDK.init()` automatically — nothing to configure.
4. **Upload/build like this:** zip the entire `Pro Striker/` folder (the one
   containing `index.html` at its root) and upload it through the CrazyGames
   Developer Portal exactly as you would for any HTML5 game. Use their
   Preview tool to verify ads work before submitting.

### To upload Pro Striker to GameMonetize:

1. **Game ID:** in `js/platform/platformConfig.js` set
   `PLATFORM_SETTINGS.gamemonetize.gameId`, AND set the same value in the
   `window.SDK_OPTIONS = { gameId: ... }` block near the bottom of `index.html`.
   (They must match. `index.html` is what GameMonetize's "Verify SDK in the
   game" tool inspects; `platformConfig.js` is the fallback.)
2. **SDK loading:** the official GameMonetize snippet lives directly in
   `index.html`. `gameMonetizeAdapter.js` adopts that SDK (it no longer
   injects a second copy) and only falls back to injecting one itself if the
   snippet is ever removed from `index.html`.
3. **Verifying:** upload the zip, open "Verify SDK in the game", and in the
   browser console look for `[PlatformSDK][GameMonetize] SDK ready` followed by
   `Active platform: gamemonetize, supported: true`. If you instead see
   `resolved gameId: "your_game_id_here"`, the uploaded zip is out of date.
4. **Cache-busting:** every script tag in `index.html` carries `?v=...`. Bump
   it whenever you change JS, so portals/browsers do not keep serving old code.

### To upload Pro Striker to GameDistribution:

1. **Change this configuration:** in `js/platform/platformConfig.js`, find
   the `gamedistribution` block inside `PLATFORM_SETTINGS` and set your real
   Game ID.
2. **Set this Game ID:**
   ```js
   gamedistribution: {
       gameId: 'PASTE_YOUR_REAL_GAMEDISTRIBUTION_ID_HERE'
   }
   ```
   Get this from your [developer.gamedistribution.com](https://developer.gamedistribution.com/) dashboard, under your game's settings.
3. **SDK configuration used:** `js/platform/adapters/gameDistributionAdapter.js`
   automatically sets `window.GD_OPTIONS` and loads
   `https://html5.api.gamedistribution.com/main.min.js` using the Game ID
   you set in step 2. You do not need to touch `index.html` or the adapter
   file.
4. **Upload/build like this:** zip the `Pro Striker/` folder (root must
   contain `index.html`) and upload it through the GameDistribution
   Developer Portal's Upload tab for your game. Fully watch a test
   advertisement through their in-portal preview iframe to get the SDK
   implementation validated, then click "Request Activation".
   - If you ever self-host Pro Striker outside gamedistribution.com while
     still using their SDK (e.g. embedding it via iframe on your own site),
     their docs require the embedding iframe URL to carry a
     `GD_SDK_REFERRER_URL` query parameter — that's set by whoever embeds
     the iframe, not by anything inside this project.

### To add a NEW platform later (none of the three above):

This is the part of the task that matters most for future-proofing. Here is
exactly where a new adapter goes:

1. Create `js/platform/adapters/<newPlatformName>Adapter.js`, following the
   same shape as the existing adapters: it must expose `detect()`,
   `init()`, `isSupported()`, `showMidgameAd(callbacks)`,
   `showRewardedAd(callbacks)`, `showBanner()`, `isRewardedAdAvailable()`,
   `onGameplayStart()`, `onGameplayStop()`, and register itself as
   `window.PLATFORM_ADAPTERS.<newPlatformName> = ...`.
2. Add a `<script src="js/platform/adapters/<newPlatformName>Adapter.js">`
   tag to `index.html`, alongside the other adapter `<script>` tags
   (**before** `platformSDK.js`).
3. Add a `<newPlatformName>: { ...settings... }` entry to
   `PLATFORM_SETTINGS` in `platformConfig.js` if the new platform needs a
   Game ID or similar.
4. Add `<newPlatformName>` to the `order` array inside
   `PlatformSDK.detectPlatform()` in `platformSDK.js` (one line), so
   auto-detection tries it.

**No changes to `adManager.js`, `main.js`, `input.js`, `renderer.js`, or
`tournament.js` are ever required to add a platform** — that is the entire
point of this architecture. Do not believe any suggestion that "just
replacing the SDK URL" is enough for a platform whose documented API differs
from the ones already integrated — as proven three times over now
(CrazyGames, GameMonetize, GameDistribution all load differently, expose
different globals, and have different ad-call signatures), it genuinely was
NOT enough for any of them to just swap a URL. A new platform gets its own
adapter file, full stop.

### Platforms considered but NOT added yet: AddictingGames, GamePix

Both of these run their own ad SDKs, but as of this integration neither
publishes their full technical API (exact method names, event names,
script URLs) outside of their developer portals:
- **AddictingGames**: their public developer site confirms an SDK exists
  ("Include our SDK in your game") but the actual API reference is only
  available after registering as a developer.
- **GamePix**: a real SDK exists (confirmed via their Unity/Cocos/GDevelop
  plugins and third-party integration reports showing a `window.GamePix`
  global with a promise-based `.loaded()` call), but the exact raw
  JavaScript method names for showing an interstitial/rewarded ad are not
  publicly documented outside their developer dashboard.

Building adapters for either of these now would mean guessing function
names — exactly what this project's brief says not to do. **Once you sign
up as a developer on either platform and get access to their real SDK
docs/download, send them over and I'll build a verified adapter the same
way as the three above** — same file shape, same wiring, zero changes
needed anywhere else in the project.

---

## 3. What I need to change when a platform gives me a new Game ID / App ID

Open `js/platform/platformConfig.js`, find the relevant platform's block
inside `PLATFORM_SETTINGS`, and update the `gameId` field. That is the only
file that ever needs a Game ID pasted into it. Nothing elsewhere references
Game IDs directly.

(CrazyGames does not use a Game ID in code at all, so this applies to
GameMonetize and GameDistribution today, and to any future platform whose
adapter you add that needs one — see Section 2's "add a new platform"
steps, where you'd add the matching field to that platform's block in
`PLATFORM_SETTINGS`.)

---

## 4. What must be done on the platform dashboard before uploading

**CrazyGames:**
- Create the game listing on the [Developer Portal](https://developer.crazygames.com/).
- Read and confirm compliance with their [ads requirements](https://docs.crazygames.com/requirements/ads/) and [technical requirements](https://docs.crazygames.com/requirements/technical/) (this integration was built directly against those requirements — see Section 6).
- Use the Preview tool to test the real ad flow before requesting Full Launch.
- Note: new games start in **Basic Launch**, where ads are disabled entirely by CrazyGames on their end — this is expected and the game must (and does) continue to function normally with no ad buttons doing nothing, per their own rejection criteria.

**GameMonetize:**
- Create the game entry under Game Management > My games, and copy the Game ID it assigns.
- Paste that Game ID into `platformConfig.js` (Section 3 above) before building your upload zip.
- Upload the zip, click "Verify Game", then "Request Activation".

**GameDistribution:**
- Register at [developer.gamedistribution.com](https://developer.gamedistribution.com/) and create your game entry there to get its Game ID.
- Paste that Game ID into `platformConfig.js` (Section 3 above) before building your upload zip.
- Upload the zip through the Upload tab, then fully watch a test ad through their in-portal preview iframe — this is mandatory for them to flag your SDK implementation as correct.
- Click "Request Activation" once the preview confirms the ad played correctly.

---

## 5. What was implemented

**A. What was implemented**
A complete platform-abstraction monetization layer (`js/platform/`) plus
game-specific ad-strategy wiring into the existing match/tournament flow:
- Midgame/interstitial ad offered after non-tournament (1v1 and VS Computer)
  matches, roughly every 3 completed matches, only once the player has
  already seen and dismissed the MATCH_END result screen.
- A rewarded "WATCH AD TO CONTINUE" offer for a **non-final knockout
  tournament loss** (VS Computer opponents only, since all tournament
  matches are vs AI), granting +45 seconds of comeback match time on
  genuine ad completion, once per match, with an equally-prominent "CONTINUE
  WITHOUT AD" alternative that always works with no ad required.
- Full pause/mute/resume wiring tied to actual ad start/finish/failure
  events — never faked, never triggered on request alone.
- Duplicate-ad-request protection (a second click/tap while one is already
  in flight is ignored, not queued).
- Platform auto-detection with graceful, silent, no-op fallback on
  localhost, GitHub Pages, or any host with no supported SDK — no crashes,
  no fake ads, no dead buttons, no reward ever granted there.

**B. Exact files added/changed**
Added:
- `js/platform/platformConfig.js`
- `js/platform/platformSDK.js`
- `js/platform/adManager.js`
- `js/platform/adapters/crazyGamesAdapter.js`
- `js/platform/adapters/gameMonetizeAdapter.js`
- `js/platform/adapters/gameDistributionAdapter.js`
- `js/platform/adapters/genericWebAdapter.js`
- `DEPLOYMENT.md` (this file)

Changed:
- `index.html` — added the platform-layer `<script>` tags, before the
  existing game scripts. No other line changed.
- `js/main.js` — `bootstrap()` now also calls `PlatformSDK.init()` (does not
  block gameplay start); the tournament knockout-loss branch inside
  `update()` now checks ad-offer eligibility before committing a result to
  `TournamentManager` (see D below for why); a one-line call to
  `AdManager.recordNormalMatchCompleted()` was added right where a
  non-tournament match already reaches `MATCH_END`.
- `js/input.js` — the two existing "leave MATCH_END" call sites (keydown
  Enter, and pointerdown) now go through a new `exitMatchEndToMenu()`
  helper instead of setting `currentState = 'MENU'` directly; added
  handling for the new `TOURNAMENT_CONTINUE_OFFER` state's two buttons; added
  `declineTournamentContinueOffer()` and
  `requestTournamentContinueAdAndResume()`.
- `js/renderer.js` — added `drawTournamentContinueOffer()` and its dispatch
  in `draw()`; no existing drawing function's visual output was altered.
- `js/sound.js` — added `TOURNAMENT_CONTINUE_OFFER` to the states that use
  menu music (one line in the existing `switch`).

**C. Which platforms are supported**
- CrazyGames (HTML5 SDK v3) — full midgame + rewarded ad support.
- GameMonetize (official HTML5 SDK) — midgame ad support; "rewarded" ads on
  this platform use the same underlying `showBanner()` call GameMonetize
  documents for all video ads, since GameMonetize's official SDK does not
  expose a separate rewarded-ad API (see Section 6 and the adapter's file
  header comment for the exact reasoning — this is not a shortcut, it's the
  actual limit of their documented integration).
- GameDistribution (official HTML5 SDK) — full midgame + rewarded ad
  support via `gdsdk.showAd()` / `gdsdk.showAd('rewarded')`, both Promise-
  based; a rejected promise (no-fill/error) never grants a reward.
- Any other host (localhost, GitHub Pages, your own domain, or any platform
  with none of the above SDKs present) — generic no-op fallback: full
  gameplay, zero ads, zero errors.

**D. Exact ad placements implemented**
- Midgame ad: after a non-tournament match's MATCH_END screen is dismissed,
  roughly every 3 completed matches (tunable in `platformConfig.js`).
- Rewarded continue: offered immediately upon losing a non-final knockout
  tournament match, before the loss is recorded. This is deliberately
  **not** drawn on the existing `TOURNAMENT_RESULT`/`drawTournamentResult`
  screen — recording a knockout loss immediately simulates and advances the
  rest of the bracket inside `tournament.js` (`recordPlayerMatchResult` →
  `completeKnockoutRoundAfterPlayer` → `runRemainingTournament`), which
  cannot be safely undone without rewriting tournament-calculation
  internals. Rewriting that logic was explicitly out of scope, so instead
  the offer is shown on its own screen (`TOURNAMENT_CONTINUE_OFFER`)
  **before** anything is committed. Declining, or an ad that fails/is
  unfilled, then records the exact same result that always would have been
  recorded — the tournament calculations themselves were never touched.

**E. Which proposed features were rejected because of platform rules (or scope)**
- **VS Computer (non-tournament) rewarded comeback** — the spec marked this
  optional ("IF the specific platform rules allow it"). It was not
  implemented: a VS Computer match's only exit route is the same MATCH_END
  screen already used for the midgame-ad opportunity, and CrazyGames'
  advertisement requirements explicitly forbid combining a midgame ad with
  a "watch rewarded to keep playing" offer for the same match/transition.
  Building a second comeback system on the same screen the midgame ad
  already uses would create exactly that conflict. This can be added later
  as a genuinely separate opportunity (e.g. its own screen, mutually
  exclusive with the midgame offer for that particular match) but doing so
  now would either violate the platform rule or require gameplay-adjacent
  state changes beyond this task's scope.
- **Popular/locked tournament team unlock** — not implemented. Pro Striker's
  base game has no concept of a "locked" team at all; every team is freely
  selectable. Adding team-locking would be a new gameplay/progression
  feature, not a monetization hook on an existing one, and the task
  explicitly prohibits gameplay rewrites. The on/off switch for this
  (`AD_STRATEGY.lockedTeamRewardedUnlockEnabled` in `platformConfig.js`) is
  wired through `AdManager.isLockedTeamUnlockEnabled()` and ships `false`,
  ready for a future task that actually designs the locking feature itself.
- **CrazyGames banners** — the adapter's `showBanner()` is a documented
  no-op. CrazyGames' banner API requires a persistent DOM container sized
  to one of their fixed banner dimensions, and their own ad requirements
  forbid showing banners during gameplay. Pro Striker's UI is 100%
  canvas-rendered with no such container anywhere in `index.html`; adding
  one would be a UI change outside this task's scope. The adapter is fully
  ready to support real banners the moment a container is added.
- **GameDistribution display/banner ads** — same reasoning and same
  documented no-op as CrazyGames banners above: `gdsdk.showAd(gdsdk.AdType.Display, {containerId})`
  requires a DOM container this canvas-only UI doesn't have.
- **AddictingGames and GamePix adapters** — not built yet; their full
  technical SDK docs aren't public outside their developer portals. See
  Section 2's note on this. Not a platform-rules rejection, just a "can't
  verify the real API yet" situation — send the docs once you have
  developer access and these can be added the same way as the others.

**F. How ads behave when no SDK/platform is available**
The generic adapter (`genericWebAdapter.js`) is selected automatically.
`PlatformSDK.isSupported()` returns `false`; `AdManager` never even attempts
to request an ad in that case (`shouldOfferNormalMatchAd()` and
`canOfferTournamentContinue()` both check `PlatformSDK.isSupported()` first
and short-circuit to `false`). Concretely: the midgame ad opportunity is
silently skipped and the player goes straight to the menu; the tournament
"watch ad to continue" offer never appears at all — a knockout loss on
localhost/GitHub Pages/an unsupported host is recorded immediately, exactly
as tournament matches behaved before this task, with no dead button ever
shown.

**G/H.** See Sections 2 and 3 above.

**I.** See Section 4 above.

**J. What was actually tested**
- **Verified locally (in this environment):** JavaScript syntax validation
  of every changed/added file (`node --check`); isolated logic simulation of
  `AdManager`/`PlatformSDK` covering: generic-adapter selection with no SDK
  present, midgame ad never firing `onAdStarted` when unsupported, the
  every-3-matches pacing counter across 9 simulated matches, the duplicate-
  in-flight-request guard, and a full 7-case simulation of the tournament
  continue-offer state machine (first-loss offer, decline-records-real-loss,
  re-offer after a decline, successful-ad-grants-reward-and-marks-used,
  no-second-offer-after-use, final-round-never-offers, 1v1-never-offers).
  All cases passed. The GameDistribution adapter was additionally simulated
  directly: adapter registration, correct no-op with no Game ID configured,
  correct fallback to the generic adapter, `SDK_READY` correctly flips it
  to supported, `gdsdk.showAd('rewarded')` promise resolving correctly
  triggers the reward path, and a rejected promise correctly triggers
  failure with no reward granted. All cases passed.
- **Verified from official documentation only (not run against a live ad
  network in this environment):** the exact CrazyGames v3 API calls
  (`SDK.init()`, `SDK.ad.requestAd()`, `SDK.environment`,
  `SDK.game.loadingStart/Stop`, `SDK.game.gameplayStart/Stop`); the exact
  GameMonetize snippet (`window.SDK_OPTIONS`, the `SDK_READY` /
  `SDK_GAME_PAUSE` / `SDK_GAME_START` events, `sdk.showBanner()`); and the
  exact GameDistribution snippet (`window.GD_OPTIONS`, the `gdsdk` global,
  `SDK_READY`/`SDK_GAME_PAUSE`/`SDK_GAME_START`/`SDK_ERROR` events,
  `gdsdk.showAd()`/`gdsdk.showAd('rewarded')`) were copied/derived directly
  from each platform's current official docs/README/wiki/GitHub repo rather
  than invented, and cross-checked against multiple independent sources for
  GameMonetize specifically (its GitHub org's README, mirrored in two other
  org copies, and third-party integration reports spanning several years,
  all describing the identical single-call API).
- **Requires testing on the actual platform preview/submission environment:**
  the real ad fill/serve behavior, the real `adStarted`/`adFinished`/
  `adError` timing under CrazyGames' Preview tool, GameMonetize's actual
  `SDK_READY`/`SDK_GAME_PAUSE` timing after a real "Verify Game" pass, and
  GameDistribution's actual ad-promise timing through their upload-tab
  preview iframe — none of this could be exercised in this sandboxed
  environment, which has no network access to any of these ad networks and
  no browser to load a live SDK in. This integration cannot be honestly
  claimed as "verified working end to end" on any of the three platforms
  until you run it through each one's own preview/verification step.
- I do not have the ability to run a real browser or reach the internet
  from inside this delivery environment, so gameplay regression (physics,
  AI, tournament bracket correctness, audio) was checked by careful reading
  of every code path this change touches, not by playing the game — please
  do a normal playthrough (1v1, VS Computer, and at least one full
  tournament run including a knockout loss) before shipping.

**K. Remaining limitations**
- GameMonetize's official SDK has no way to distinguish "the ad played
  successfully" from "no ad was available" beyond whether
  `SDK_GAME_PAUSE` fired before `SDK_GAME_START` — the adapter uses exactly
  that signal, which is the actual limit of their documented API, not a
  workaround that could be improved with more effort.
- The rewarded continue's "+45 seconds" is added as extra match clock on a
  freshly-restarted copy of the same fixture, rather than resuming the
  exact score/ball position the player was eliminated at (Pro Striker has
  no mechanism to snapshot/restore mid-match state, and building one would
  be a gameplay-engine change outside this task's scope).
- VS Computer rewarded comeback and the locked-team unlock are deferred —
  see E above.
- AddictingGames and GamePix adapters are not yet built — their full
  technical SDK docs aren't public; see the note in Section 2.
- No live ad-network testing was possible in this delivery environment —
  see J above.


---

## 8. Changes in this build (ad/SDK safety + shop)

**Ad / SDK layer (behaviour of the public contract is unchanged):**
- `AdManager` now runs every ad request through a watchdog. If a platform SDK
  never starts an ad within 12s (or never reports it finished within 150s) the
  request is failed on our side, audio is restored and the game continues -
  previously a silent SDK (GameMonetize / GameDistribution can do this when no ad
  is available) left the result screens ignoring taps forever. A rewarded ad that
  times out never grants its reward.
- Each adapter gained an optional `abortPendingAd()` so the next request works
  after a timed-out one. `PlatformSDK.detectPlatform()` gives each adapter 8s to
  detect itself so a blocked SDK script can't stall detection.
- `PlatformSDK.onGameplayStart()/onGameplayStop()` existed but were never called.
  `main.js` now reports them (start when a live, unpaused match is running; stop
  on pause, halftime, goal celebration, result screens and while an ad shows).
- New optional `AdManager.requestCoinReward()` for the shop's "Watch ad" button.
  It is only offered when a real ad platform is active and only when the player
  taps it.

**Shop (`js/shop.js`):** coins, ball skins, ball trails, striker skins and
pitches. Saved in `localStorage` under `prostriker_shop_v1` (validated on load).
Nothing in the shop touches physics, AI, tournament rules or the ad strategy.
To add an item, append it to the right list in `SHOP_CATALOG` (keep each list in
ascending price order, max 8 per category).
