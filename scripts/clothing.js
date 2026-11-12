// clothing.js — Clothing choices and preferences
const baseCategories = ['기본 바지', '데님 바지', '카고 바지', '와이드 바지', '조거 바지', '기본 반바지', '데님 반바지', '카고 반바지', '버뮤다 팬츠', '스포츠 반바지', '기본 치마', '치마바지', '짧은 치마'];
let customCategories = JSON.parse(localStorage.getItem('custom-clothing-types') || '[]');
let customTopCategories = JSON.parse(localStorage.getItem('custom-top-types') || '[]'),
    customAccessoryCategories = JSON.parse(localStorage.getItem('custom-accessory-types') || '[]');
let categoryOptions = [...baseCategories, ...customCategories];
let topSleeveChoice = '반팔';
let bottomTypeChoice = '치마';

function updateFeelFromSlider() {
    let values = ['매우 추워요', '쌀쌀해요', '괜찮아요', '따뜻해요', '더워요'],
        tones = ['#6fa5ed', '#9ec9e9', '#b7c9af', '#f3b679', '#f18b8f'],
        slider = $('feelSlider'),
        position = Math.max(0, Math.min(4, Number(slider.value))),
        index = Math.round(position),
        value = values[index];
    document.querySelectorAll('input[name="feel"]').forEach(input => input.checked = input.value === value);
    let label = $('feelLabel');
    label.textContent = String(index + 1);
    let tone = tones[index];
    slider.style.setProperty('--feel-tone', tone);
    label.style.setProperty('--feel-tone', tone);
    slider.parentElement.querySelectorAll('.feel-ticks span').forEach((tick, i) => tick.classList.toggle('active', i === index));
}

