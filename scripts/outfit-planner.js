// Shared recommendation inputs, varied offline choices, and validated AI results.
let previousRecommendationTops = [];
const OUTFIT_TOPS = ['반팔 티셔츠','반팔 셔츠','긴팔 티셔츠','긴팔 셔츠'];
const OUTFIT_BOTTOMS = ['기본 바지','데님 바지','카고 바지'];
const OUTFIT_SHORTS = ['기본 반바지','버뮤다 팬츠'];
const OUTFIT_SKIRTS = ['긴 치마'];
const OUTFIT_SHOES = ['운동화','스니커즈','슬리퍼'];
function recommendationInput() {
    const chosen = name => document.querySelector('input[name="' + name + '"]:checked')?.value || '';
    return {
        gender: typeof characterConfig !== 'undefined' ? characterConfig.gender || '' : '',
        feel: chosen('feel'), top: chosen('topCategory') || '상의 추천받기', bottom: chosen('category') || '하의 추천받기',
        outerwear: outerwearSelection(), accessory: outfitAccessorySelectionText(), shoes: accessoryShoesSelection(),
        temperature: Number.isFinite(weatherTemp) ? weatherTemp : null,
        apparent: Number.isFinite(weatherApparentTemp) ? weatherApparentTemp : null,
        place: getFieldValue('place').slice(0,80), occasion: getFieldValue('occasion').slice(0,80), time: getFieldValue('time').slice(0,40),
        preferences: { top: categoryPreferenceText('topCategory'), bottom: categoryPreferenceText('category'), accessory: categoryPreferenceText('accessoryCategory') }
    };
}
function recommendationCatalog(input) {
    const adjustment = {'매우 추워요':-8,'쌀쌀해요':-4,'괜찮아요':0,'따뜻해요':3,'더워요':6}[input.feel] || 0;
    const comfort = (input.apparent ?? input.temperature ?? 20) + adjustment;
    const cold = comfort < 15, hot = comfort >= 25;
    const sleeve = hot ? '반팔' : '긴팔';
    const tops = OUTFIT_TOPS.includes(input.top) ? [input.top] : OUTFIT_TOPS.filter(name => name.startsWith(sleeve));
    const selectedBottom = ({'기본 치마':'기본 바지','일반 치마':'기본 바지','짧은치마':'기본 바지','짧은 치마':'기본 바지','긴치마':'긴 치마','짧은바지':'기본 반바지'})[input.bottom] || input.bottom;
    const formal = /출근|면접|격식|결혼|회의/.test(input.place + input.occasion);
    const automaticBottoms = [...OUTFIT_BOTTOMS, ...(hot && !formal ? OUTFIT_SHORTS : []), ...(input.gender === 'male' ? [] : OUTFIT_SKIRTS)];
    const allowsSelectedBottom = automaticBottoms.includes(selectedBottom) || OUTFIT_SHORTS.includes(selectedBottom) || (input.gender !== 'male' && selectedBottom === '치마바지');
    const bottoms = allowsSelectedBottom ? [selectedBottom] : automaticBottoms;
    const selectedShoe = input.shoes === '스니커츠' ? '스니커즈' : input.shoes;
    const shoes = OUTFIT_SHOES.includes(selectedShoe) ? [selectedShoe] : OUTFIT_SHOES.filter(name => name !== '슬리퍼' || hot && !formal);
    return { tops, bottoms, shoes, cold, hot, comfort };
}
function recommendationOuterwear(input, index) {
    if (input.outerwear) return ['후드집업', '바람막이'].includes(input.outerwear) && index % 2 === 0 ? input.outerwear : '';
    const {comfort} = recommendationCatalog(input);
    if (comfort < 15 && index === 0) return '후드집업';
    if (comfort < 15 && index === 2) return '바람막이';
    if (comfort >= 15 && comfort < 20 && index === 0) return '바람막이';
    return '';
}
function shuffledChoices(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i],result[j]] = [result[j],result[i]]; }
    return result;
}
function localOutfitRecommendations(input) {
    const catalog = recommendationCatalog(input);
    const tops = shuffledChoices(catalog.tops);
    // Avoid repeating the previous first card when another top is available.
    if (tops.length > 1 && tops[0] === previousRecommendationTops[0]) tops.push(tops.shift());
    const bottoms = shuffledChoices(catalog.bottoms);
    const formal = /출근|면접|격식|결혼|회의/.test(input.place + input.occasion);
    const shoes = shuffledChoices(catalog.shoes);
    return Array.from({length:4}, (_, i) => ({
        title: ['가볍게 나서는 날','단정한 외출','편안한 하루','기분 전환 코디'][i],
        top: tops[i % tops.length], bottom: bottoms[i % bottoms.length], shoes: shoes[i % shoes.length],
        accessory: input.accessory === '액세서리 추천받기' ? ['가방','모자','목걸이','시계'][i] : input.accessory === '없음' ? '' : input.accessory,
        reason: (catalog.cold ? '쌀쌀한 체감에 맞춘 긴소매 조합' : catalog.hot ? '더운 체감에 맞춘 가벼운 조합' : '활동하기 편한 간절기 조합') + (formal ? ' · 단정한 신발로 마무리해요.' : ' · ' + input.occasion.slice(0,30) + '에 어울려요.')
    }));
}
function parseAiOutfits(reply, input) {
    if (typeof reply !== 'string') throw Error('AI 추천을 받지 못했어요.');
    const start = reply.indexOf('['), end = reply.lastIndexOf(']');
    if (start < 0 || end < start) throw Error('AI 추천 형식을 확인하지 못했어요.');
    const items = JSON.parse(reply.slice(start,end + 1));
    const catalog = recommendationCatalog(input);
    if (!Array.isArray(items) || items.length !== 4) throw Error('AI 코디 네 가지가 필요해요.');
    const result = items.map((item,i) => {
        if (!item || !catalog.tops.includes(item.t) || !catalog.bottoms.includes(item.b) || !catalog.shoes.includes(item.s) || typeof item.r !== 'string' || !item.r.trim() || item.r.length > 120) throw Error('선택 조건과 다른 AI 추천이에요.');
        return {title:['오늘의 데일리','산뜻한 외출','단정한 조합','포인트 코디'][i],top:item.t,bottom:item.b,shoes:item.s,reason:item.r,accessory:input.accessory === '액세서리 추천받기' ? ['가방','모자','목걸이','시계'][i] : input.accessory === '없음' ? '' : input.accessory};
    });
    return result;
}