// The setup screen and outfit previews use the same character image layers.
function characterImageLayers(config = {}) {
    const bodies = { default: 'body-default.png', toneA: 'body-light.png', toneB: 'body-dark.png' };
    const hair = { open: 'hair-covered.png', openLong: 'hair-covered-long.png', tied: 'hair-open.png', tiedLong: 'hair-open-long.png', openBob: 'hair-covered-bob.png', tiedBob: 'hair-open-bob.png' };
    const faces = { default: '눈-일반.png', normal2: '눈-일반2.png', sad: '눈-불쌍한.png', sleepy: '눈-졸린.png' };
    const root = 'assets/images/characters/';
    return { body: root + (bodies[config.skin] || bodies.default), face: root + (faces[config.eyes] || faces.default), hair: root + (hair[config.hair] || hair.open) + '?v=ear-alignment-3' };
}

function renderOutfitAvatar(outfit, index, config = characterConfig) {
    const layers = characterImageLayers(config);
    const palette = ['#e8a9b2', '#9cb7de', '#93c4a5', '#d4a46d'];
    const lowerPalette = ['#7388ac', '#8e789e', '#799984', '#a77f63'];
    const variant = Math.abs(Number(index) || 0) % 4;
    const color = palette[variant], lowerColor = lowerPalette[variant];
    const lowerName = String(outfit.bottom?.[0] || '');
    const short = /짧은|쇼츠|반바지/.test(lowerName);
    const skirt = /치마|스커트/.test(lowerName);
    const top = '<path d="M326 801L364 788Q440 875 511 789L555 805L625 984L577 1015L550 929L575 1193Q440 1210 280 1193L305 929L258 1015L211 984Z" fill="' + color + '" stroke="#ffffffa6" stroke-width="7" stroke-linejoin="round"/>';
    const bottom = outfit.onepiece || skirt
        ? '<path d="M280 1176H575L628 ' + (short ? 1350 : 1460) + 'Q440 ' + (short ? 1380 : 1490) + ' 238 ' + (short ? 1350 : 1460) + 'Z" fill="' + (outfit.onepiece ? color : lowerColor) + '" stroke="#ffffffa6" stroke-width="7"/>'
        : '<path d="M280 1185H585L582 ' + (short ? 1320 : 1520) + 'L456 ' + (short ? 1320 : 1520) + 'L442 1265L429 ' + (short ? 1320 : 1520) + 'H292Z" fill="' + lowerColor + '" stroke="#ffffffa6" stroke-width="7" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 896 1792" role="img" aria-label="내 캐릭터의 추천 코디"><image href="' + layers.body + '" width="896" height="1792"/>' + bottom + top + '<image href="' + layers.face + '" width="896" height="1792"/><image href="' + layers.hair + '" width="896" height="1792"/></svg>';
}