function selectedClothingValues(group) {
    return [...document.querySelectorAll('input[name="' + group + '"]:checked')].map(x => x.value);
}
function accessorySelectionText() {
    return selectedClothingValues('accessoryCategory').join(' · ') || '없음';
}
function outerwearSelection() {
    return selectedClothingValues('outerCategory').find(x => x !== '겉옷 없음') || '';
}
function normalizeAccessorySelection(input) {
    const choices = [...document.querySelectorAll('input[name="accessoryCategory"]')];
    const exclusive = value => value === '없음' || value === '액세서리 추천받기';
    if (input.checked) choices.forEach(x => {
        if (x !== input && (exclusive(input.value) || exclusive(x.value))) x.checked = false;
    });
    if (!choices.some(x => x.checked)) choices.find(x => x.value === '없음').checked = true;
}
function renderCategoryChoices(selectValue, selectedGroup) {
    categoryOptions = categoryOptions.filter(name => !/원피스/.test(name));
    let keep = selectedGroup === 'category' && selectValue ? selectValue : document.querySelector('input[name="category"]:checked')?.value || '긴치마',
        topKeep = selectedGroup === 'topCategory' && selectValue ? selectValue : document.querySelector('input[name="topCategory"]:checked')?.value || '상의 추천받기',
        accessoryKeep = selectedClothingValues('accessoryCategory'),
        outerKeep = outerwearSelection(),
        bottomBox = document.getElementById('categoryList'),
        topBox = document.getElementById('topCategoryList'),
        accessoryBox = document.getElementById('accessoryCategoryList');

    keep = ({ '긴치마': '기본 치마', '짧은치마': '짧은 치마', '짧은바지': '기본 반바지', '긴바지': '기본 바지' })[keep] || keep;
    if (selectedGroup === 'accessoryCategory' && selectValue) {
        accessoryKeep = ['없음', '액세서리 추천받기'].includes(selectValue) ? [selectValue] : [...accessoryKeep.filter(x => !['없음', '액세서리 추천받기'].includes(x)), selectValue];
    }
    if (!accessoryKeep.length) accessoryKeep = ['없음'];
    if (selectedGroup === 'topCategory' && selectValue?.startsWith('겉옷 · ')) {
        outerKeep = selectValue;
        topKeep = selectedClothingValues('topCategory')[0] || '상의 추천받기';
    }
    function makeChoice(name, group, checked) {
        let item = document.createElement('span');
        item.className = 'category-item';
        let label = document.createElement('label');
        label.className = 'choice';
        let radio = document.createElement('input');
        radio.type = ['accessoryCategory', 'outerCategory'].includes(group) ? 'checkbox' : 'radio';
        radio.name = group;
        radio.value = name;
        radio.checked = Array.isArray(checked) ? checked.includes(name) : name === checked;
        let icon = document.createElement('span');
        icon.className = 'choice-icon';
        icon.innerHTML = clothingIconMarkup(name);
        let text = document.createElement('span');
        text.textContent = group === 'topCategory' ? name.replace(/^(반팔|긴팔)\s*(·\s*)?/, '').trim() : name;
        if (name.endsWith('추천받기')) {
            label.classList.add('recommendation-choice');
            label.append(radio, text);
        } else label.append(radio, icon, text);
        item.appendChild(label);
        let customList = (group === 'topCategory' || group === 'outerCategory') ? customTopCategories : group === 'accessoryCategory' ? customAccessoryCategories : customCategories;
        if (customList.includes(name)) {
            text.classList.add('custom-clothing-name');
            let remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'delete-category';
            remove.textContent = '×';
            remove.title = name + ' 삭제';
            remove.setAttribute('aria-label', name + ' 삭제');
            remove.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                removeCategory(name, group)
            };
            item.appendChild(remove)
        }
        return item
    }

    function makeGroup(title, names, group, checked) {
        let section = document.createElement('div');
        section.className = 'category-subgroup';
        let heading = document.createElement('strong');
        heading.className = 'category-subgroup-title';
        heading.textContent = title;
        section.appendChild(heading);
        names.forEach(name => section.appendChild(makeChoice(name, group, checked)));
        return section
    }
    const customOuter = customTopCategories.filter(name => name.startsWith('겉옷 · '));
    if (/^(반팔|긴팔)/.test(topKeep)) topSleeveChoice = topKeep.startsWith('긴팔') ? '긴팔' : '반팔';
    if (/민소매|나시/.test(topKeep)) topSleeveChoice = '그 외';
    const types = topSleeveChoice === '그 외' ? ['민소매'] : ['티셔츠', '셔츠', '니트', '맨투맨', '후드티'];
    if (topKeep === '반팔' || topKeep === '긴팔') topKeep += ' 티셔츠';
    else if (types.includes(topKeep) && topKeep !== '민소매') topKeep = topSleeveChoice + ' ' + topKeep;
    const sleeveGroup = document.createElement('div');
    sleeveGroup.className = 'category-subgroup sleeve-selection';
    const sleeveTitle = document.createElement('strong');
    sleeveTitle.className = 'category-subgroup-title';
    sleeveTitle.textContent = '소매 길이';
    sleeveGroup.append(sleeveTitle);
    ['반팔', '긴팔', '그 외'].forEach(sleeve => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sleeve-choice';
        button.textContent = sleeve;
        button.setAttribute('aria-pressed', String(topSleeveChoice === sleeve));
        button.onclick = () => {
            topSleeveChoice = sleeve;
            const kind = topKeep.replace(/^(반팔|긴팔)\s*(·\s*)?/, '').trim();
            const next = sleeve === '그 외' ? '민소매' : topKeep === '상의 추천받기' ? topKeep : /민소매|나시/.test(kind) ? sleeve + ' 티셔츠' : sleeve + ' ' + kind;
            renderCategoryChoices(next, 'topCategory');
            document.querySelector('input[name="topCategory"]:checked')?.dispatchEvent(new Event('change', { bubbles: true }));
        };
        sleeveGroup.append(button);
    });
    const customTops = customTopCategories.filter(name => !name.startsWith('겉옷 · ') && (topSleeveChoice === '그 외' ? /민소매|나시|^그 외/.test(name) : !/민소매|나시|^그 외/.test(name) && (!/^(반팔|긴팔)/.test(name) || name.startsWith(topSleeveChoice))));
    topBox.replaceChildren(
        makeChoice('상의 추천받기', 'topCategory', topKeep),
        sleeveGroup,
        makeGroup('옷 종류', [...types.map(name => name === '민소매' ? name : topSleeveChoice + ' ' + name), ...customTops], 'topCategory', topKeep),
        makeGroup('겉옷', ['바람막이', '가디건', '패딩', '후드집업', ...customOuter], 'outerCategory', outerKeep)
    );
    const bottomGroups = {
        '반바지': categoryOptions.filter(name => /반바지|쇼츠|버뮤다|짧은바지/.test(name)),
        '긴바지': categoryOptions.filter(name => /바지|팬츠|슬랙스/.test(name) && !/치마|스커트|짧은|반바지|쇼츠|버뮤다/.test(name)),
        '치마': categoryOptions.filter(name => /치마|스커트/.test(name))
    };
    const otherBottoms = categoryOptions.filter(name => !Object.values(bottomGroups).flat().includes(name));
    if (otherBottoms.length) bottomGroups['그 외'] = otherBottoms;
    Object.keys(bottomGroups).forEach(key => bottomGroups[key] = [...new Set(bottomGroups[key])]);
    const selectedBottomGroup = Object.keys(bottomGroups).find(key => bottomGroups[key].includes(keep));
    if (selectedBottomGroup) bottomTypeChoice = selectedBottomGroup;
    if (!bottomGroups[bottomTypeChoice]) bottomTypeChoice = '치마';
    const bottomTabs = document.createElement('div');
    bottomTabs.className = 'category-subgroup sleeve-selection';
    const bottomTitle = document.createElement('strong');
    bottomTitle.className = 'category-subgroup-title';
    bottomTitle.textContent = '하의 분류';
    bottomTabs.append(bottomTitle);
    Object.keys(bottomGroups).forEach(kind => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sleeve-choice';
        button.textContent = kind;
        button.setAttribute('aria-pressed', String(bottomTypeChoice === kind));
        button.onclick = () => {
            bottomTypeChoice = kind;
            renderCategoryChoices(bottomGroups[kind][0], 'category');
            document.querySelector('input[name="category"]:checked')?.dispatchEvent(new Event('change', { bubbles: true }));
        };
        bottomTabs.append(button);
    });
    bottomBox.replaceChildren(
        makeChoice('하의 추천받기', 'category', keep),
        bottomTabs,
        makeGroup('옷 종류', bottomGroups[bottomTypeChoice], 'category', keep)
    );
    let accessories = ['액세서리 추천받기', '없음', '가방', '모자', '스카프', '목걸이', '귀걸이', '시계', ...customAccessoryCategories];
    accessoryBox.replaceChildren(...accessories.map(name => makeChoice(name, 'accessoryCategory', accessoryKeep)))
}

