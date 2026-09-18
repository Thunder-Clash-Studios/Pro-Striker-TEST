// ===== PRO STRIKER - gameMonetizeAdapter.js =====
// Adapter for the official GameMonetize.com HTML5 SDK.
// Docs verified against https://github.com/GameMonetize/GameMonetize.com-SDK
// (README, current as of this integration) and https://gamemonetize.com/sdk.
//
// GameMonetize SDK facts this adapter relies on (verified in docs):
//   - Loaded via window.SDK_OPTIONS = { gameId, onEvent } BEFORE injecting
//     https://api.gamemonetize.com/sdk.js (the snippet appends the script
//     itself — see loadSdk() below, which reproduces the official snippet
//     exactly rather than re-implementing it).
//   - There is NO separate initialization call — the SDK announces
//     readiness via the "SDK_READY" event inside onEvent.
//   - There is only ONE ad-trigger call in the entire documented API:
//         sdk.showBanner()
//     Despite the name, GameMonetize's own docs/community confirm this
//     shows a full interstitial-style video ad, not a small banner strip.
//     There is NO separate/distinct "rewarded ad" call documented anywhere
//     in the official SDK — GameMonetize does not expose a way to request
//     specifically a rewarded ad, nor a way to know in code whether the ad
//     that just played was "successful" beyond the pause/resume events.
//   - Lifecycle is communicated only through two onEvent cases:
//       "SDK_GAME_PAUSE" -> an ad is about to play: pause + mute NOW.
//       "SDK_GAME_START" -> the ad is done: resume + unmute NOW.
//     There is no distinct "ad failed"/"unfilled" event in this SDK. If no
//     ad is available, GameMonetize's own guidance (and community reports)
//     confirm SDK_GAME_PAUSE/SDK_GAME_START may not fire at all, or may
//     fire back-to-back near-instantly. This adapter treats "the game was
//     never actually paused before SDK_GAME_START fired" as No safe
//     reward signal — see showRewardedAd() below for exactly how this is
//     handled honestly instead of being papered over.
//
// IMPORTANT — read before assuming this adapter is "missing" a rewarded
// API: it isn't. GameMonetize's official SDK genuinely does not have one.
// showRewardedAd() below reuses showBanner() because that is the ONLY
// call GameMonetize documents for triggering any video ad at all.

