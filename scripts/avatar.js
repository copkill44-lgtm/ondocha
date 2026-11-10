// The setup screen and outfit previews use the same character image layers.
function characterImageLayers(config = {}) {
    const bodies = { default: 'body-default.png', toneA: 'body-light.png', toneB: 'body-dark.png' };
    const hair = { open: 'hair-covered.png', openLong: 'hair-covered-long.png', tied: 'hair-open.png', tiedLong: 'hair-open-long.png', openBob: 'hair-covered-bob.png', tiedBob: 'hair-open-bob.png' };
    const faces = { default: '눈-일반.png', normal2: '눈-일반2.png', sad: '눈-불쌍한.png', sleepy: '눈-졸린.png' };
    const root = 'assets/images/characters/';
    return { body: root + (bodies[config.skin] || bodies.default), face: root + (faces[config.eyes] || faces.default), hair: root + (hair[config.hair] || hair.open) + '?v=ear-alignment-3' };
}

// Each extracted garment uses a fixed, body-aligned placement in avatar coordinates.
const WEAR_LAYERS = {
    'tee-short': { file: 'tee-short.png', x: 183, y: 790, width: 515, height: 416 },
    'tee-long': { file: 'tee-long.png', x: 145, y: 775, width: 590, height: 440 },
    'shirt-short': { file: 'shirt-short.png?v=20261110-aligned-3', x: 0, y: 0, width: 896, height: 1792 },
    'shirt-long': { file: 'shirt-long.png?v=20261110-aligned-2', x: 0, y: -33, width: 896, height: 1870 }
};
let wearFilterSequence = 0;
function outfitWearLayer(name) {
    name = String(name || '');
    if (/민소매|나시/.test(name)) return null;
    const shirt = /셔츠|블라우스/.test(name) && !/티셔츠/.test(name);
    const short = /반팔|짧은팔|쇼트|숏슬리브/.test(name) || (/티셔츠/.test(name) && !/긴팔|롱슬리브/.test(name));
    return WEAR_LAYERS[(shirt ? 'shirt' : 'tee') + (short ? '-short' : '-long')];
}
function outfitWearColor(outfit, index, usePreferences = false) {
    if (/^#[0-9a-f]{6}$/i.test(outfit.wearColor || '')) return outfit.wearColor;
    if (usePreferences && typeof clothingPreviewColor === 'function') {
        const preference = clothingPreferences.topCategory?.color;
        if (preference && preference !== '상관없음') return clothingPreviewColor('topCategory');
    }
    const colors = {화이트:'#ffffff',흰색:'#ffffff',아이보리:'#f7f5ef',블랙:'#202024',검정:'#202024',네이비:'#354564',베이지:'#d4b896',핑크:'#e8a9b2',파랑:'#9cb7de',초록:'#93c4a5'};
    const name = String(outfit.top?.[0] || '');
    const named = Object.keys(colors).find(color => name.includes(color));
    return named ? colors[named] : ['#e8a9b2','#9cb7de','#93c4a5','#d4a46d'][Math.abs(Number(index) || 0) % 4];
}
function outfitWearMarkup(layer, color) {
    const id = 'wear-tint-' + (++wearFilterSequence);
    const rgb = [1,3,5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255);
    return '<defs><filter id="' + id + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + rgb[0] + ' 0 0 0 0 0 ' + rgb[1] + ' 0 0 0 0 0 ' + rgb[2] + ' 0 0 0 0 0 1 0"/></filter></defs><image href="assets/images/wear/' + layer.file + '" x="' + layer.x + '" y="' + layer.y + '" width="' + layer.width + '" height="' + layer.height + '" preserveAspectRatio="none" filter="url(#' + id + ')"/>';
}
function renderOutfitAvatar(outfit, index, config = characterConfig) {
    const layers = characterImageLayers(config);
    const palette = ['#e8a9b2', '#9cb7de', '#93c4a5', '#d4a46d'];
    const lowerPalette = ['#7388ac', '#8e789e', '#799984', '#a77f63'];
    const variant = Math.abs(Number(index) || 0) % 4;
    const color = palette[variant], lowerColor = lowerPalette[variant];
    const lowerName = String(outfit.bottom?.[0] || '');
    const short = /짧은|쇼츠|반바지|버뮤다|치마바지/.test(lowerName);
    const skirt = /치마|스커트/.test(lowerName) && !/치마바지/.test(lowerName);
    const wear = outfit.onepiece ? null : outfitWearLayer(outfit.top?.[0]);
    const top = wear ? outfitWearMarkup(wear, outfitWearColor(outfit, index)) : '<path d="M326 801L364 788Q440 875 511 789L555 805L625 984L577 1015L550 929L575 1193Q440 1210 280 1193L305 929L258 1015L211 984Z" fill="' + color + '" stroke="#ffffffa6" stroke-width="7" stroke-linejoin="round"/>';
    const bottom = outfit.onepiece || skirt
        ? '<path d="M280 1176H575L628 ' + (short ? 1350 : 1460) + 'Q440 ' + (short ? 1380 : 1490) + ' 238 ' + (short ? 1350 : 1460) + 'Z" fill="' + (outfit.onepiece ? color : lowerColor) + '" stroke="#ffffffa6" stroke-width="7"/>'
        : '<path d="M280 1185H585L582 ' + (short ? 1320 : 1520) + 'L456 ' + (short ? 1320 : 1520) + 'L442 1265L429 ' + (short ? 1320 : 1520) + 'H292Z" fill="' + lowerColor + '" stroke="#ffffffa6" stroke-width="7" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 896 1792" role="img" aria-label="내 캐릭터의 추천 코디"><image href="' + layers.body + '" width="896" height="1792"/>' + bottom + top + '<image href="' + layers.face + '" width="896" height="1792"/><image href="' + layers.hair + '" width="896" height="1792"/></svg>';
}