function removeCategory(name, group = 'category') {
    if (group === 'topCategory' || group === 'outerCategory') {
        customTopCategories = customTopCategories.filter(item => item !== name);
        localStorage.setItem('custom-top-types', JSON.stringify(customTopCategories))
    } else if (group === 'accessoryCategory') {
        customAccessoryCategories = customAccessoryCategories.filter(item => item !== name);
        localStorage.setItem('custom-accessory-types', JSON.stringify(customAccessoryCategories))
    } else {
        customCategories = customCategories.filter(item => item !== name);
        categoryOptions = categoryOptions.filter(item => item !== name);
        localStorage.setItem('custom-clothing-types', JSON.stringify(customCategories))
    }
    if (group === 'accessoryCategory') {
        document.querySelectorAll('input[name="accessoryCategory"]').forEach(input => {
            if (input.value === name) input.checked = false;
        });
        renderCategoryChoices();
        return;
    }
    let fallback = group === 'topCategory' ? '상의 추천받기' : group === 'accessoryCategory' ? '없음' : '긴치마';
    renderCategoryChoices(document.querySelector('input[name="' + group + '"]:checked')?.value === name ? fallback : undefined, group)
}

function updateCustomClothingSubtypes() {
    let group = document.getElementById('customClothingGroup').value,
        options = {
            topCategory: ['티셔츠', '셔츠', '니트', '맨투맨', '후드티', '민소매', '겉옷'],
            category: ['반바지', '긴바지', '치마'],
            accessoryCategory: ['가방', '모자', '스카프', '목걸이', '귀걸이', '시계']
        },
        select = document.getElementById('customClothingSubtype');
    select.replaceChildren(...options[group].map(name => {
        let option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        return option
    }))
}

function openCustomClothingModal() {
    let modal = document.getElementById('customClothingModal');
    document.getElementById('customClothingGroup').value = 'topCategory';
    document.getElementById('customClothingName').value = '';
    updateCustomClothingSubtypes();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('customClothingName').focus()
}

