// recommendations.js — Outfit generation and selection
function avatarClothesMarkup(x, i) {
    let colors = ['#e8a9b2', '#9cb7de', '#93c4a5', '#d4a46d'],
        color = colors[i % colors.length],
        bottomColor = ['#7388ac', '#8e789e', '#799984', '#a77f63'][i % 4],
        lower = (x.bottom?.[0] || '').toLowerCase(),
        isDress = !!x.onepiece,
        isSkirt = /치마|스커트/.test(lower),
        isShort = /짧은|쇼츠|반바지/.test(lower),
        top = isDress ? '<path d="M51 69Q65 62 79 69L83 104Q65 112 47 104Z" fill="' + color + '" stroke="#fff" stroke-opacity=".65" stroke-width="1.5"/><path d="M51 101L79 101Q85 126 94 151Q65 158 36 151Z" fill="' + color + '" stroke="#fff" stroke-opacity=".65" stroke-width="1.5"/>' : '<path d="M50 70L56 66H74L80 70L84 105Q65 111 46 105Z" fill="' + color + '" stroke="#fff" stroke-opacity=".65" stroke-width="1.5"/><path d="M50 72L44 75L38 94L44 97L51 84M80 72L86 75L92 94L86 97L79 84Z" fill="' + color + '" stroke="#fff" stroke-opacity=".65" stroke-width="1.5"/>',
        bottom = isDress ? '' : isSkirt ? '<path d="M47 104L83 104L91 148Q65 155 39 148Z" fill="' + bottomColor + '" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>' : isShort ? '<path d="M47 104L83 104L82 127L67 126L65 120L62 126L48 127Z" fill="' + bottomColor + '" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>' : '<path d="M47 104L83 104L80 151L66 151L65 121L62 151L48 151Z" fill="' + bottomColor + '" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>';
    return '<svg viewBox="0 0 130 215" aria-label="추천 코디를 입은 캐릭터">' + top + bottom + '</svg>'
}

function toggleCustomField(id) {
    let input = $(id + 'Custom'),
        select = $(id),
        show = select.value === 'custom';
    input.hidden = !show;
    if (show) input.focus()
}

function getFieldValue(id) {
    let select = $(id);
    return select.value === 'custom' ? $(id + 'Custom').value.trim() : select.value
}

function fetchAiRecommendations() {
    let feel = document.querySelector('input[name=feel]:checked')?.value,
        bottomCategory = document.querySelector('input[name=category]:checked')?.value,
        topCategory = document.querySelector('input[name=topCategory]:checked')?.value || '상의 추천받기',
        accessory = document.querySelector('input[name=accessoryCategory]:checked')?.value || '없음';
    return fetch('/.netlify/functions/recommend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            feel,
            weather: {
                city,
                tempC: weatherTemp
            },
            topCategory: topCategory + " (" + categoryPreferenceText("topCategory") + ")",
            bottomCategory: bottomCategory + " (" + categoryPreferenceText("category") + ")",
            accessory: accessory + " (" + categoryPreferenceText("accessoryCategory") + ")",
            place: getFieldValue('place'),
            occasion: getFieldValue('occasion'),
            time: getFieldValue('time'),
            gender: characterConfig.gender || 'female'
        })
    }).then(async response => {
        let data = await response.json();
        if (!response.ok) throw new Error(data.error || 'AI 추천 요청에 실패했어요');
        return data.recommendations
    })
}

