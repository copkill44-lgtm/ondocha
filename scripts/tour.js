// tour.js — Interactive spotlight tour
const featureTourSteps = [
    ['.sky', '오늘 하늘은 어떨까요?', '위치를 허용하면 지금 있는 곳의 날씨가 자동으로 나와요! ‘지역 바꾸기’에서 도시를 골라도 좋아요.'],
    ['.feel-range', '지금, 춥나요? 따뜻한가요?', '동그란 손잡이를 쓱 움직여봐요. 내가 느끼는 온도를 알려주면 더 편안한 코디를 골라줄게요!'],
    ['#recommendCard .fields', '오늘 어디 가요?', '친구랑 카페? 설레는 데이트? 언제 어디로 가는지 알려줘요. 목록에 없다면 직접 적어도 좋아요!'],
    ['.category-groups > button:nth-child(1)', '상의 고르기', '여기를 톡 눌러 상의를 골라봐요. 색깔과 무늬도 정할 수 있어요! 다 고르고 창을 닫으면 여기서 기다릴게요.'],
    ['.category-groups > button:nth-child(2)', '하의 고르기', '바지나 치마 등 원하는 하의를 골라 보세요. 코디니에게 추천을 맡길 수도 있어요.'],
    ['.category-groups > button:nth-child(3)', '액세서리 고르기', '코디에 더하고 싶은 액세서리를 골라 보세요. 필요 없다면 선택하지 않아도 괜찮아요.'],
    ['.custom-category-trigger', '원하는 옷 직접 추가', '목록에 없는 옷은 이름과 종류를 입력해 추가해 보세요.'],
    ['#recommendCard > .date-row', '날짜와 시간', '옷을 입을 날짜와 시간을 설정해 보세요. 코디를 캘린더에 저장할 때 사용해요.'],
    ['#recommendCard > .primary', '코디 추천받기', '설정을 마쳤다면 이 버튼으로 추천을 받아 보세요. 마음에 드는 코디를 고른 뒤 일정 이름을 적고 캘린더에 저장할 수 있어요. 추천을 누르면 안내를 마칠게요.'],
    ['#navCalendar', '코디 캘린더', '여기를 누르면 저장한 코디를 날짜별로 확인할 수 있어요. 날짜를 눌러 자세히 볼 수 있어요. 이제 자유롭게 사용해 보세요!']
];
let featureTourIndex = 0,
    featureTourActive = false,
    tourFrame = 0;
let accountTourTimer = null;

function maybeStartAccountTour() {
    clearTimeout(accountTourTimer);
    if (!currentAuthUser || !authDataReady || featureTourActive) return;
    if (localStorage.getItem('codini-account-tour-seen') === '1') return;
    const owner = currentAuthUser.id;
    accountTourTimer = setTimeout(() => {
        if (currentAuthUser?.id === owner && localStorage.getItem('codini-account-tour-seen') !== '1') startFeatureTour();
    }, 500);
}

function tourWeatherRequired() {
    return featureTourActive && featureTourIndex === 0 && !weatherSetupComplete;
}

function updateTourWeatherGate() {
    const blocked = tourWeatherRequired();
    document.getElementById('tourNext').disabled = blocked;
    document.getElementById('tourSkip').disabled = blocked;
    const hint = document.getElementById('tourWeatherHint');
    hint.hidden = !featureTourActive || featureTourIndex !== 0;
    hint.textContent = blocked
        ? '내 위치를 허용하거나 도시를 선택하고 ‘이 도시로 설정’을 눌러주세요. 날씨를 불러오면 다음으로 갈 수 있어요.'
        : '날씨 설정 완료! 다음 기능도 함께 둘러볼까요?';
}

document.addEventListener('ondocha-weather-change', () => {
    if (!featureTourActive) return;
    updateTourWeatherGate();
    scheduleTourPosition();
});

function startFeatureTour() {
    featureTourIndex = 0;
    featureTourActive = true;
    if (!weatherSetupComplete) {
        document.getElementById('weatherConfig').classList.add('open');
        document.getElementById('weatherSettingsToggle').setAttribute('aria-expanded', 'true');
    }
    showHome();
    setTimeout(() => {
        if (featureTourActive) showFeatureTourStep();
    }, 400);
}

function moveFeatureTour(delta) {
    if (delta > 0 && tourWeatherRequired()) { updateTourWeatherGate(); return; }
    featureTourIndex += delta;
    if (featureTourIndex >= featureTourSteps.length) {
        finishFeatureTour();
        return;
    }
    featureTourIndex = Math.max(0, featureTourIndex);
    showFeatureTourStep();
}