function closeCustomClothingModal() {
    let modal = document.getElementById('customClothingModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''
}

function addCustomClothing() {
    let group = document.getElementById('customClothingGroup').value,
        subtype = document.getElementById('customClothingSubtype').value,
        name = document.getElementById('customClothingName').value.trim();
    if (!name) {
        document.getElementById('customClothingName').focus();
        toast('추가할 옷 이름을 적어 주세요');
        return
    }
    let value = subtype + ' · ' + name,
        list = (group === 'topCategory' || group === 'outerCategory') ? customTopCategories : group === 'accessoryCategory' ? customAccessoryCategories : customCategories;
    if (list.includes(value)) {
        toast('이미 추가된 종류예요');
        return
    }
    list.push(value);
    if (group === 'topCategory') localStorage.setItem('custom-top-types', JSON.stringify(customTopCategories));
    else if (group === 'accessoryCategory') localStorage.setItem('custom-accessory-types', JSON.stringify(customAccessoryCategories));
    else {
        categoryOptions.push(value);
        localStorage.setItem('custom-clothing-types', JSON.stringify(customCategories))
    }
    renderCategoryChoices(value, group);
    closeCustomClothingModal();
    toast('옷 종류를 선택 목록에 추가했어요')
}

function addCategory() {
    openCustomClothingModal()
}

function localDate(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
let clothingPreferences = JSON.parse(localStorage.getItem("clothing-preferences") || "{}");

const clothingColorPalette = {"빨강": "#ef4444", "주황": "#f97316", "노랑": "#facc15", "초록": "#22c55e", "파랑": "#3b82f6", "보라": "#a855f7", "핑크": "#ec4899", "아이보리": "#f7f5ef", "검정": "#202024"};

const accessoryColorPalette={"골드":"#d4af37","실버":"#c0c0c0","로즈골드":"#b76e79","브론즈":"#cd7f32","진주색":"#f4f0e5","검정":"#202024","브라운":"#8b5e3c","베이지":"#d4b896","화이트":"#ffffff"};
function renderClothingColorOptions(group){
 const container=document.querySelector('#categoryModal .color-options');
 const palette=group==='accessoryCategory'?accessoryColorPalette:clothingColorPalette;
 container.replaceChildren();
 const add=(value,cls,color)=>{
  const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');
  label.className=cls;input.type='radio';input.name='clothingColor';input.value=value;
  name.textContent=value==='custom'?'직접 고르기':value;
  if(color)label.style.setProperty('--swatch',color);
  label.append(input);
  if(value!=='상관없음')label.append(document.createElement('i'));
  label.append(name);container.append(label);
 };
 add('상관없음','no-color');
 Object.entries(palette).forEach(([name,color])=>add(name,'',color));
 add('custom','custom-color-choice');
}

const legacyClothingColors = {하늘색: "#9cb7de", 베이지: "#d4a46d", 골드: "#d4af37", 실버: "#c0c0c0", 로즈골드: "#b76e79", 브론즈: "#cd7f32"};
let clothingWheelState = {h: 215, s: .3, v: .87};
function isClothingHex(value) { return /^#[0-9a-f]{6}$/i.test(value || ''); }
function clothingPreviewColor(group) {
    const color = (clothingPreferences[group] || {}).color;
    return isClothingHex(color) ? color : accessoryColorPalette[color] || clothingColorPalette[color] || legacyClothingColors[color] || '#f7f5ef';
}
function clothingHsvToHex({h, s, v}) {
    const channel = n => {
        const k = (n + h / 60) % 6;
        return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, '0');
    };
    return '#' + channel(5) + channel(3) + channel(1);
}
function clothingHexToHsv(hex) {
    const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16) / 255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max-min;
    const hue = !delta ? 0 : max === r ? ((g-b)/delta)%6 : max === g ? (b-r)/delta+2 : (r-g)/delta+4;
    return {h: (hue*60+360)%360, s: max ? delta/max : 0, v: max};
}
function syncClothingColorWheel() {
    const pref = clothingPreferences[$('categoryModal').dataset.group] || {};
    const custom = isClothingHex(pref.color);
    $('clothingColorWheelPanel').hidden = !custom;
    const hex = custom ? pref.color : isClothingHex(pref.customColor) ? pref.customColor : '#9cb7de';
    clothingWheelState = clothingHexToHsv(hex);
    renderClothingColorWheel();
}
function renderClothingColorWheel() {
    const {h,s,v} = clothingWheelState;
    const hex = clothingHsvToHex(clothingWheelState);
    const radians = h*Math.PI/180;
    $('clothingColorMarker').style.left = (50+Math.sin(radians)*s*50)+'%';
    $('clothingColorMarker').style.top = (50-Math.cos(radians)*s*50)+'%';
    $('clothingColorMarker').style.backgroundColor = hex;
    const shade = 'rgba(0,0,0,'+(1-v)+')';
    $('clothingColorWheel').style.backgroundImage = 'linear-gradient('+shade+','+shade+'), radial-gradient(circle, white 0%, transparent 70.71%), conic-gradient(red, #ff0, #0f0, #0ff, #00f, #f0f, red)';
    $('clothingColorWheel').setAttribute('aria-valuenow',String(Math.round(h)));
    $('clothingColorWheel').setAttribute('aria-valuetext',Math.round(h)+'도, '+Math.round(s*100)+'%, '+hex);
    $('clothingColorBrightness').value = String(Math.round(v*100));
    $('clothingColorHex').value = hex.toUpperCase();
    $('clothingColorSwatch').style.backgroundColor = hex;
}
function saveClothingWheelColor() {
    const group = $('categoryModal').dataset.group;
    if (!['topCategory','category','accessoryCategory'].includes(group)) return;
    const hex = clothingHsvToHex(clothingWheelState);
    clothingPreferences[group] = {...(clothingPreferences[group] || {}), color: hex, customColor: hex};
    document.querySelectorAll('input[name="clothingColor"]').forEach(input => input.checked = input.value === 'custom');
    $('clothingColorWheelPanel').hidden = false;
    localStorage.setItem('clothing-preferences',JSON.stringify(clothingPreferences));
    renderClothingColorWheel();
    updateCategoryPreview();
}
function pickClothingWheelPoint(event) {
    const bounds = $('clothingColorWheel').getBoundingClientRect();
    const dx = (event.clientX-bounds.left-bounds.width/2)/(bounds.width/2);
    const dy = (event.clientY-bounds.top-bounds.height/2)/(bounds.height/2);
    clothingWheelState.h = (Math.atan2(dx,-dy)*180/Math.PI+360)%360;
    clothingWheelState.s = Math.min(1,Math.hypot(dx,dy));
    saveClothingWheelColor();
}
$('clothingColorWheel').addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({preventScroll:true});
    pickClothingWheelPoint(event);
});
$('clothingColorWheel').addEventListener('pointermove',event => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) pickClothingWheelPoint(event);
});
$('clothingColorWheel').addEventListener('keydown',event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') clothingWheelState.h = (clothingWheelState.h-5*step+360)%360;
    if (event.key === 'ArrowRight') clothingWheelState.h = (clothingWheelState.h+5*step)%360;
    if (event.key === 'ArrowUp') clothingWheelState.s = Math.min(1,clothingWheelState.s+.01*step);
    if (event.key === 'ArrowDown') clothingWheelState.s = Math.max(0,clothingWheelState.s-.01*step);
    saveClothingWheelColor();
});
$('clothingColorBrightness').addEventListener('input',event => {
    clothingWheelState.v = Number(event.target.value)/100;
    saveClothingWheelColor();
});
$('clothingColorHex').addEventListener('input',event => {
    event.target.setCustomValidity('');
});
$('clothingColorHex').addEventListener('change',event => {
    if (!isClothingHex(event.target.value)) {
        event.target.setCustomValidity('색상 코드를 #123ABC 형식으로 입력해 주세요.');
        event.target.reportValidity();
        return;
    }
    clothingWheelState = clothingHexToHsv(event.target.value);
    saveClothingWheelColor();
});

