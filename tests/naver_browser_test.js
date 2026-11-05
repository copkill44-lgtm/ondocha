const source = await Deno.readTextFile('scripts/naver-login.js');
const assert = value => { if (!value) throw new Error('assertion failed'); };
const equal = (a,b) => assert(JSON.stringify(a) === JSON.stringify(b));
function setup(mode = 'ok') {
    const stored = new Map(); const calls = []; const status = { textContent: '' }; const back = { hidden: true };
    const state = 'signed-state';
    const location = { href: 'https://copkill44-lgtm.github.io/ondocha/',
        assign(url) { calls.push({assign:url}); }, replace(url) { calls.push({replace:url}); } };
    const window = { location, history: { replaceState(...args) { calls.push({history:args[2]}); } },
        supabase: { createClient() { return { auth: { verifyOtp: async payload => {
            calls.push({verify:payload}); return { data: { session: mode === 'session-error' ? null : {user:{id:'u'}} }, error:null };
        } } }; } } };
    const sessionStorage = { getItem:k=>stored.get(k)||null, setItem:(k,v)=>stored.set(k,v), removeItem:k=>stored.delete(k) };
    const document = { getElementById:id=>id==='naverCallbackStatus'?status:back };
    const config = { supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public' };
    const fetcher = async (url, options) => {
        const body = JSON.parse(options.body); calls.push({request:body,endpoint:url});
        if (body.action === 'start') return Response.json({ state,
            url: mode === 'evil-url' ? 'https://evil.example/?state='+state : 'https://nid.naver.com/oauth2.0/authorize?state='+state });
        return Response.json({token_hash:'one-time-hash',type:'magiclink'});
    };
    const api = new Function('window','sessionStorage','document','ONDOCHA_CONFIG','fetch',
        source+';return { beginNaverLogin, finishNaverLogin };')(window,sessionStorage,document,config,fetcher);
    return { ...api, calls,stored,location,status,back };
}
Deno.test('browser stores verifier locally and sends only challenge at login start', async () => {
    const f=setup();await f.beginNaverLogin();
    const request=f.calls[0].request;
    equal(f.calls[0].endpoint,'https://test.supabase.co/functions/v1/smart-service');
    equal(request.redirectTo,'https://copkill44-lgtm.github.io/ondocha/naver-callback.html');
    assert(/^[a-f0-9]{64}$/.test(request.challenge));assert(!('verifier' in request));
    const flow=JSON.parse([...f.stored.values()][0]);assert(flow.verifier!==request.challenge);
    assert(f.calls[1].assign.startsWith('https://nid.naver.com/'));
});
Deno.test('browser rejects unexpected authorization host', async () => {
    const f=setup('evil-url');let rejected=false;try{await f.beginNaverLogin();}catch{rejected=true;}
    assert(rejected);equal(f.stored.size,0);assert(!f.calls.some(x=>x.assign));
});
Deno.test('successful callback cleans URL, verifies one-time hash, then returns home', async () => {
    const f=setup();await f.beginNaverLogin();
    f.location.href+='naver-callback.html?code=private-code&state=signed-state';await f.finishNaverLogin();
    equal(f.stored.size,0);equal(f.calls.find(x=>x.history).history,'/ondocha/naver-callback.html');
    equal(f.calls.find(x=>x.verify).verify,{token_hash:'one-time-hash',type:'magiclink'});
    equal(f.calls.find(x=>x.replace).replace,'https://copkill44-lgtm.github.io/ondocha/');
});
Deno.test('wrong state stops exchange and displays a retry link', async () => {
    const f=setup();await f.beginNaverLogin();f.location.href+='naver-callback.html?code=private-code&state=wrong';
    await f.finishNaverLogin();assert(!f.calls.some(x=>x.request?.action==='finish'));equal(f.back.hidden,false);
});
Deno.test('expired flow never exchanges code', async () => {
    const f=setup();await f.beginNaverLogin();const [key,value]=[...f.stored.entries()][0];
    f.stored.set(key,JSON.stringify({...JSON.parse(value),expires:0}));
    f.location.href+='naver-callback.html?code=private-code&state=signed-state';await f.finishNaverLogin();
    assert(!f.calls.some(x=>x.request?.action==='finish'));equal(f.back.hidden,false);
});
Deno.test('cancelled consent never calls server exchange', async () => {
    const f=setup();await f.beginNaverLogin();f.location.href+='naver-callback.html?error=access_denied&state=signed-state';
    await f.finishNaverLogin();assert(!f.calls.some(x=>x.request?.action==='finish'));equal(f.back.hidden,false);
});
Deno.test('failed Supabase session is never treated as successful login', async () => {
    const f=setup('session-error');await f.beginNaverLogin();
    f.location.href+='naver-callback.html?code=private-code&state=signed-state';await f.finishNaverLogin();
    assert(!f.calls.some(x=>x.replace));equal(f.back.hidden,false);
});