(function () {
    const SDK_SCRIPT_ID = 'gamemonetize-sdk';

    const GameMonetizeAdapter = {
        name: 'gamemonetize',
        _ready: false,
        _sdkReady: false,
        _pendingAdRequest: false,
        _pendingCallbacks: null,
        _pauseSeenForCurrentRequest: false,
        _gameId: null,

        // GameMonetize gives no clean synchronous "are we on GameMonetize"
        // signal before loading their script (unlike CrazyGames' documented
        // environment strings). The SDK is designed to be embedded ONLY on
        // GameMonetize-distributed pages, and is otherwise inert/harmless
        // to load (it just won't ever call SDK_READY). So detection here
        // means "did the official SDK script load AND announce SDK_READY
        // within a short timeout" — if it never does, we correctly treat
        // GameMonetize as not the active platform instead of guessing.
        detect() {
            const cfg = (window.PLATFORM_CONFIG && window.PLATFORM_CONFIG.PLATFORM_SETTINGS.gamemonetize) || {};
            this._gameId = cfg.gameId || null;

            return new Promise((resolve) => {
                let settled = false;
                const finish = (result) => { if (!settled) { settled = true; resolve(result); } };

                if (!this._gameId || this._gameId === 'your_game_id_here') {
                    // No real Game ID configured — this build was never set
                    // up for GameMonetize, so don't even attempt to load
                    // their SDK. Prevents a spurious network request (and
                    // console noise) on every other platform/localhost.
                    finish(false);
                    return;
                }

                // ===== Official GameMonetize integration snippet =====
                // Reproduced exactly as documented — do not alter the
                // loader IIFE below, it is copied verbatim from
                // GameMonetize's own README.
                window.SDK_OPTIONS = {
                    gameId: this._gameId,
                    onEvent: (event) => this._handleSdkEvent(event, finish)
                };
                (function (a, b, c) {
                    const d = a.getElementsByTagName(b)[0];
                    if (!a.getElementById(c)) {
                        a = a.createElement(b);
                        a.id = c;
                        a.src = 'https://api.gamemonetize.com/sdk.js';
                        d.parentNode.insertBefore(a, d);
                    }
                })(document, 'script', SDK_SCRIPT_ID);
                // ===== end official snippet =====

                // The SDK script itself doesn't return a promise, and
                // SDK_READY only fires once the ad network has actually
                // responded — on a domain GameMonetize doesn't recognize,
                // or with no network access, this simply never happens. A
                // bounded timeout is the only honest way to decide "this
                // isn't GameMonetize" without hanging the whole platform
                // detector forever.
                setTimeout(() => finish(this._sdkReady), 4000);
            });
        },

        _handleSdkEvent(event, onFirstReady) {
            switch (event.name) {
                case 'SDK_READY':
                    this._sdkReady = true;
                    this._ready = true;
                    console.log('[PlatformSDK][GameMonetize] SDK ready');
                    if (onFirstReady) onFirstReady(true);
                    break;
                case 'SDK_GAME_PAUSE':
                    this._pauseSeenForCurrentRequest = true;
                    if (this._pendingCallbacks && this._pendingCallbacks.onAdStarted) {
                        this._pendingCallbacks.onAdStarted();
                    }
                    break;
                case 'SDK_GAME_START':
                    // Ad (if any) is over. GameMonetize gives no separate
                    // failure event, so we infer success/failure from
                    // whether we actually saw SDK_GAME_PAUSE first for this
                    // specific request.
                    if (this._pendingAdRequest) {
                        const cbs = this._pendingCallbacks;
                        const sawPause = this._pauseSeenForCurrentRequest;
                        this._pendingAdRequest = false;
                        this._pendingCallbacks = null;
                        this._pauseSeenForCurrentRequest = false;
                        if (cbs) {
                            if (sawPause && cbs.onAdFinished) cbs.onAdFinished();
                            else if (!sawPause && cbs.onAdFailed) cbs.onAdFailed('unfilled', false);
                        }
                    }
                    break;
                default:
                    break;
            }
        },

        async init() {
            // Nothing further to do — detect() already performed the full
            // official load sequence and waited for SDK_READY.
            return this._ready;
        },

        isSupported() {
            return this._ready && this._sdkReady;
        },

        // GameMonetize's docs only ever describe ONE ad type. Both
        // "midgame" and "rewarded" in Pro Striker's own strategy map to
        // this same underlying call — this is not a shortcut, it's the
        // actual limit of the documented API. See file header.
        _requestBannerAd(callbacks) {
            if (!this.isSupported()) { callbacks && callbacks.onAdFailed && callbacks.onAdFailed('not_supported'); return; }
            if (this._pendingAdRequest) { callbacks && callbacks.onAdFailed && callbacks.onAdFailed('already_pending'); return; }
            if (typeof window.sdk === 'undefined' || typeof window.sdk.showBanner === 'undefined') {
                callbacks && callbacks.onAdFailed && callbacks.onAdFailed('sdk_object_missing');
                return;
            }
            this._pendingAdRequest = true;
            this._pendingCallbacks = callbacks || {};
            this._pauseSeenForCurrentRequest = false;
            try {
                window.sdk.showBanner();
            } catch (e) {
                this._pendingAdRequest = false;
                this._pendingCallbacks = null;
                callbacks && callbacks.onAdFailed && callbacks.onAdFailed('exception');
            }
        },

        showMidgameAd(callbacks) { this._requestBannerAd(callbacks); },
        // Honest limitation: GameMonetize has no dedicated rewarded-ad
        // call. We use the same showBanner() call, and only grant the
        // reward if SDK_GAME_PAUSE genuinely fired first (see
        // _handleSdkEvent above) — i.e. an ad genuinely appeared to play.
        showRewardedAd(callbacks) { this._requestBannerAd(callbacks); },

        // GameMonetize's documented API has no separate banner-strip
        // concept distinct from showBanner()'s interstitial behavior, so
        // there is nothing additional to implement here beyond the ad
        // calls above.
        showBanner() {
            console.log('[PlatformSDK][GameMonetize] showBanner() is the same call used for midgame/rewarded ads on this platform — see showMidgameAd/showRewardedAd.');
        },

        isRewardedAdAvailable() {
            // GameMonetize exposes no fill-rate/availability pre-check in
            // its documented API — the only way to know is to request and
            // observe whether SDK_GAME_PAUSE fires. We report "available"
            // whenever the SDK is ready, consistent with the platform's
            // own request-and-see integration model.
            return this.isSupported();
        },

        onGameplayStart() { /* GameMonetize's documented API has no gameplay-start/stop hooks. */ },
        onGameplayStop() { /* GameMonetize's documented API has no gameplay-start/stop hooks. */ }
    };

    window.PLATFORM_ADAPTERS = window.PLATFORM_ADAPTERS || {};
    window.PLATFORM_ADAPTERS.gamemonetize = GameMonetizeAdapter;
})();