function categoryPreferenceText(group) {
    let pref = clothingPreferences[group] || {};
    return "무늬 " + (pref.pattern || "없음") + ", 색상 " + (pref.color || "상관없음")
}

function clothingIconMarkup(name, color = "#f7f5ef") {
    if (name.endsWith('추천받기')) return '';
    const accessoryIcons = { '가방': 'accessory-bag', '모자': 'accessory-hat', '스카프': 'accessory-scarf', '목걸이': 'accessory-necklace', '귀걸이': 'accessory-earrings', '시계': 'accessory-watch' };
    const accessoryIcon = Object.keys(accessoryIcons).find(type => name.includes(type));
    if (accessoryIcon) {
        return '<svg viewBox="0 0 120 120" aria-hidden="true"><image href="assets/images/icon/' + accessoryIcons[accessoryIcon] + '.png?v=20261110-1" x="5" y="5" width="110" height="110" preserveAspectRatio="xMidYMid meet"/></svg>';
    }
    const bottomIcons = {
        '기본 바지': 'pants-basic', '데님 바지': 'pants-denim', '카고 바지': 'pants-cargo',
        '와이드 바지': 'pants-wide', '조거 바지': 'pants-jogger',
        '기본 반바지': 'shorts-basic', '데님 반바지': 'shorts-denim', '카고 반바지': 'shorts-cargo',
        '버뮤다 팬츠': 'shorts-bermuda', '스포츠 반바지': 'shorts-sport',
        '기본 치마': 'skirt-basic', '치마바지': 'skort', '짧은 치마': 'skirt-short'
    };
    if (bottomIcons[name]) {
        return '<svg viewBox="0 0 120 120" aria-hidden="true"><image href="assets/images/icon/' + bottomIcons[name] + '.png?v=20261110-1" x="5" y="5" width="110" height="110" preserveAspectRatio="xMidYMid meet"/></svg>';
    }
    if (name === '후드집업') {
        return '<svg viewBox="0 0 120 120" aria-hidden="true"><svg x="5" y="5" width="110" height="110" viewBox="203 191 895 845" preserveAspectRatio="xMidYMid meet"><image href="assets/images/icon/후드집업.png?v=20261112-1" width="1312" height="1199"/></svg></svg>';
    }
    const isLongSleeve = /긴팔|긴소매/.test(name);
    const iconType = /바람막이/.test(name) ? 'windbreaker'
        : /가디건/.test(name) ? 'cardigan'
        : /패딩/.test(name) ? 'puffer'
        : /민소매|나시/.test(name) ? 'sleeveless'
        : /후드/.test(name) ? 'hoodie'
        : /맨투맨/.test(name) ? 'sweatshirt'
        : /블라우스/.test(name) ? 'blouse'
        : /니트/.test(name) ? 'knit'
        : /티셔츠/.test(name) ? 'tee'
        : /셔츠/.test(name) ? 'shirt' : null;
    if (iconType) {
        const file = ['sleeveless', 'windbreaker', 'cardigan', 'puffer'].includes(iconType) ? iconType : iconType + (isLongSleeve ? '-long' : '-short');
        return '<svg viewBox="0 0 120 120" aria-hidden="true"><image href="assets/images/icon/' + file + '.png?v=20261110-1" x="5" y="5" width="110" height="110" preserveAspectRatio="xMidYMid meet"/></svg>';
    }
    let ink = "#343448",
        fill = color,
        detail = "#c8bfd9",
        shape;
    if (/상의 추천받기|반팔|티셔츠|블라우스/.test(name)) shape = '<path d="M36 31L48 25Q60 33 72 25L84 31L101 53L88 63L80 55V91Q60 97 40 91V55L32 63L19 53Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M49 27Q60 43 71 27" fill="none" stroke="' + detail + '" stroke-width="3" stroke-linecap="round"/>';
    else if (/민소매/.test(name)) shape = '<path d="M44 25Q60 35 76 25L82 43L91 50L87 92Q60 98 33 92L29 50L38 43Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M44 27Q45 44 60 46Q75 44 76 27" fill="none" stroke="' + detail + '" stroke-width="3.4"/>';
    else if (/가디건|겉옷/.test(name)) shape = '<path d="M43 24L51 21L60 29L69 21L77 24L91 36L100 81L87 85L82 59V94H38V59L33 85L20 81L29 36Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M60 30V93M51 23L60 37L69 23" fill="none" stroke="' + detail + '" stroke-width="3"/>';
    else if (/긴팔|니트|맨투맨|셔츠/.test(name)) shape = '<path d="M43 24L51 21Q60 27 69 21L77 24L87 31L100 74L88 79L80 52V94Q60 99 40 94V52L32 79L20 74L33 31Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M51 24Q60 39 69 24M42 84Q60 89 78 84" fill="none" stroke="' + detail + '" stroke-width="3"/>';
    else if (/치마|스커트/.test(name)) shape = '<path d="M42 27H78L83 39L96 89Q60 99 24 89L37 39Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M43 42L38 83M60 42V91M77 42L83 83M42 34H78" fill="none" stroke="' + detail + '" stroke-width="2.5"/>';
    else if (/짧은바지|쇼츠|반바지/.test(name)) shape = '<path d="M37 27H83L91 78L67 82L60 62L53 82L29 78Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M37 36H83M60 31V62M36 42L46 55M84 42L74 55" fill="none" stroke="' + detail + '" stroke-width="2.5"/>';
    else if (/긴바지|바지|팬츠/.test(name)) shape = '<path d="M39 25H81L88 94L65 97L60 51L55 97L32 94Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M40 34H80M60 30V51M42 42Q53 46 60 41M78 42Q67 46 60 41" fill="none" stroke="' + detail + '" stroke-width="2.5"/>';
    else if (/원피스/.test(name)) shape = '<path d="M47 24Q60 32 73 24L78 42L86 49L96 92Q60 99 24 92L34 49L42 42Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M47 27Q48 43 60 45Q72 43 73 27M34 50Q60 56 86 50M60 56V94" fill="none" stroke="' + detail + '" stroke-width="2.5"/>';
    else if (/가방/.test(name)) shape = '<path d="M34 43H86L91 91H29Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M44 44V36Q44 22 60 22Q76 22 76 36V44" fill="none" stroke="' + ink + '" stroke-width="3.2"/>';
    else if (/모자/.test(name)) shape = '<path d="M27 66Q31 35 59 29Q82 30 88 64L96 72Q61 81 24 72Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><path d="M36 59Q60 53 83 61" fill="none" stroke="' + detail + '" stroke-width="3"/>';
    else if (/목걸이/.test(name)) shape = '<path d="M35 27Q39 75 60 78Q81 75 85 27" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/><path d="M60 72L69 83L60 96L51 83Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="84" r="2.5" fill="' + detail + '"/>';
    else if (/귀걸이/.test(name)) shape = '<path d="M38 35V44M82 35V44" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/><path d="M29 60C29 48 47 48 47 60V78C47 90 29 90 29 78Z" fill="none" stroke="' + ink + '" stroke-width="3.5"/><path d="M73 60C73 48 91 48 91 60V78C91 90 73 90 73 78Z" fill="none" stroke="' + ink + '" stroke-width="3.5"/><circle cx="38" cy="83" r="4" fill="' + fill + '" stroke="' + ink + '" stroke-width="2"/><circle cx="82" cy="83" r="4" fill="' + fill + '" stroke="' + ink + '" stroke-width="2"/>';
    else if (/시계/.test(name)) shape = '<path d="M49 23H71L75 40Q88 48 88 60Q88 73 75 80L71 98H49L45 80Q32 73 32 60Q32 48 45 40Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/><circle cx="60" cy="60" r="17" fill="#fff" stroke="' + ink + '" stroke-width="3"/><path d="M60 49V60L68 65" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/>';
    else if (/없음/.test(name)) shape = '<circle cx="60" cy="56" r="27" fill="none" stroke="' + ink + '" stroke-width="3.5"/><path d="M42 76L78 36" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/>';
    else if (/스카프/.test(name)) shape = '<path d="M39 24L81 24L77 47L89 89L67 94L61 59L52 92L32 87L45 47Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/>';
    else shape = '<path d="M60 19L70 45L98 46L76 63L84 91L60 75L36 91L44 63L22 46L50 45Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 120 112" aria-hidden="true" focusable="false">' + shape + '</svg>'
}

