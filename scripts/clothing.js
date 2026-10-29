// clothing.js — Clothing choices and preferences
const baseCategories = ['긴치마', '짧은치마', '짧은바지', '긴바지', '원피스'];
let customCategories = JSON.parse(localStorage.getItem('custom-clothing-types') || '[]');
let customTopCategories = JSON.parse(localStorage.getItem('custom-top-types') || '[]'),
    customAccessoryCategories = JSON.parse(localStorage.getItem('custom-accessory-types') || '[]');
let categoryOptions = [...baseCategories, ...customCategories];

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

function renderCategoryChoices(selectValue, selectedGroup) {
    let keep = selectedGroup === 'category' && selectValue ? selectValue : document.querySelector('input[name="category"]:checked')?.value || '긴치마',
        topKeep = selectedGroup === 'topCategory' && selectValue ? selectValue : document.querySelector('input[name="topCategory"]:checked')?.value || '상의 추천받기',
        accessoryKeep = selectedGroup === 'accessoryCategory' && selectValue ? selectValue : document.querySelector('input[name="accessoryCategory"]:checked')?.value || '없음',
        bottomBox = document.getElementById('categoryList'),
        topBox = document.getElementById('topCategoryList'),
        accessoryBox = document.getElementById('accessoryCategoryList');

    function makeChoice(name, group, checked) {
        let item = document.createElement('span');
        item.className = 'category-item';
        let label = document.createElement('label');
        label.className = 'choice';
        let radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = group;
        radio.value = name;
        radio.checked = name === checked;
        let icon = document.createElement('span');
        icon.className = 'choice-icon';
        icon.innerHTML = clothingIconMarkup(name);
        let text = document.createElement('span');
        text.textContent = name;
        label.append(radio, icon, text);
        item.appendChild(label);
        let customList = group === 'topCategory' ? customTopCategories : group === 'accessoryCategory' ? customAccessoryCategories : customCategories;
        if (customList.includes(name)) {
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
    let customShort = customTopCategories.filter(x => x.startsWith('반팔 · ')),
        customLong = customTopCategories.filter(x => x.startsWith('긴팔 · ')),
        customOuter = customTopCategories.filter(x => x.startsWith('겉옷 · '));
    topBox.replaceChildren(makeChoice('상의 추천받기', 'topCategory', topKeep), makeGroup('반팔', ['반팔', '티셔츠', '블라우스', ...customShort], 'topCategory', topKeep), makeGroup('긴팔', ['긴팔', '니트', '맨투맨', '셔츠', ...customLong], 'topCategory', topKeep), makeGroup('겉옷', ['가디건', '민소매', ...customOuter], 'topCategory', topKeep));
    let shorts = categoryOptions.filter(name => /짧은바지|반바지|쇼츠/.test(name)),
        longPants = categoryOptions.filter(name => /긴바지|긴 팬츠|바지/.test(name) && !shorts.includes(name)),
        skirts = categoryOptions.filter(name => /치마|스커트/.test(name)),
        dresses = categoryOptions.filter(name => /원피스/.test(name)),
        custom = categoryOptions.filter(name => !shorts.includes(name) && !longPants.includes(name) && !skirts.includes(name) && !dresses.includes(name));
    bottomBox.replaceChildren(makeChoice('하의 추천받기', 'category', keep), ...[makeGroup('반바지', shorts, 'category', keep), makeGroup('긴바지', longPants, 'category', keep), makeGroup('치마', skirts, 'category', keep), makeGroup('원피스', dresses, 'category', keep), ...(custom.length ? [makeGroup('기타', custom, 'category', keep)] : [])].filter(group => group.querySelectorAll('.category-item').length));
    let accessories = ['액세서리 추천받기', '없음', '가방', '모자', '스카프', '목걸이', '귀걸이', '시계', ...customAccessoryCategories];
    accessoryBox.replaceChildren(...accessories.map(name => makeChoice(name, 'accessoryCategory', accessoryKeep)))
}

function removeCategory(name, group = 'category') {
    if (group === 'topCategory') {
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
    let fallback = group === 'topCategory' ? '상의 추천받기' : group === 'accessoryCategory' ? '없음' : '긴치마';
    renderCategoryChoices(document.querySelector('input[name="' + group + '"]:checked')?.value === name ? fallback : undefined, group)
}

function updateCustomClothingSubtypes() {
    let group = document.getElementById('customClothingGroup').value,
        options = {
            topCategory: ['반팔', '긴팔', '겉옷'],
            category: ['반바지', '긴바지', '치마', '원피스'],
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
        list = group === 'topCategory' ? customTopCategories : group === 'accessoryCategory' ? customAccessoryCategories : customCategories;
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

function categoryPreferenceText(group) {
    let pref = clothingPreferences[group] || {};
    return "무늬 " + (pref.pattern || "없음") + ", 색상 " + (pref.color || "상관없음")
}

function clothingIconMarkup(name, color = "#f7f5ef") {
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
        name = selected?.value || (group === "category" ? "긴치마" : group === "accessoryCategory" ? "없음" : "상의 추천받기"),
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
    $("categoryPreviewIcon").innerHTML = clothingIconMarkup(name, ({
        아이보리: "#f7f5ef",
        핑크: "#e8a9b2",
        하늘색: "#9cb7de",
        초록: "#93c4a5",
        검정: "#50536b",
        베이지: "#d4a46d"
    })[(clothingPreferences[group] || {}).color] || "#f7f5ef");
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
    $("categoryModalTitle").textContent = names[group][0] + " 설정";
    ["topCategoryList", "categoryList", "accessoryCategoryList"].forEach(id => $(id).style.display = id === names[group][1] ? "flex" : "none");
    document.querySelectorAll('input[name="clothingPattern"]').forEach(x => x.checked = x.value === (pref.pattern || "없음"));
    document.querySelectorAll('input[name="clothingColor"]').forEach(x => x.checked = x.value === (pref.color || "상관없음"));
    updateCategoryPreview();
    modal.scrollTop = 0;
    modal.querySelector(".category-modal-card").scrollTop = 0;
    modal.querySelector(".category-editor").scrollTop = 0;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"
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
        else pref.color = event.target.value;
        clothingPreferences[group] = pref;
        localStorage.setItem("clothing-preferences", JSON.stringify(clothingPreferences));
        updateCategoryPreview();
        return
    }
    if (!event.target.matches('input[type="radio"]')) return;
    let labels = {
            topCategory: "topCategoryValue",
            category: "categoryValue",
            accessoryCategory: "accessoryCategoryValue"
        },
        value = event.target.value;
    if (group === "accessoryCategory" && value === "없음") value = "선택 안 함";
    $(labels[group]).textContent = value;
    updateCategoryPreview()
});
