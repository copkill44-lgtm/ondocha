// Supabase Dashboard > Connect / API Keys에서 공개 연결 정보를 복사하세요.
// 이 파일은 브라우저에 공개됩니다. secret/service_role 키는 넣지 마세요.
const ONDOCHA_CONFIG = Object.freeze({
    outfitImageProvider: "qwen-local",
    supabaseUrl: "https://rwfjbdhfabwgefkwnwgn.supabase.co",
    supabasePublishableKey: "sb_publishable_umroYexU9hBhXfEmbsVPFw_QF_PR_i0"
});

// Local file pages must use the server origin for image generation.
if (ONDOCHA_CONFIG.outfitImageProvider === 'qwen-local' && window.location.protocol === 'file:') {
    window.location.replace('http://127.0.0.1:8000/' + window.location.search + window.location.hash);
}