function updateCategoryPreview() {
    let modal = $("categoryModal"),
        group = modal.dataset.group,
        names = {
            topCategory: ["상의", "topCategoryList"],
            category: ["하의", "categoryList"],
            accessoryCategory: ["액세서리", "accessoryCategoryList"]
        },
        selected = document.querySelector('input[name="' + group + '"]:checked'),
        name = group === 'accessoryCategory' ? accessorySelectionText() : (selected?.value || (group === 'category' ? '긴치마' : '상의 추천받기')) + (group === 'topCategory' && outerwearSelection() ? ' + ' + outerwearSelection() : ''),
        icons = {
            "상의 추천받기": "👚",
            "니트": "🧶",
            "가디건": "🧥",
            "블라우스": "👚",
            "맨투맨": "👕",
            "셔츠": "👔",
            "티셔츠": "👕",
            "긴치마": "👗",
            "짧은치마": "👗",
            "짧은바지": "🩳",
            "긴바지": "👖",
            "원피스": "👗",
            "없음": "✨",
            "가방": "👜",
            "모자": "🧢",
            "스카프": "🧣",
            "목걸이": "📿",
            "귀걸이": "💎",
            "시계": "⌚"
        };
    const previewItem = name.endsWith('추천받기')
        ? ({ topCategory: '티셔츠', category: '긴바지', accessoryCategory: '' })[group]
        : name;
    $("categoryPreviewIcon").innerHTML = previewItem ? clothingIconMarkup(previewItem, clothingPreviewColor(group)) : '';
    $("categoryPreviewIcon").hidden = !previewItem;
    $("categoryPreviewName").textContent = name;
    $("categoryPreviewStyle").textContent = categoryPreferenceText(group);
    $("categoryModalTitle").textContent = names[group][0] + " 설정"
}