function showFeatureTourStep() {
    const step = featureTourSteps[featureTourIndex];
    const target = document.querySelector(step[0]);
    if (!target) {
        finishFeatureTour();
        return;
    }
    document.getElementById('featureTour').hidden = false;
    document.getElementById('tourProgress').textContent = (featureTourIndex + 1) + ' / ' + featureTourSteps.length + ' · 천천히 따라와요';
    document.getElementById('tourTitle').textContent = step[1];
    document.getElementById('tourCopy').textContent = step[2];
    document.getElementById('tourPrevious').hidden = featureTourIndex === 0;
    document.getElementById('tourNext').textContent = featureTourIndex === featureTourSteps.length - 1 ? '시작' : '다음으로 →';
    document.getElementById('tourMeterFill').style.width = ((featureTourIndex + 1) / featureTourSteps.length * 100) + '%';
    updateTourWeatherGate();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
        behavior: reduceMotion ? 'instant' : 'smooth',
        block: featureTourIndex === 0 ? 'start' : 'center'
    });
    if (!reduceMotion) {
        const card = document.querySelector('.tour-card');
        if (card.tourEntrance) card.tourEntrance.cancel();
        card.tourEntrance = card.animate([{
            opacity: .3,
            transform: 'translateY(10px) scale(.97)'
        }, {
            opacity: 1,
            transform: 'translateY(0) scale(1)'
        }], {
            duration: 420,
            easing: 'cubic-bezier(.22,1,.36,1)'
        });
    }
    positionFeatureTour();
    document.getElementById('tourTitle').focus({
        preventScroll: true
    });
}

function positionFeatureTour() {
    if (!featureTourActive) return;
    const root = document.getElementById('featureTour');
    const popup = document.querySelector('.category-modal[aria-hidden="false"], .day-detail[aria-hidden="false"], .thinking.visible');
    root.hidden = !!popup;
    if (popup) return;
    const target = document.querySelector(featureTourSteps[featureTourIndex][0]);
    if (!target || !target.getClientRects().length) {
        finishFeatureTour();
        return;
    }
    const r = target.getBoundingClientRect(),
        w = innerWidth,
        h = innerHeight;
    const l = Math.min(w, Math.max(0, r.left - 7)),
        t = Math.min(h, Math.max(0, r.top - 7)),
        right = Math.max(l, Math.min(w, r.right + 7)),
        bottom = Math.max(t, Math.min(h, r.bottom + 7));
    const boxes = [
        [0, 0, w, t],
        [0, t, l, bottom - t],
        [right, t, w - right, bottom - t],
        [0, bottom, w, h - bottom]
    ];
    root.querySelectorAll('.tour-shade').forEach((el, i) => {
        const b = boxes[i];
        Object.assign(el.style, {
            left: b[0] + 'px',
            top: b[1] + 'px',
            width: Math.max(0, b[2]) + 'px',
            height: Math.max(0, b[3]) + 'px'
        });
    });
    Object.assign(root.querySelector('.tour-outline').style, {
        left: l + 'px',
        top: t + 'px',
        width: (right - l) + 'px',
        height: (bottom - t) + 'px'
    });
    const card = root.querySelector('.tour-card'),
        ch = card.offsetHeight,
        cw = card.offsetWidth;
    let x = Math.max(12, Math.min(w - cw - 12, l)),
        y = bottom + 14;
    if (y + ch > h - 12) y = t - ch - 14;
    if (y < 12) {
        if (w - right > cw + 24) {
            x = right + 14;
            y = Math.max(12, (h - ch) / 2);
        } else if (l > cw + 24) {
            x = l - cw - 14;
            y = Math.max(12, (h - ch) / 2);
        } else y = Math.max(12, h - ch - 12);
    }
    Object.assign(card.style, {
        left: x + 'px',
        top: y + 'px'
    });
}

function finishFeatureTour() {
    if (tourWeatherRequired()) { updateTourWeatherGate(); return false; }
    featureTourActive = false;
    document.getElementById('featureTour').hidden = true;
    try {
        localStorage.setItem(currentAuthUser ? 'codini-account-tour-seen' : 'codini-tour-seen', '1');
    } catch (e) {}
    const button = document.querySelector('.tour-replay');
    if (button) button.focus({
        preventScroll: true
    });
}

function scheduleTourPosition() {
    cancelAnimationFrame(tourFrame);
    tourFrame = requestAnimationFrame(positionFeatureTour);
}
window.addEventListener('resize', scheduleTourPosition);
window.addEventListener('scroll', scheduleTourPosition, true);
document.addEventListener('keydown', event => {
    if (featureTourActive && event.key === 'Escape' && !document.getElementById('featureTour').hidden) finishFeatureTour();
});
new MutationObserver(scheduleTourPosition).observe(document.getElementById('app'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden']
});
['categoryModal', 'customClothingModal', 'dayDetail', 'thinking'].forEach(id => {
    new MutationObserver(scheduleTourPosition).observe(document.getElementById(id), {
        attributes: true,
        attributeFilter: ['class', 'aria-hidden']
    });
});
document.querySelector('#recommendCard > .primary').addEventListener('click', () => {
    if (featureTourActive) finishFeatureTour();
});
document.getElementById('navCalendar').addEventListener('click', () => {
    if (featureTourActive) finishFeatureTour();
});
const startAppWithPraise = startAfterCharacterPraise;
startAfterCharacterPraise = function() {
    startAppWithPraise();
    let seen = false;
    try {
        seen = localStorage.getItem('codini-tour-seen') === '1';
    } catch (e) {}
    if (!seen) setTimeout(startFeatureTour, 420);
};
