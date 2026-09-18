// ===== PRO STRIKER - adManager.js =====
// Pro Striker's own ad STRATEGY — when to offer ads, how often, and how to
// wire an ad's lifecycle into this specific game's pause/mute/state
// system. This file knows about PlatformSDK (the generic layer) and about
// Pro Striker's game state (currentState, SoundManager, tournament
// globals) — that's the intended split:
//   platformSDK.js / adapters/*  -> "how do I talk to this ad platform"
//   adManager.js (this file)     -> "when/why does PRO STRIKER show an ad"
//
// Nothing in main.js/input.js/tournament.js/renderer.js needs to know
// which ad platform is active — they only ever call into AdManager.

(function () {
    // Persisted across a play session only (not saved to localStorage on
    // purpose — a fresh page load is a fresh session for ad pacing, same
    // as how the platforms themselves reset their own pacing on reload).
    const state = {
        completedNormalMatches: 0,       // non-tournament matches finished since last midgame ad offer
        adRequestInFlight: false,        // duplicate-click / duplicate-request guard
        wasMusicEnabledBeforeAd: true,
        wasSfxEnabledBeforeAd: true,
        preAdState: null,                // currentState to restore to if needed
        tournamentContinueUsedForMatch: null // uid of the tournament match a continue was already used for
    };

    function muteForAd() {
        state.wasMusicEnabledBeforeAd = SoundManager.musicEnabled;
        state.wasSfxEnabledBeforeAd = SoundManager.sfxEnabled;
        if (SoundManager.musicEnabled) SoundManager.stopMusic();
        SoundManager.musicEnabled = false;
        SoundManager.sfxEnabled = false;
    }

    function unmuteAfterAd() {
        SoundManager.musicEnabled = state.wasMusicEnabledBeforeAd;
        SoundManager.sfxEnabled = state.wasSfxEnabledBeforeAd;
        if (SoundManager.musicEnabled) SoundManager.updateMusicForState(currentState);
    }

    const AdManager = {
        // ----- Session bookkeeping the rest of the game calls into -----

        // Call exactly once, right after a non-tournament match reaches
        // MATCH_END (see main.js). Tournament matches use their own
        // TOURNAMENT_RESULT flow instead (see canOfferTournamentContinue
        // and requestTournamentContinueAd below) — they must never also
        // count toward this normal-match counter, since mixing a midgame
        // ad with a rewarded continue offer for the very same match is
        // explicitly against CrazyGames' ad policy (no chaining / no
        // combining a midgame ad with a "watch rewarded to keep playing"
        // for the same match).
        recordNormalMatchCompleted() {
            state.completedNormalMatches++;
        },

        // Should Pro Striker offer a midgame ad right now? Purely Pro
        // Striker's own pacing intent — the platform SDK (CrazyGames in
        // particular) is free to silently ignore the request if its own
        // pacing rules say it's too soon, which is expected and fine.
        shouldOfferNormalMatchAd() {
            const interval = (window.PLATFORM_CONFIG && window.PLATFORM_CONFIG.AD_STRATEGY.normalMatchAdInterval) || 3;
            return PlatformSDK.isSupported() && state.completedNormalMatches > 0 && (state.completedNormalMatches % interval === 0);
        },

        // Called from the MATCH_END click handler for non-tournament
        // matches, AFTER the result screen has already been shown and
        // acknowledged (never as a surprise mid-transition), and only
        // when shouldOfferNormalMatchAd() said yes.
        requestNormalMatchAd(onDone) {
            if (state.adRequestInFlight) return;
            if (!PlatformSDK.isSupported()) { onDone && onDone(); return; }
            state.adRequestInFlight = true;
            PlatformSDK.showMidgameAd({
                onAdStarted: () => {
                    state.preAdState = currentState;
                    muteForAd();
                },
                onAdFinished: () => {
                    state.adRequestInFlight = false;
                    unmuteAfterAd();
                    onDone && onDone();
                },
                onAdFailed: (code, adStarted) => {
                    state.adRequestInFlight = false;
                    if (adStarted) unmuteAfterAd();
                    console.log('[AdManager] Midgame ad unavailable/failed:', code);
                    onDone && onDone();
                }
            });
        },

        // ----- Tournament rewarded "continue" offer -----
        // One offer per eliminated match, ever — tracked by the tournament
        // match's own uid so a player can't back out and re-trigger it.
        hasUsedContinueForMatch(matchUid) {
            return state.tournamentContinueUsedForMatch === matchUid;
        },

        markContinueUsedForMatch(matchUid) {
            state.tournamentContinueUsedForMatch = matchUid;
        },

        // Whether the rewarded "continue" offer should even be shown for
        // this particular loss. Encodes the actual game-design rules from
        // the spec, not just "is an SDK present":
        //   - platform must actually support rewarded ads
        //   - never for 1v1 (no rewarded ads in 1v1 at all)
        //   - never for a loss in the tournament FINAL (round index 3) —
        //     a real loss there stays a real loss
        //   - never twice for the same match
        canOfferTournamentContinue(matchUid, isFinalRound) {
            if (!PlatformSDK.isSupported()) return false;
            if (gameMode === '1v1') return false;
            if (isFinalRound) return false;
            if (this.hasUsedContinueForMatch(matchUid)) return false;
            return true;
        },

        // Requests the rewarded ad for a tournament continue. Reward
        // (extra match time / comeback opportunity) is only granted by the
        // caller inside onReward — this function never grants anything
        // itself, it only reports whether the ad genuinely completed.
        requestTournamentContinueAd(matchUid, { onReward, onDeclinedOrFailed } = {}) {
            if (state.adRequestInFlight) return;
            state.adRequestInFlight = true;
            PlatformSDK.showRewardedAd({
                onAdStarted: () => {
                    state.preAdState = currentState;
                    muteForAd();
                },
                onAdFinished: () => {
                    state.adRequestInFlight = false;
                    unmuteAfterAd();
                    AdManager.markContinueUsedForMatch(matchUid);
                    onReward && onReward();
                },
                onAdFailed: (code, adStarted) => {
                    state.adRequestInFlight = false;
                    if (adStarted) unmuteAfterAd();
                    console.log('[AdManager] Rewarded ad unavailable/failed — no reward granted:', code);
                    onDeclinedOrFailed && onDeclinedOrFailed(code);
                }
            });
        },

        // ----- Locked/popular team unlock (optional, off by default) -----
        isLockedTeamUnlockEnabled() {
            return !!(window.PLATFORM_CONFIG && window.PLATFORM_CONFIG.AD_STRATEGY.lockedTeamRewardedUnlockEnabled) && PlatformSDK.isSupported();
        },

        isAdRequestInFlight() {
            return state.adRequestInFlight;
        },

        getBonusSeconds() {
            return (window.PLATFORM_CONFIG && window.PLATFORM_CONFIG.AD_STRATEGY.tournamentContinueBonusSeconds) || 45;
        }
    };

    window.AdManager = AdManager;
})();