function generateRecommendations(aiRecommendations) {
    let feel = document.querySelector('input[name=feel]:checked').value,
        category = document.querySelector('input[name=category]:checked').value + ' (' + categoryPreferenceText('category') + ')',
        topChoice = (document.querySelector('input[name=topCategory]:checked')?.value || '상의 추천받기') + ' (' + categoryPreferenceText('topCategory') + ')',
        accessoryRaw = document.querySelector('input[name=accessoryCategory]:checked')?.value || '없음',
        accessoryChoice = accessoryRaw === '없음' ? '' : accessoryRaw + ' (' + categoryPreferenceText('accessoryCategory') + ')',
        place = getFieldValue('place'),
        occasion = getFieldValue('occasion'),
        time = getFieldValue('time');
    localStorage.setItem('feel-level', feel);
    let warmth = feel === '매우 추워요' || (weatherTemp !== null && weatherTemp < 8) ? '도톰한' : feel === '더워요' || (weatherTemp !== null && weatherTemp > 25) ? '가벼운' : '편안한',
        tops = [
            ['니트', '🧶'],
            ['가디건', '🧥'],
            ['블라우스', '👚'],
            ['맨투맨', '👕']
        ],
        isSkirt = category.includes('치마'),
        isShort = category.includes('짧은'),
        isDress = category.includes('원피스'),
        isCustom = !category.startsWith('하의 추천받기') && !isSkirt && !isDress && !/바지|팬츠|쇼츠/.test(category),
        bottom = isSkirt ? [
            [!isShort ? '플로럴 롱 스커트' : '플리츠 미니스커트', '👗'],
            [!isShort ? '데님 롱 스커트' : '데님 미니스커트', '👗'],
            [!isShort ? '차분한 롱 스커트' : '체크 미니스커트', '👗'],
            [!isShort ? '니트 롱 스커트' : '산뜻한 짧은 스커트', '👗']
        ] : [
            [isShort ? '데님 쇼츠' : '와이드 팬츠', '👖'],
            [isShort ? '코튼 쇼츠' : '데님 팬츠', '👖'],
            [isShort ? '린넨 쇼츠' : '슬랙스', '👖'],
            [isShort ? '캐주얼 쇼츠' : '코튼 팬츠', '👖']
        ],
        shoes = [
            ['운동화', '👟'],
            ['로퍼', '👞'],
            ['메리제인 슈즈', '👞'],
            ['앵클 부츠', '👢']
        ];
    if (!topChoice.startsWith('상의 추천받기')) {
        let icons = {
            '반팔': '👕',
            '긴팔': '👕',
            '민소매': '👚',
            '니트': '🧶',
            '가디건': '🧥',
            '블라우스': '👚',
            '맨투맨': '👕',
            '셔츠': '👔',
            '티셔츠': '👕'
        };
        tops = Array.from({
            length: 4
        }, () => [topChoice, icons[topChoice] || '👚'])
    }
    if (category.startsWith('하의 추천받기')) bottom = [
        ['와이드 팬츠', '👖'],
        ['데님 팬츠', '👖'],
        ['플리츠 롱 스커트', '👗'],
        ['코튼 팬츠', '👖']
    ];
    if (isCustom) bottom = Array.from({
        length: 4
    }, (_, i) => [warmth + ' ' + category + ' ' + ['스타일', '코디', '룩', '착장'][i], '👗']);
    looks = Array.from({
        length: 4
    }, (_, i) => isDress ? {
        onepiece: [warmth + ' 니트 원피스', '👗'],
        bottom: ['원피스', ''],
        shoes: shoes[i],
        accessory: accessoryRaw === '액세서리 추천받기' ? ['가방', '모자', '목걸이', '시계'][i] : accessoryChoice
    } : {
        onepiece: null,
        top: [warmth + ' ' + tops[i][0], tops[i][1]],
        bottom: bottom[i],
        shoes: shoes[i],
        accessory: accessoryRaw === '액세서리 추천받기' ? ['가방', '모자', '목걸이', '시계'][i] : accessoryChoice
    });
    if (Array.isArray(aiRecommendations) && aiRecommendations.length === 4) {
        let topIcons = {
                '반팔': '👕',
                '긴팔': '👕',
                '민소매': '👚',
                '니트': '🧶',
                '가디건': '🧥',
                '블라우스': '👚',
                '맨투맨': '👕',
                '셔츠': '👔',
                '티셔츠': '👕',
                '후드티': '🧥'
            },
            bottomIcons = {
                '치마': '👗',
                '스커트': '👗',
                '원피스': '👗',
                '바지': '👖',
                '팬츠': '👖',
                '쇼츠': '👖'
            },
            shoeIcons = {
                '부츠': '👢',
                '로퍼': '👞',
                '구두': '👞',
                '메리제인': '👞',
                '운동화': '👟',
                '스니커즈': '👟',
                '샌들': '🩴'
            };
        looks = aiRecommendations.map((item, i) => {
            let top = String(item.top || '상의'),
                bottomName = String(item.bottom || '하의'),
                shoeName = String(item.shoes || '운동화'),
                dress = /원피스/.test(bottomName),
                topIcon = Object.keys(topIcons).find(k => top.includes(k)),
                bottomIcon = Object.keys(bottomIcons).find(k => bottomName.includes(k)),
                shoeIcon = Object.keys(shoeIcons).find(k => shoeName.includes(k));
            return {
                onepiece: dress ? [bottomName, '👗'] : null,
                top: dress ? null : [top, topIcons[topIcon] || '👚'],
                bottom: [bottomName, dress ? '' : bottomIcons[bottomIcon] || '👖'],
                shoes: [shoeName, shoeIcons[shoeIcon] || '👟'],
                accessory: String(item.accessory || ''),
                aiTitle: String(item.title || ['포근한 데일리', '산뜻한 외출', '약속 코디', '포인트 룩'][i]),
                reason: String(item.reason || '')
            }
        })
    }
    selected = 0;
    $('suggestCopy').textContent = weatherTemp === null ? 'AI가 체감온도와 선택한 옷, 약속에 맞춰 코디했어요. ' + time + ' · ' + place + ' · ' + occasion : city + ' ' + weatherTemp + '°C와 ' + feel + ' 느낌을 반영했어요. ' + time + ' · ' + place + ' · ' + occasion;
    $('outfits').innerHTML = looks.map((x, i) => '<article class="look ' + (i === 0 ? 'selected' : '') + '"><div class="look-title">' + escapeCalendarText(x.aiTitle || ['포근한 데일리', '산뜻한 외출', '약속 코디', '포인트 룩'][i]) + '</div><div class="stage" style="--bg:' + ['#fff0f2', '#f3efff', '#eaf7f0', '#fff4df'][i] + '"><div class="look-avatar gender-' + (characterConfig.gender || "female") + '">' + avatarClothesMarkup(x, i) + '</div></div><div class="look-items">' + (x.onepiece ? '<strong>' + escapeCalendarText(x.onepiece[0]) + '</strong>' : '상의 <strong>' + escapeCalendarText(x.top[0]) + '</strong><br>하의 <strong>' + escapeCalendarText(x.bottom[0]) + '</strong>') + (x.accessory ? '<br>액세서리 <strong>' + escapeCalendarText(x.accessory) + '</strong>' : '') + '<br>신발 <strong>' + escapeCalendarText(x.shoes[0]) + '</strong>' + (x.reason ? '<br>' + escapeCalendarText(x.reason) : '') + '</div><button class="pick" onclick="selectLook(' + i + ')">' + (i === 0 ? '💗 선택한 코디' : '이 코디 고르기') + '</button></article>').join('');
    resetOutfitCards();
    $('suggest').classList.add('show');
    $('eventName').value = place + ' · ' + occasion;
    toast(aiRecommendations ? 'AI 코디 네 가지를 준비했어요!' : '기본 코디 네 가지를 준비했어요!')
}