function openCategoryModal(group) {
    let modal = $("categoryModal"),
        names = {
            topCategory: ["상의", "topCategoryList"],
            category: ["하의", "categoryList"],
            accessoryCategory: ["액세서리", "accessoryCategoryList"]
        },
        pref = clothingPreferences[group] || {};
    modal.dataset.group = group;
    const isAccessory = group === 'accessoryCategory';
    renderClothingColorOptions(group);
    $('categorySelectionTitle').textContent = isAccessory ? '액세서리 선택' : '옷 선택';
    $('categoryModalDescription').textContent = isAccessory ? '취향에 맞는 액세서리와 색상을 골라주세요.' : '취향에 맞는 옷과 색상을 골라주세요.';
    // Keep previously saved colors available through the custom picker.
    if (legacyClothingColors[pref.color] && !(isAccessory && accessoryColorPalette[pref.color])) {
        pref.color = legacyClothingColors[pref.color];
        pref.customColor = pref.color;
        clothingPreferences[group] = pref;
        localStorage.setItem('clothing-preferences', JSON.stringify(clothingPreferences));
    }
    if (isAccessory && clothingColorPalette[pref.color] && !accessoryColorPalette[pref.color]) {
        pref.color = clothingColorPalette[pref.color];
        pref.customColor = pref.color;
        clothingPreferences[group] = pref;
        localStorage.setItem('clothing-preferences', JSON.stringify(clothingPreferences));
    }
    $("categoryModalTitle").textContent = names[group][0] + " 설정";
    ["topCategoryList", "categoryList", "accessoryCategoryList"].forEach(id => $(id).style.display = id === names[group][1] ? "flex" : "none");
    document.querySelectorAll('input[name="clothingPattern"]').forEach(x => x.checked = x.value === (pref.pattern || "없음"));
    document.querySelectorAll('input[name="clothingColor"]').forEach(x => x.checked = x.value === (isClothingHex(pref.color) ? "custom" : pref.color || "상관없음"));
    syncClothingColorWheel();
    updateCategoryPreview();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.scrollTop = 0;
    modal.querySelector(".category-modal-card").scrollTop = 0;
    modal.querySelector(".category-editor").scrollTop = 0;
    modal.querySelector('.category-preview').scrollTop = 0;
    document.body.style.overflow = "hidden";
    modal.querySelector('.category-modal-close').focus({ preventScroll: true });
}

