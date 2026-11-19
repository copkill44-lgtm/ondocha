// The setup screen and outfit previews use the same character image layers.
function characterImageLayers(config = {}) {
    const bodies = { default: 'body-default.png', toneA: 'body-light.png', toneB: 'body-dark.png' };
    const hair = { open: 'hair-covered.png', openLong: 'hair-covered-long.png', tied: 'hair-open.png', tiedLong: 'hair-open-long.png', openBob: 'hair-covered-bob.png', tiedBob: 'hair-open-bob.png' };
    const faces = { default: '눈-일반.png', normal2: '눈-일반2.png', sad: '눈-불쌍한.png', sleepy: '눈-졸린.png' };
    const root = 'assets/images/characters/';
    return { body: root + (bodies[config.skin] || bodies.default), face: root + (faces[config.eyes] || faces.default), hair: root + (hair[config.hair] || hair.open) + '?v=ear-alignment-3' };
}

// Garments aligned on the full 896 x 1792 body canvas retain their original placement.
const WEAR_LAYERS = {
    'tee-short': { file: 'tee-short.png?v=20261112-body-aligned-1', x: 0, y: 0, width: 896, height: 1792 },
    'tee-long': { file: 'tee-long.png?v=20261112-body-aligned-1', x: 0, y: 0, width: 896, height: 1792 },
    'shirt-short': { file: 'shirt-short.png?v=20261110-aligned-3', x: 0, y: 0, width: 896, height: 1792 },
    'shirt-long': { file: 'shirt-long.png?v=20261110-aligned-2', x: 0, y: -33, width: 896, height: 1870 }
};
// The supplied trousers share the body canvas and retain its original alignment.
const BOTTOM_WEAR_LAYERS = {
    basic: { file: '일반 바지.png?v=20261112-pants-2', x: 0, y: 0, width: 896, height: 1792 },
    denim: { file: '청바지.png?v=20261112-denim-1', x: 0, y: 0, width: 896, height: 1792, denim: true },
    cargo: { file: '카고바지.png?v=20261112-pants-2', x: 0, y: 0, width: 896, height: 1792 }
};
function outfitBottomWearLayer(name) {
    name = String(name || '');
    if (/반바지|쇼츠|버뮤다|짧은|치마|스커트/.test(name)) return null;
    if (/데님|청바지/.test(name)) return BOTTOM_WEAR_LAYERS.denim;
    if (/카고/.test(name)) return BOTTOM_WEAR_LAYERS.cargo;
    if (/기본 바지|일반\s*바지|긴바지/.test(name)) return BOTTOM_WEAR_LAYERS.basic;
    return null;
}
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
    const shirt = typeof isShirtClothing === 'function' && isShirtClothing(outfit.top?.[0]);
    const automaticTop = typeof selectedClothingValues === 'function' && selectedClothingValues('topCategory')[0] === '상의 추천받기';
    if (shirt && automaticTop) {
        const preference = usePreferences ? clothingPreferences.topCategory?.color : null;
        if (Object.hasOwn(shirtColorPalette, preference)) return shirtColorPalette[preference];
        const name = String(outfit.top?.[0] || '');
        const named = Object.keys(shirtColorPalette).find(color => name.includes(color));
        return named ? shirtColorPalette[named] : Object.values(shirtColorPalette)[Math.abs(Number(index) || 0) % 4];
    }
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
function outfitDenimMarkup(layer, color) {
    const image = '<image href="assets/images/wear/' + layer.file + '" x="0" y="0" width="896" height="1792"';
    if (!['화이트', '블랙'].includes(color)) return image + '/>';
    const id = 'denim-tint-' + (++wearFilterSequence);
    const scale = color === '화이트' ? .6 : .24;
    const offset = color === '화이트' ? .4 : .015;
    const row = [.2126 * scale, .7152 * scale, .0722 * scale, 0, offset].join(' ');
    return '<defs><filter id="' + id + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + row + ' ' + row + ' ' + row + ' 0 0 0 1 0"/></filter></defs>' + image + ' filter="url(#' + id + ')"/>';
}
function outfitShoeWearLayer(name) {
    name = String(name || '');
    if (/스니커즈|스니커츠/.test(name)) return '스니커즈.png?v=20261119-shoes-1';
    if (/슬리퍼/.test(name)) return '슬리퍼.png?v=20261119-shoes-1';
    if (/운동화/.test(name)) return '운동화.png?v=20261119-shoes-1';
    return null;
}
const OUTFIT_LOWER_COLORS = ['#7388ac', '#8e789e', '#799984', '#a77f63'];
function outfitShoeColor(outfit, index, usePreferences = false) {
    const palette = shoeColorPalette;
    if (isClothingHex(outfit.shoeColor)) return {name:outfit.shoeColorName || '직접 고른 색상',hex:outfit.shoeColor};
    const preference = usePreferences ? clothingPreferences.shoes?.color : null;
    if (isClothingHex(preference)) return {name:'직접 고른 색상',hex:preference};
    if (Object.hasOwn(palette, preference)) return {name:preference,hex:palette[preference]};
    const top = outfitWearColor(outfit, index);
    const [r,g,b] = [1,3,5].map(i=>parseInt(top.slice(i,i+2),16));
    const brightness = .2126*r + .7152*g + .0722*b;
    const warm = r > b + 20 && r > g;
    const denim = /데님|청바지/.test(outfit.bottom?.[0] || '');
    const lightNeutral = brightness >= 205 && Math.max(r,g,b) - Math.min(r,g,b) <= 65;
    const lower = OUTFIT_LOWER_COLORS[Math.abs(Number(index) || 0) % OUTFIT_LOWER_COLORS.length];
    const [lr,lg,lb] = [1,3,5].map(i=>parseInt(lower.slice(i,i+2),16));
    const blueBottom = denim ? !['화이트','블랙'].includes(outfit.denimColor) : lb > lr + 12 && lb > lg;
    const name = lightNeutral && blueBottom ? '탄색' : denim ? (warm && brightness > 140 ? '탄색' : '화이트') : brightness < 105 ? '화이트' : warm ? '크림' : '블랙';
    return {name,hex:palette[name]};
}
function outfitShoeMarkup(file, color) {
    // Multiplication retains the original photograph's shading and transparency.
    return outfitWearMarkup({file,x:0,y:0,width:896,height:1792},color);
}
function outfitOuterwearColor(outfit, index) {
    if (isClothingHex(outfit.outerwearColor)) return {name:outfit.outerwearColorName || '겉옷',hex:outfit.outerwearColor};
    const top = outfitWearColor(outfit, index);
    const [r,g,b] = [1,3,5].map(i=>parseInt(top.slice(i,i+2),16));
    const brightness = .2126*r + .7152*g + .0722*b;
    const choices = brightness >= 170
        ? [{name:'네이비',hex:'#354564'},{name:'차콜',hex:'#50545c'}]
        : [{name:'그레이',hex:'#a4a6ad'},{name:'토프',hex:'#b5a48e'}];
    return choices[Math.floor(Math.abs(Number(index) || 0) / 2) % choices.length];
}
function outfitOuterwearMarkup(name, color = '#a4a6ad') {
    if (name !== '후드집업') return '';
    return outfitWearMarkup({file:'후드집업.png?v=20261119-1',x:0,y:0,width:896,height:1792},color);
}
function renderOutfitAvatar(outfit, index, config = characterConfig) {
    const layers = characterImageLayers(config);
    const palette = ['#e8a9b2', '#9cb7de', '#93c4a5', '#d4a46d'];
    const lowerPalette = OUTFIT_LOWER_COLORS;
    const variant = Math.abs(Number(index) || 0) % 4;
    const color = palette[variant], lowerColor = lowerPalette[variant];
    const lowerName = String(outfit.bottom?.[0] || '');
    const short = /짧은|쇼츠|반바지|버뮤다|치마바지/.test(lowerName);
    const skirt = /치마|스커트/.test(lowerName) && !/치마바지/.test(lowerName);
    const wear = outfit.onepiece ? null : outfitWearLayer(outfit.top?.[0]);
    const top = wear ? outfitWearMarkup(wear, outfitWearColor(outfit, index)) : '<path d="M326 801L364 788Q440 875 511 789L555 805L625 984L577 1015L550 929L575 1193Q440 1210 280 1193L305 929L258 1015L211 984Z" fill="' + color + '" stroke="#ffffffa6" stroke-width="7" stroke-linejoin="round"/>';
    const shoeLayer = outfitShoeWearLayer(outfit.shoes?.[0]);
    const shoes = shoeLayer ? outfitShoeMarkup(shoeLayer, outfitShoeColor(outfit, index).hex) : '';
    const bottomWear = outfit.onepiece ? null : outfitBottomWearLayer(lowerName);
    const bottom = bottomWear ? (bottomWear.denim ? outfitDenimMarkup(bottomWear, outfit.denimColor || '파랑') : outfitWearMarkup(bottomWear, lowerColor)) : outfit.onepiece || skirt
        ? '<path d="M280 1176H575L628 ' + (short ? 1350 : 1460) + 'Q440 ' + (short ? 1380 : 1490) + ' 238 ' + (short ? 1350 : 1460) + 'Z" fill="' + (outfit.onepiece ? color : lowerColor) + '" stroke="#ffffffa6" stroke-width="7"/>'
        : '<path d="M280 1185H585L582 ' + (short ? 1320 : 1520) + 'L456 ' + (short ? 1320 : 1520) + 'L442 1265L429 ' + (short ? 1320 : 1520) + 'H292Z" fill="' + lowerColor + '" stroke="#ffffffa6" stroke-width="7" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 896 1792" role="img" aria-label="내 캐릭터의 추천 코디"><image href="' + layers.body + '" width="896" height="1792"/>' + shoes + bottom + top + outfitOuterwearMarkup(outfit.outerwear, outfitOuterwearColor(outfit, index).hex) + '<image href="' + layers.face + '" width="896" height="1792"/><image href="' + layers.hair + '" width="896" height="1792"/></svg>';
}
