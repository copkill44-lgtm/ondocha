import { createHandler } from './handler.js';
const origin = 'https://copkill44-lgtm.github.io';
const redirectTo = origin + '/ondocha/naver-callback.html';
const env = { NAVER_CLIENT_ID: 'test-client', NAVER_CLIENT_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key' };
const assert = (value, message = 'assertion failed') => { if (!value) throw new Error(message); };
const equal = (a,b) => assert(JSON.stringify(a) === JSON.stringify(b), JSON.stringify([a,b]));
const digest = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2,'0')).join('');
function request(body, from = origin, method = 'POST') {
    return new Request('https://test.supabase.co/functions/v1/naver-auth', {
        method, headers: { Origin: from, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
}
function setup(overrides = {}) {
    const calls = [];
    const fetcher = async (url, options) => {
        calls.push({ url, options });
        if (url.endsWith('/oauth2.0/token')) return Response.json(overrides.token || { access_token: 'private-naver-token' });
        if (url.endsWith('/v1/nid/me')) return Response.json(overrides.profile || { resultcode: '00', response: { id: 'naver-identity-1', nickname: '회원', email: 'victim@example.com' } });
        if (url.endsWith('/admin/generate_link')) return Response.json({ hashed_token: 'one-time-hash', verification_type: 'magiclink' });
        throw new Error('unexpected fetch');
    };
    let clock = 1000000;
    const handler = createHandler(env, fetcher, () => clock);
    return { handler, calls, advance: () => { clock += 600001; } };
}
async function begin(handler, verifier = 'a'.repeat(64)) {
    const response = await handler(request({ action: 'start', redirectTo, challenge: await digest(verifier) }));
    equal(response.status, 200);
    const data = await response.json();
    return { action: 'finish', state: data.state, code: 'new-code', verifier };
}
Deno.test('successful exchange uses verified Naver ID, never the claimed email', async () => {
    const { handler, calls } = setup();
    const result = await handler(request(await begin(handler)));
    equal(result.status, 200); equal(await result.json(), { token_hash: 'one-time-hash', type: 'magiclink' });
    equal(calls.length, 3);
    const body = JSON.parse(calls[2].options.body);
    assert(body.email.endsWith('@naver.ondocha.invalid'));
    assert(!JSON.stringify(body).includes('victim@example.com'));
    const tokenBody = new URLSearchParams(calls[0].options.body);
    equal(tokenBody.get('redirect_uri'), redirectTo); equal(tokenBody.get('client_secret'), 'test-secret');
});
Deno.test('same Naver ID produces stable identity; different IDs stay separate', async () => {
    const aliases = [];
    for (const id of ['one','one','two']) {
        const {handler,calls}=setup({profile:{resultcode:'00',response:{id}}});
        equal((await handler(request(await begin(handler)))).status,200);
        aliases.push(JSON.parse(calls[2].options.body).email);
    }
    equal(aliases[0],aliases[1]);assert(aliases[0]!==aliases[2]);
});
Deno.test('tampered state cannot trigger provider calls', async () => {
    const { handler, calls } = setup(); const body = await begin(handler); body.state += 'a';
    equal((await handler(request(body))).status,400); equal(calls.length,0);
});
Deno.test('wrong browser verifier cannot redeem a valid code', async () => {
    const {handler,calls}=setup();const body=await begin(handler);body.verifier='b'.repeat(64);
    equal((await handler(request(body))).status,400);equal(calls.length,0);
});
Deno.test('expired signed state is rejected', async () => {
    const {handler,calls,advance}=setup();const body=await begin(handler);advance();
    equal((await handler(request(body))).status,400);equal(calls.length,0);
});
Deno.test('redirect and origin injection are rejected', async () => {
    const {handler,calls}=setup();
    equal((await handler(request({action:'start',redirectTo:'https://evil.example/naver-callback.html',challenge:'a'.repeat(64)}))).status,400);
    equal((await handler(request({},'https://evil.example'))).status,403);equal(calls.length,0);
});
Deno.test('state is bound to callback origin', async () => {
    const {handler,calls}=setup();const body=await begin(handler);
    equal((await handler(request(body,'http://127.0.0.1:8000'))).status,400);equal(calls.length,0);
});
Deno.test('token failure never issues a Supabase login hash', async () => {
    const {handler,calls}=setup({token:{error:'invalid_grant',access_token:'bad'}});
    const response=await handler(request(await begin(handler)));
    equal(response.status,401);equal(calls.length,1);assert(!(await response.text()).includes('bad'));
});
Deno.test('invalid Naver profile cannot create a session', async () => {
    const {handler,calls}=setup({profile:{resultcode:'00',response:{email:'victim@example.com'}}});
    equal((await handler(request(await begin(handler)))).status,401);equal(calls.length,2);
});
Deno.test('unconfigured service returns setup status without secrets', async () => {
    const response=await createHandler({})(request({action:'start'}));
    equal(response.status,503);equal(await response.json(),{error:'naver_not_configured'});
});
Deno.test('preflight and invalid methods do not authenticate', async () => {
    const {handler,calls}=setup();equal((await handler(request({},origin,'OPTIONS'))).status,204);
    equal((await handler(request({},origin,'GET'))).status,405);equal(calls.length,0);
});
Deno.test('malformed body does not expose internals', async () => {
    const {handler,calls}=setup();const response=await handler(new Request('https://test.invalid',{
        method:'POST',headers:{Origin:origin},body:'{' }));
    equal(response.status,500);equal(await response.json(),{error:'naver_login_failed'});equal(calls.length,0);
});
