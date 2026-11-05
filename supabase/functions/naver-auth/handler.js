// OAuth credentials and Supabase admin access never leave this server.
const callbacks = new Set([
    'https://copkill44-lgtm.github.io/ondocha/naver-callback.html',
    'http://127.0.0.1:8000/naver-callback.html'
]);
const origins = new Set([...callbacks].map(value => new URL(value).origin));
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const sha = async text => hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
const pack = value => btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const unpack = value => JSON.parse(atob(value.replaceAll('-', '+').replaceAll('_', '/')));
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

export function createHandler(env, fetcher = fetch, now = () => Date.now()) {
    const key = () => crypto.subtle.importKey('raw', encoder.encode(env.SUPABASE_SERVICE_ROLE_KEY),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    const sign = async payload => hex(await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload)));
    const verify = async (payload, signature) => {
        if (!/^[a-f0-9]{64}$/.test(signature)) return false;
        const bytes = Uint8Array.from(signature.match(/../g), part => parseInt(part, 16));
        return crypto.subtle.verify('HMAC', await key(), bytes, encoder.encode(payload));
    };
    const remote = async (url, options) => {
        const response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
        if (!response.ok) fail('naver_connection_failed', 502);
        return response.json();
    };
    return async request => {
        const origin = request.headers.get('origin') || '';
        const headers = {
            'Content-Type': 'application/json', 'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer', 'Vary': 'Origin',
            'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'null',
            'Access-Control-Allow-Headers': 'content-type, apikey',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        };
        const reply = (status, data) => new Response(JSON.stringify(data), { status, headers });
        if (!origins.has(origin)) return reply(403, { error: 'origin_not_allowed' });
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
        if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
        if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
            return reply(503, { error: 'naver_not_configured' });
        try {
            const text = await request.text();
            if (text.length > 12000) fail('request_too_large', 413);
            const body = JSON.parse(text);
            if (body.action === 'start') {
                if (!callbacks.has(body.redirectTo) || new URL(body.redirectTo).origin !== origin) fail('invalid_redirect');
                if (!/^[a-f0-9]{64}$/.test(body.challenge)) fail('invalid_challenge');
                const payload = pack({ redirectTo: body.redirectTo, challenge: body.challenge, expires: now() + 600000 });
                const state = payload + '.' + await sign(payload);
                const url = new URL('https://nid.naver.com/oauth2.0/authorize');
                url.search = new URLSearchParams({ response_type: 'code', client_id: env.NAVER_CLIENT_ID,
                    redirect_uri: body.redirectTo, state }).toString();
                return reply(200, { url: url.href, state });
            }
            if (body.action !== 'finish') fail('invalid_action');
            if (typeof body.state !== 'string' || body.state.length > 4000 || !/^[a-f0-9]{64}$/.test(body.verifier)) fail('invalid_state');
            const parts = body.state.split('.');
            if (parts.length !== 2 || !await verify(parts[0], parts[1])) fail('invalid_state');
            const state = unpack(parts[0]);
            if (!Number.isFinite(state.expires) || state.expires < now() || state.expires > now() + 600000) fail('expired_state');
            if (!callbacks.has(state.redirectTo) || new URL(state.redirectTo).origin !== origin) fail('invalid_redirect');
            if (state.challenge !== await sha(body.verifier)) fail('invalid_verifier');
            if (typeof body.code !== 'string' || !body.code || body.code.length > 2000) fail('invalid_code');
            // Naver accepts each authorization code only once. The signed state and
            // browser-held verifier prevent login CSRF and stolen-code redemption.
            const token = await remote('https://nid.naver.com/oauth2.0/token', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ grant_type: 'authorization_code', client_id: env.NAVER_CLIENT_ID,
                    client_secret: env.NAVER_CLIENT_SECRET, redirect_uri: state.redirectTo,
                    code: body.code, state: body.state }).toString()
            });
            if (token.error || typeof token.access_token !== 'string' || !token.access_token) fail('naver_token_failed', 401);
            const profile = await remote('https://openapi.naver.com/v1/nid/me', {
                headers: { Authorization: 'Bearer ' + token.access_token }
            });
            if (profile.resultcode !== '00' || typeof profile.response?.id !== 'string' || !profile.response.id || profile.response.id.length > 256)
                fail('naver_profile_failed', 401);
            // Never authenticate an existing email account from an external email claim.
            // A stable, non-deliverable alias isolates Naver identities from other providers.
            const identity = await sha(env.NAVER_CLIENT_ID + ':' + profile.response.id);
            const email = 'naver-' + identity.slice(0, 56) + '@naver.ondocha.invalid';
            const generated = await remote(env.SUPABASE_URL + '/auth/v1/admin/generate_link', {
                method: 'POST', headers: { 'Content-Type': 'application/json',
                    apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY },
                body: JSON.stringify({ type: 'magiclink', email,
                    data: { name: String(profile.response.nickname || '네이버 회원').slice(0, 80), login_provider: 'naver' } })
            });
            if (!generated.hashed_token || !['magiclink', 'signup'].includes(generated.verification_type)) fail('session_creation_failed', 502);
            return reply(200, { token_hash: generated.hashed_token, type: generated.verification_type });
        } catch (error) {
            // Do not log or echo provider tokens, authorization codes, or admin responses.
            const known = ['invalid_redirect','invalid_challenge','request_too_large','invalid_action','invalid_state',
                'expired_state','invalid_verifier','invalid_code','naver_connection_failed','naver_token_failed',
                'naver_profile_failed','session_creation_failed'];
            return reply(known.includes(error.message) ? error.status : 500,
                { error: known.includes(error.message) ? error.message : 'naver_login_failed' });
        }
    };
}
