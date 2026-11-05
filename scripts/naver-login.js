// Shared by the main page and the isolated OAuth callback page.
const NAVER_FLOW_KEY = 'ondocha-naver-login';
const naverHex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function naverRequest(payload) {
    const response = await fetch(ONDOCHA_CONFIG.supabaseUrl + '/functions/v1/smart-service', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ONDOCHA_CONFIG.supabasePublishableKey },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(45000)
    });
    if (response.status === 404) throw new Error('naver_not_configured');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error === 'naver_not_configured' ? 'naver_not_configured' : 'naver_login_failed');
    return data;
}
async function beginNaverLogin() {
    const verifier = naverHex(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = naverHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const redirectTo = new URL('naver-callback.html', window.location.href).href;
    const data = await naverRequest({ action: 'start', redirectTo, challenge });
    const target = new URL(data.url);
    if (target.origin !== 'https://nid.naver.com' || target.pathname !== '/oauth2.0/authorize' ||
        !data.state || target.searchParams.get('state') !== data.state) throw new Error('invalid_authorization_url');
    sessionStorage.setItem(NAVER_FLOW_KEY, JSON.stringify({ state: data.state, verifier, expires: Date.now() + 600000 }));
    window.location.assign(target.href);
}
async function finishNaverLogin() {
    const status = document.getElementById('naverCallbackStatus');
    const url = new URL(window.location.href);
    const saved = sessionStorage.getItem(NAVER_FLOW_KEY);
    sessionStorage.removeItem(NAVER_FLOW_KEY);
    // Remove authorization codes from browser history before any asynchronous work.
    window.history.replaceState(null, '', url.pathname);
    try {
        const flow = saved && JSON.parse(saved);
        if (!flow || flow.expires < Date.now() || url.searchParams.get('state') !== flow.state) throw new Error('invalid_state');
        if (url.searchParams.has('error') || !url.searchParams.get('code')) throw new Error('cancelled');
        const data = await naverRequest({ action: 'finish', code: url.searchParams.get('code'), state: flow.state, verifier: flow.verifier });
        const client = window.supabase.createClient(ONDOCHA_CONFIG.supabaseUrl, ONDOCHA_CONFIG.supabasePublishableKey);
        const { data: auth, error } = await client.auth.verifyOtp({ token_hash: data.token_hash, type: data.type });
        if (error || !auth.session) throw new Error('session_failed');
        window.location.replace(new URL('./', url.href).href);
    } catch {
        status.textContent = '네이버 로그인을 완료하지 못했어요. 사이트로 돌아가 다시 시도해 주세요.';
        document.getElementById('naverCallbackBack').hidden = false;
    }
}