function closeCategoryModal() {
    let modal = $("categoryModal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""
}
document.getElementById("categoryModal").addEventListener("change", event => {
    let group = document.getElementById("categoryModal").dataset.group;
    if (event.target.matches('input[name="clothingPattern"],input[name="clothingColor"]')) {
        let pref = clothingPreferences[group] || {};
        if (event.target.name === "clothingPattern") pref.pattern = event.target.value;
        else pref.color = event.target.value === 'custom' ? (isClothingHex(pref.customColor) ? pref.customColor : '#9cb7de') : event.target.value;
        clothingPreferences[group] = pref;
        if (event.target.name === "clothingColor") syncClothingColorWheel();
        localStorage.setItem("clothing-preferences", JSON.stringify(clothingPreferences));
        updateCategoryPreview();
        return
    }
    if (!event.target.matches('input[type="radio"],input[type="checkbox"]')) return;
    if (event.target.name === 'accessoryCategory') normalizeAccessorySelection(event.target);
    if (event.target.name === 'outerCategory' && event.target.checked) {
        document.querySelectorAll('input[name="outerCategory"]').forEach(input => {
            if (input !== event.target) input.checked = false;
        });
    }
    let labels = {
            topCategory: "topCategoryValue",
            category: "categoryValue",
            accessoryCategory: "accessoryCategoryValue"
        },
        value = group === 'accessoryCategory' ? accessorySelectionText() : group === 'topCategory' ? (selectedClothingValues('topCategory')[0] || '상의 추천받기') + (outerwearSelection() ? ' + ' + outerwearSelection() : '') : event.target.value;
    if (group === "accessoryCategory" && value === "없음") value = "선택 안 함";
    $(labels[group]).textContent = value;
    updateCategoryPreview()
});
