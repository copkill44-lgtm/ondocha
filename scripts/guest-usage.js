// A browser-local guest trial. One completed recommendation set counts as one use.
// This key is intentionally outside CLOUD_DATA_KEYS so login/logout cannot reset it.
const GUEST_RECOMMENDATION_LIMIT = 5;
const GUEST_USAGE_KEY = 'ondocha-guest-recommendations-used';
let guestUsageMemory = 0;

function guestRecommendationsUsed() {
    try {
        const stored = Number(localStorage.getItem(GUEST_USAGE_KEY));
        if (Number.isFinite(stored) && stored >= 0) {
            guestUsageMemory = Math.max(guestUsageMemory, Math.min(GUEST_RECOMMENDATION_LIMIT, Math.floor(stored)));
        }
    } catch { /* Keep the limit for this page when storage is unavailable. */ }
    return guestUsageMemory;
}

function updateGuestUsage() {
    const notice = document.getElementById('guestUsageNotice');
    if (!notice) return;
    notice.hidden = !!currentAuthUser;
    if (currentAuthUser) return;
    const remaining = GUEST_RECOMMENDATION_LIMIT - guestRecommendationsUsed();
    document.getElementById('guestUsageText').textContent = remaining > 0
        ? '로그인 없이 체험 중 · 코디 추천 ' + remaining + ' / 5회 남았어요'
        : '체험 5회를 모두 사용했어요. 로그인하면 계속 추천받을 수 있어요.';
}

function recordGuestRecommendation() {
    guestUsageMemory = Math.min(GUEST_RECOMMENDATION_LIMIT, guestRecommendationsUsed() + 1);
    try { localStorage.setItem(GUEST_USAGE_KEY, String(guestUsageMemory)); } catch { /* In-memory fallback. */ }
    updateGuestUsage();
}

function canRequestRecommendation() {
    if (currentAuthUser || guestRecommendationsUsed() < GUEST_RECOMMENDATION_LIMIT) return true;
    if (typeof featureTourActive !== 'undefined' && featureTourActive) finishFeatureTour();
    openEmailAuth('loginView');
    setAuthMessage('loginMessage', '무료 체험 5회를 모두 사용했어요. 로그인하면 코디 추천을 계속 이용할 수 있어요.', 'info');
    return false;
}

window.addEventListener('storage', event => {
    if (event.key === GUEST_USAGE_KEY || event.key === null) updateGuestUsage();
});