function closeResults() {
    let panel = document.getElementById('suggest');
    panel.classList.add('closing');
    setTimeout(() => {
        panel.classList.remove('show', 'closing')
    }, 240)
}

function recommend() {
    let modal = document.getElementById('thinking');
    if (modal.classList.contains('visible')) return;
    let selectedFeel = document.querySelector('input[name=feel]:checked'),
        selectedCategory = document.querySelector('input[name=category]:checked'),
        selectedTop = document.querySelector('input[name=topCategory]:checked');
    if (!selectedFeel || !selectedCategory || !selectedTop) {
        renderCategoryChoices();
        updateFeelFromSlider();
        selectedFeel = document.querySelector('input[name=feel]:checked');
        selectedCategory = document.querySelector('input[name=category]:checked');
        selectedTop = document.querySelector('input[name=topCategory]:checked')
    }
    if (!selectedFeel || !selectedCategory || !selectedTop) {
        toast('체감온도와 상의·하의를 선택해 주세요');
        return
    }
    let missing = ['time', 'place', 'occasion'].find(id => $(id).value === 'custom' && !$(id + 'Custom').value.trim());
    if (missing) {
        $(missing + 'Custom').hidden = false;
        $(missing + 'Custom').focus();
        toast('직접 입력한 내용을 적어 주세요');
        return
    }
    let poses = Array.from(document.querySelectorAll('.thinking-pose')),
        index = 0;
    poses.forEach((pose, i) => pose.classList.toggle('active', i === 0));
    modal.classList.add('visible');
    let cycle = setInterval(() => {
        poses[index].classList.remove('active');
        index = (index + 1) % poses.length;
        poses[index].classList.add('active')
    }, 850);
    let start = Date.now();
    (async () => {
        let aiRecommendations = null;
        try {
            aiRecommendations = await fetchAiRecommendations()
        } catch (error) {
            console.error(error);
            toast('AI 연결에 실패해 기본 코디로 추천할게요')
        } finally {
            clearInterval(cycle);
            let poseDelay = Math.max(0, 900 - (Date.now() - start));
            setTimeout(() => {
                try {
                    generateRecommendations(aiRecommendations)
                } catch (error) {
                    console.error(error);
                    toast('코디를 준비하지 못했어요. 다시 시도해 주세요')
                } finally {
                    modal.classList.remove('visible');
                    document.getElementById('suggest').scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    })
                }
            }, poseDelay)
        }
    })()
}

function selectLook(i) {
    selected = i;
    document.querySelectorAll('.look').forEach((x, n) => {
        x.classList.toggle('selected', i === n);
        x.querySelector('.pick').textContent = i === n ? '💗 선택한 코디' : '이 코디 고르기'
    });
    toast('이 코디로 선택했어요')
}
