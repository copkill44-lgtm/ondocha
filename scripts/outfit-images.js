// Generated previews stay in memory; large images are not copied into account storage.
const outfitImageCache = new WeakMap();
// Keep completed previews across reloads for presentation rehearsals.
function outfitPreviewKey(outfit, appearance) {
    return JSON.stringify([1, ONDOCHA_CONFIG.outfitImageProvider, appearance, outfit.onepiece ? null : outfit.top?.[0],
        outfit.onepiece?.[0] || outfit.bottom?.[0], outfit.outerwear || '', outfit.shoes?.[0], outfit.accessory || '']);
}
function storedOutfitPreview(key, url) {
    return new Promise(resolve => {
        if (!window.indexedDB) { resolve(null); return; }
        let settled = false;
        const finish = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
        const timer = setTimeout(() => finish(null), 1000);
        let request;
        try { request = indexedDB.open('ondocha-outfit-previews', 1); } catch { finish(null); return; }
        request.onupgradeneeded = () => request.result.createObjectStore('previews');
        request.onerror = () => finish(null);
        request.onblocked = () => finish(null);
        request.onsuccess = () => {
            const db = request.result;
            if (settled) { db.close(); return; }
            try {
                const tx = db.transaction('previews', url ? 'readwrite' : 'readonly');
                const store = tx.objectStore('previews');
                const operation = url ? store.put({ url, saved: Date.now() }, key) : store.get(key);
                let value = null;
                operation.onsuccess = () => { value = operation.result; };
                if (url) {
                    const all = store.getAll();
                    const keys = store.getAllKeys();
                    keys.onsuccess = () => {
                        const entries = keys.result.map((key, i) => ({ key, saved: all.result[i].saved }));
                        entries.sort((a, b) => b.saved - a.saved).slice(16).forEach(entry => store.delete(entry.key));
                    };
                }
                tx.oncomplete = () => { db.close(); finish(url || value?.url || null); };
                tx.onerror = tx.onabort = () => { db.close(); finish(null); };
            } catch { db.close(); finish(null); }
        };
    });
}
let outfitImageBusy = false;
let activeOutfitJobId = null;
let activeOutfitController = null;
function qwenEndpoint(path) {
    const local = ['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '8000';
    const shared = location.origin === (window.ONDOCHA_QWEN_URL || '').replace(/\/$/, '');
    const base = local || shared ? '' : (window.ONDOCHA_QWEN_URL || '');
    if (!local && !shared && !base) throw new Error('AI ?? ?? ??? ?? ???? ????.');
    return base + path;
}
// A temporary tunnel changes when restarted; do not trust a cached script address.
async function refreshQwenConnection(signal) {
    if (['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '8000') return;
    const endpointFile = new URL('scripts/qwen-endpoint.js', document.baseURI);
    endpointFile.searchParams.set('connection', Date.now());
    try {
        const response = await fetch(endpointFile, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (response.ok) {
            const source = await response.text();
            const match = source.match(/window\.ONDOCHA_QWEN_URL\s*=\s*"(https:\/\/[a-z0-9-]+\.trycloudflare\.com)"/);
            if (match) window.ONDOCHA_QWEN_URL = match[1];
        }
    } catch {
        // Use the bundled address if refreshing configuration is temporarily unavailable.
    }
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
}

function cancelActiveOutfitJob() {
    if (activeOutfitJobId) {
        try { navigator.sendBeacon(qwenEndpoint('/api/outfit-image/' + encodeURIComponent(activeOutfitJobId) + '/cancel'), ''); } catch {}
        activeOutfitJobId = null;
    }
    activeOutfitController?.abort();
}
window.addEventListener('pagehide', cancelActiveOutfitJob);
function usesLocalQwen() { return ONDOCHA_CONFIG.outfitImageProvider === 'qwen-local'; }

function mountOutfitImageControls() {
    document.querySelectorAll('#outfits .look').forEach((card, index) => {
        const label = document.createElement('p');
        label.className = 'outfit-preview-label';
        label.textContent = '캐릭터 착장 미리보기 · 추천 옷을 그림으로 표현했어요.';
        const extra = document.createElement('details');
        extra.className = 'outfit-ai-extra';
        const summary = document.createElement('summary');
        summary.textContent = 'AI 이미지 추가 체험';
        const status = document.createElement('p');
        status.className = 'ai-image-status';
        status.setAttribute('role', 'status');
        status.textContent = '선택 기능이에요. AI 이미지는 생성에 몇 분 걸릴 수 있어요.';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ai-image-button';
        button.textContent = 'AI 이미지 생성하기';
        button.disabled = outfitImageBusy;
        button.addEventListener('click', () => generateOutfitImage(index));
        extra.append(summary, status, button);
        card.querySelector('.stage').after(label, extra);
    });
}

async function characterReferenceBlob(config) {
    const layers = characterImageLayers(config);
    const load = src => new Promise((resolve, reject) => {
        const image = new Image();
        const loadTimer = setTimeout(() => reject(new Error('캐릭터 이미지 로딩이 지연돼요. 다시 눌러 주세요.')), 15000);
        image.onload = () => { clearTimeout(loadTimer); resolve(image); };
        image.onerror = () => { clearTimeout(loadTimer); reject(new Error('캐릭터 이미지를 불러오지 못했어요.')); };
        image.src = src;
    });
    const images = await Promise.all([load(layers.body), load(layers.face), load(layers.hair)]);
    const canvas = document.createElement('canvas');
    canvas.width = 896; canvas.height = 1792;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach(image => {
        const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
        const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
        ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    });
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('캐릭터를 준비하지 못했어요.')), 'image/png'));
}

async function generateOutfitImage(index) {
    if (!usesLocalQwen() && (!currentAuthUser || !supabaseClient)) {
        toast('AI 착장 이미지는 로그인 후 만들 수 있어요.');
        return;
    }
    const outfit = looks[index];
    const card = document.querySelectorAll('#outfits .look')[index];
    if (!outfit || !card) return;
    const status = card.querySelector('.ai-image-status');
    const appearance = JSON.stringify(characterConfig);
    const cached = outfitImageCache.get(outfit);
    const show = url => {
        const img = document.createElement('img');
        img.src = url; img.alt = '내 캐릭터가 추천한 옷을 입은 AI 착장 이미지';
        img.className = 'ai-outfit-image';
        card.querySelector('.look-avatar').replaceChildren(img);
        status.textContent = 'AI 착장 미리보기 · 실제 디자인과 다를 수 있어요.';
    };
    if (cached?.appearance === appearance) { show(cached.url); return; }
    if (outfitImageBusy) { toast('진행 중인 이미지가 완성되면 다시 눌러 주세요.'); return; }
    outfitImageBusy = true;
    document.querySelectorAll('.ai-image-button').forEach(button => button.disabled = true);
    card.setAttribute('aria-busy', 'true');
    status.textContent = '내 캐릭터가 옷을 입는 중이에요. 잠시 기다려 주세요…';
    const controller = new AbortController();
    activeOutfitController = controller;
    const timer = setTimeout(() => controller.abort(), usesLocalQwen() ? 3600000 : 150000);
    try {
        const previewKey = outfitPreviewKey(outfit, appearance);
        status.textContent = '저장된 AI 착장을 확인하고 있어요…';
        const savedPreview = await storedOutfitPreview(previewKey);
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (savedPreview && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(savedPreview)) {
            outfitImageCache.set(outfit, { appearance, url: savedPreview });
            if (looks[index] === outfit && JSON.stringify(characterConfig) === appearance && card.isConnected) {
                show(savedPreview);
                status.textContent = '저장된 AI 착장 · 미리 생성한 이미지예요.';
            }
            return;
        }
        status.textContent = '새 AI 착장을 생성하고 있어요. 첫 생성은 시간이 걸릴 수 있어요.';
        let headers = {};
        let endpoint = '/api/outfit-image';
        if (usesLocalQwen()) {
            await refreshQwenConnection(controller.signal);
            endpoint = qwenEndpoint('/api/outfit-image');
        } else {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error || !data.session) throw new Error('다시 로그인한 뒤 시도해 주세요.');
            endpoint = SUPABASE_URL + '/functions/v1/outfit-image';
            headers = { Authorization: 'Bearer ' + data.session.access_token, apikey: SUPABASE_PUBLISHABLE_KEY };
        }
        const body = new FormData();
        body.append('image', await characterReferenceBlob(JSON.parse(appearance)), 'character.png');
        body.append('outfit', JSON.stringify({
            top: [outfit.onepiece ? '' : outfit.top?.[0], outfit.outerwear ? '겉옷: ' + outfit.outerwear : ''].filter(Boolean).join(' + '),
            bottom: outfit.onepiece?.[0] || outfit.bottom?.[0],
            shoes: outfit.shoes?.[0], accessory: outfit.accessory || ''
        }));
        const response = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers, body });
        let result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'AI 이미지 서버 연결을 확인해 주세요.');
        if (usesLocalQwen()) {
            if (!result.jobId) throw new Error('Qwen 서버를 먼저 실행해 주세요.');
            const jobId = result.jobId;
            activeOutfitJobId = jobId;
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 500));
                if (controller.signal.aborted) throw new DOMException('Timeout', 'AbortError');
                const progress = await fetch(qwenEndpoint('/api/outfit-image/' + encodeURIComponent(jobId)), { signal: controller.signal });
                result = await progress.json();
                if (!progress.ok || result.status === 'error') throw new Error(result.error || 'Qwen 생성 상태를 확인하지 못했어요.');
                if (result.status === 'cancelled') throw new Error('이미지 생성이 취소됐어요.');
                if (result.status === 'done') { activeOutfitJobId = null; break; }
                status.textContent = result.message || 'Qwen 이미지 생성 중…';
            }
        }
        if (!/^[A-Za-z0-9+/=]+$/.test(result.image || '')) throw new Error('이미지를 받지 못했어요.');
        const mimeType = ['image/png', 'image/jpeg', 'image/webp'].includes(result.mimeType) ? result.mimeType : 'image/png';
        const url = 'data:' + mimeType + ';base64,' + result.image;
        void storedOutfitPreview(previewKey, url);
        outfitImageCache.set(outfit, { appearance, url });
        if (looks[index] === outfit && JSON.stringify(characterConfig) === appearance && card.isConnected) show(url);
    } catch (error) {
        if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
            status.textContent = 'AI 서버 연결이 끊겼어요. 기본 착장을 표시합니다. 잠시 후 다른 코디로 넘겼다가 돌아오면 다시 연결해요.';
        } else {
            status.textContent = error.name === 'AbortError'
                ? '이미지 생성이 지연되고 있어요. 잠시 후 다시 확인해 주세요.'
                : error.message;
        }
    } finally {
        clearTimeout(timer);
        cancelActiveOutfitJob();
        activeOutfitController = null;
        outfitImageBusy = false;
        card.removeAttribute('aria-busy');
        document.querySelectorAll('.ai-image-button').forEach(button => button.disabled = false);
    }
}
