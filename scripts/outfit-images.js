// Generated previews stay in memory; large images are not copied into account storage.
const outfitImageCache = new WeakMap();
let outfitImageBusy = false;
let activeOutfitJobId = null;
let activeOutfitController = null;
function qwenEndpoint(path) {
    const local = ['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '8000';
    const shared = location.hostname.endsWith('.trycloudflare.com');
    const base = local || shared ? '' : (window.ONDOCHA_QWEN_URL || '');
    if (!local && !shared && !base) throw new Error('AI ?? ?? ??? ?? ???? ????.');
    return base + path;
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
        const status = document.createElement('p');
        status.className = 'ai-image-status';
        status.setAttribute('role', 'status');
        status.textContent = usesLocalQwen() ? 'PC에서 Qwen으로 내 캐릭터의 착장을 만들어요.' : currentAuthUser ? '선택한 캐릭터로 AI 착장을 만들어요.' : '로그인하면 내 캐릭터의 AI 착장을 만들 수 있어요.';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ai-image-button';
        button.textContent = 'AI 착장 이미지 만들기';
        button.addEventListener('click', () => generateOutfitImage(index));
        card.querySelector('.stage').after(status, button);
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
    const activeButton = card.querySelector('.ai-image-button');
    activeButton.textContent = '이미지 생성 중…';
    card.setAttribute('aria-busy', 'true');
    status.textContent = '내 캐릭터가 옷을 입는 중이에요. 잠시 기다려 주세요…';
    const controller = new AbortController();
    activeOutfitController = controller;
    const timer = setTimeout(() => controller.abort(), usesLocalQwen() ? 3600000 : 150000);
    try {
        let headers = {};
        let endpoint = '/api/outfit-image';
        if (usesLocalQwen()) {
            if (!['127.0.0.1', 'localhost'].includes(location.hostname) || location.port !== '8000') {
                throw new Error('Qwen 실행 후 http://127.0.0.1:8000 에서 사이트를 열어 주세요.');
            }
        } else {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error || !data.session) throw new Error('다시 로그인한 뒤 시도해 주세요.');
            endpoint = SUPABASE_URL + '/functions/v1/outfit-image';
            headers = { Authorization: 'Bearer ' + data.session.access_token, apikey: SUPABASE_PUBLISHABLE_KEY };
        }
        const body = new FormData();
        body.append('image', await characterReferenceBlob(JSON.parse(appearance)), 'character.png');
        body.append('outfit', JSON.stringify({
            top: outfit.onepiece ? '' : outfit.top?.[0],
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
                await new Promise(resolve => setTimeout(resolve, 2000));
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
        outfitImageCache.set(outfit, { appearance, url });
        if (looks[index] === outfit && JSON.stringify(characterConfig) === appearance && card.isConnected) show(url);
    } catch (error) {
        status.textContent = error.name === 'AbortError' ? '생성이 지연되고 있어요. Qwen 실행 창을 확인해 주세요.' : error.message;
    } finally {
        clearTimeout(timer);
        cancelActiveOutfitJob();
        activeOutfitController = null;
        outfitImageBusy = false;
        activeButton.textContent = 'AI 착장 이미지 만들기';
        card.removeAttribute('aria-busy');
        document.querySelectorAll('.ai-image-button').forEach(button => button.disabled = false);
    }
}
