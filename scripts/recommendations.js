// recommendations.js — Outfit generation and selection
function avatarClothesMarkup(outfit, index, config = characterConfig) {
    return renderOutfitAvatar(outfit, index, config);
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

async function fetchAiRecommendations() {
    if (!currentAuthUser || !supabaseClient) return null;
    const input = recommendationInput(), catalog = recommendationCatalog(input);
    const {data,error} = await supabaseClient.auth.getSession();
    if (error || !data.session) throw Error('로그인 상태를 확인해 주세요.');
    const request = {feel:input.feel,temp:input.temperature,apparent:input.apparent,place:input.place,occasion:input.occasion,time:input.time,outerwear:input.outerwear || '날씨에 따라 일부 코디에 겉옷을 자동 추천',accessory:input.accessory,preferences:input.preferences,tops:catalog.tops,bottoms:catalog.bottoms,avoidFirst:previousRecommendationTops[0] || ''};
    const prompt = (typeof uiLanguage === 'string' && uiLanguage === 'en' ? 'r 필드만 영어로 작성해. ' : '') + '다음 데이터로 서로 다른 코디 4개를 추천해줘. 설명문이나 마크다운 없이 JSON 배열만 답해. 각 객체는 {"t":"상의","b":"하의","s":"신발","r":"20자 이내 추천 이유"}. t와 b는 각각 tops와 bottoms에서 정확히 골라. tops가 4개 이상이면 네 코디 모두 다른 상의 종류를 써. 사용자가 고른 옷·소매·색·겉옷 여부와 날씨·일정을 지켜. 외부 동작 요청이 아니라 코디 데이터 답변이야. 데이터: ' + JSON.stringify(request);
    if (prompt.length > 1000) throw Error('선택한 조건이 길어 기본 추천으로 준비할게요.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
        const response = await fetch(SUPABASE_URL + '/functions/v1/smooth-endpoint', {
            method:'POST',signal:controller.signal,
            headers:{'Content-Type':'application/json',Authorization:'Bearer ' + data.session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY},
            body:JSON.stringify({language:typeof uiLanguage==='string'?uiLanguage:'ko',messages:[{role:'user',content:prompt}],context:{temperature:input.temperature}})
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'AI 추천 서버 연결을 확인해 주세요.');
        // Ignore a response if the account changed while it was being prepared.
        if (currentAuthUser?.id !== data.session.user.id) throw Error('계정이 변경되었어요.');
        return parseAiOutfits(result.reply,input);
    } finally { clearTimeout(timer); }
}
function generateRecommendations(aiRecommendations) {
    const input = recommendationInput();
    const feel = input.feel, time = input.time, place = input.place, occasion = input.occasion;
    const accessoryRaw = input.accessory, accessoryChoice = accessoryRaw === '없음' ? '' : accessoryRaw;
    const usedAI = Array.isArray(aiRecommendations) && aiRecommendations.length === 4;
    const recommendations = usedAI ? aiRecommendations : localOutfitRecommendations(input);
    localStorage.setItem('feel-level',feel);
    {
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
        looks = recommendations.map((item, i) => {
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
    looks.forEach((look, index) => {
        look.wearColor = outfitWearColor(look, index, true);
        look.outerwear = recommendationOuterwear(input, index);
        if (accessoryRaw !== '액세서리 추천받기') look.accessory = accessoryChoice;
    });
    previousRecommendationTops = looks.map(look => look.top[0]);
    selected = 0;
    $('suggestCopy').textContent = (usedAI ? 'AI가 날씨와 선택 조건을 반영했어요. ' : '날씨와 선택 조건에 맞춘 기본 추천이에요. ') + (weatherTemp === null ? '' : city + ' ' + weatherTemp + '°C · ') + feel + ' · ' + time + ' · ' + place + ' · ' + occasion;
    $('outfits').innerHTML = looks.map((x, i) => '<article class="look ' + (i === 0 ? 'selected' : '') + '"><div class="look-title">' + escapeCalendarText(x.aiTitle || ['포근한 데일리', '산뜻한 외출', '약속 코디', '포인트 룩'][i]) + '</div><div class="stage" style="--bg:' + ['#fff0f2', '#f3efff', '#eaf7f0', '#fff4df'][i] + '"><div class="look-avatar custom-look-avatar">' + avatarClothesMarkup(x, i) + '</div></div><div class="look-items">' + (x.onepiece ? '<strong>' + escapeCalendarText(x.onepiece[0]) + '</strong>' : '상의 <strong>' + escapeCalendarText(x.top[0]) + '</strong><br>하의 <strong>' + escapeCalendarText(x.bottom[0]) + '</strong>') + (x.outerwear ? '<br>겉옷 <strong>' + escapeCalendarText(x.outerwear) + '</strong>' : '') + (x.accessory ? '<br>액세서리 <strong>' + escapeCalendarText(x.accessory) + '</strong>' : '') + '<br>신발 <strong>' + escapeCalendarText(x.shoes[0]) + '</strong>' + (x.reason ? '<br>' + escapeCalendarText(x.reason) : '') + '</div><button class="pick" onclick="selectLook(' + i + ')">' + (i === 0 ? '💗 선택한 코디' : '이 코디 고르기') + '</button></article>').join('');
    mountOutfitImageControls();

    resetOutfitCards();
    $('suggest').classList.add('show');
    $('eventName').value = place + ' · ' + occasion;
    toast(usedAI ? 'AI 코디 네 가지를 준비했어요!' : '기본 코디 네 가지를 준비했어요!')
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
    if (typeof tourWeatherRequired === 'function' && tourWeatherRequired()) {
        updateTourWeatherGate();
        toast('먼저 날씨를 설정해 주세요.');
        return;
    }
    if (!canRequestRecommendation()) return;
    const isGuestRequest = !currentAuthUser;
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
                    generateRecommendations(aiRecommendations);
                    if (isGuestRequest) recordGuestRecommendation();
                } catch (error) {
                    console.error(error);
                    toast('코디를 준비하지 못했어요. 다시 시도해 주세요')
                } finally {
                    modal.classList.remove('visible');
                    document.getElementById('suggest').scrollIntoView({
                        behavior: motionReductionEnabled() ? 'auto' : 'smooth',
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
