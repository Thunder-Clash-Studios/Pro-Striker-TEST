// ===== PRO STRIKER - platformConfig.js =====
// ============================================================
// TO SWITCH PLATFORMS.
// ============================================================
//

const ACTIVE_PLATFORM = 'auto';

// ----- 2. PER-PLATFORM SETTINGS -----

const PLATFORM_SETTINGS = {
    crazygames: {
        // CrazyGames' HTML5 SDK does NOT require a Game ID to be set in

    },
    gamemonetize: {
        gameId: 'rua9zsifeg0s7558al2qu896560zteeo'
    },
    gamedistribution: {
        // REQUIRED: paste the Game ID (gameId) from your
        // developer.gamedistribution.com dashboard here. Without this,
        // the GameDistribution SDK will not initialize correctly.
        gameId: 'your_game_id_here'
    },
    generic: {
        // No settings — this is the "no ad platform" fallback used on
        // localhost, GitHub Pages, or any site with no ad SDK installed.
    }
};

// ----- 3. AD STRATEGY SETTINGS -----
// Tunable numbers for Pro Striker's own ad-frequency strategy (on top of
// whatever pacing rules the platform SDK itself enforces). Change these
// if you want the pacing to feel different — no other file needs editing.
const AD_STRATEGY = {
    // Show a midgame ad opportunity roughly every N completed normal
    // (non-tournament) matches. This is Pro Striker's own request
    // opportunity — platforms that manage their own pacing (like
    // CrazyGames) are free to silently ignore a request that comes too
    // soon; that's expected and handled gracefully.
    normalMatchAdInterval: 3,

    // Seconds of "comeback" match clock added when a tournament rewarded
    // continue is used.
    tournamentContinueBonusSeconds: 45,

    // Whether the "watch an ad to unlock a popular team" feature is
    // enabled at all. Kept as a single on/off switch here — see the
    // delivery notes for why this ships OFF by default.
    lockedTeamRewardedUnlockEnabled: false
};

window.PLATFORM_CONFIG = {
    ACTIVE_PLATFORM,
    PLATFORM_SETTINGS,
    AD_STRATEGY
};
