// character.js — Onboarding and character setup
let characterConfig = JSON.parse(localStorage.getItem('codini-character') || 'null') || {
    hair: 'open',
    skin: 'default',
    eyes: 'default'
};
let characterInitialized = false;
let characterEditing = false;
let characterBeforeEdit = null;
let characterReturnNav = 'navHome';

function renderCharacter() {
    const previousAppearance = JSON.stringify(characterConfig);
    const wasInitialized = characterInitialized;
    let hair = document.getElementById('charHair'),
        skin = document.getElementById('charSkin'),
        eyes = document.getElementById('charEyes');
    if (!characterInitialized) {
        if (hair) hair.value = characterConfig.hair || 'open';
        if (skin) skin.value = characterConfig.skin || 'default';
        if (eyes) eyes.value = characterConfig.eyes || 'default'
    }
    characterConfig.hair = hair ? hair.value : 'open';
    characterConfig.skin = skin ? skin.value : 'default';
    let base = document.querySelector('.character-base'),
        skinAssets = {
            default: 'assets/images/characters/body-default.png',
            toneA: 'assets/images/characters/body-light.png',
            toneB: 'assets/images/characters/body-dark.png'
        };
    if (base) base.src = skinAssets[characterConfig.skin] || skinAssets.default;
    characterConfig.eyes = eyes ? eyes.value : 'default';
    const face = document.querySelector('.character-face');
    if (face) face.src = characterImageLayers(characterConfig).face;
    characterInitialized = true;
    let img = document.querySelector('.character-hair');
    if (img) {
        let hairAssets = {
                open: ['assets/images/characters/hair-covered.png?v=2', '덮은머리'],
                openLong: ['assets/images/characters/hair-covered-long.png', '덮은긴머리'],
                tied: ['assets/images/characters/hair-open.png', '깐머리'],
                tiedLong: ['assets/images/characters/hair-open-long.png', '깐긴머리'],
                openBob: ['assets/images/characters/hair-covered-bob.png', '덮은단발머리'],
                tiedBob: ['assets/images/characters/hair-open-bob.png', '깐단발머리']
            },
            selectedHair = hairAssets[characterConfig.hair] || hairAssets.open;
        img.src = characterImageLayers(characterConfig).hair;
        img.alt = selectedHair[1]
    }
    if (typeof syncCharacterPicker === 'function') syncCharacterPicker();
    if (wasInitialized && previousAppearance !== JSON.stringify(characterConfig) &&
        !motionReductionEnabled()) {
        const preview = document.getElementById('characterPreview');
        if (preview && typeof preview.animate === 'function') {
            preview.getAnimations().forEach(animation => animation.cancel());
            preview.animate([
                { opacity: .65, transform: 'translateY(3px) scale(.985)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], { duration: 260, easing: 'ease-out' });
        }
    }
}
let onboardingIndex = 0;

function startApp() {
    let welcome = document.getElementById('welcome');
    welcome.classList.add('leaving');
    setTimeout(() => {
        welcome.style.display = 'none';
        welcome.classList.remove('leaving');
        let page = document.getElementById('onboarding');
        page.classList.add('visible');
        page.setAttribute('aria-hidden', 'false');
        onboardingIndex = 0;
        renderOnboarding()
    }, 700)
}

function renderOnboarding() {
    document.getElementById('onboarding').dataset.step = String(onboardingIndex);
    let slides = [...document.querySelectorAll('.onboarding-slide')],
        dots = [...document.querySelectorAll('.onboarding-dots button')];
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === onboardingIndex);
        slide.setAttribute('aria-hidden', String(i !== onboardingIndex))
    });
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === onboardingIndex);
        dot.setAttribute('aria-current', String(i === onboardingIndex))
    });
    document.getElementById('onboardingStep').textContent = '0' + (onboardingIndex + 1) + ' / 03';
    document.getElementById('onboardingBack').hidden = onboardingIndex === 0;
    document.getElementById('onboardingNext').textContent = onboardingIndex === slides.length - 1 ? '시작하기' : '다음'
}

function goOnboarding(index) {
    onboardingIndex = Math.max(0, Math.min(2, index));
    renderOnboarding()
}

function nextOnboarding() {
    if (onboardingIndex < 2) {
        onboardingIndex++;
        renderOnboarding()
    } else openAccountChoice()
}

function previousOnboarding() {
    if (onboardingIndex > 0) {
        onboardingIndex--;
        renderOnboarding()
    }
}

function skipOnboarding() {
    openAccountChoice()
}

function openAccountChoice() {
    let page = document.getElementById('onboarding');
    page.classList.remove('visible');
    page.setAttribute('aria-hidden', 'true');
    let flow = document.getElementById('accountFlow');
    flow.classList.add('visible');
    flow.setAttribute('aria-hidden', 'false');
    showAccountView('accountChoice')
}

function showAccountView(id) {
    document.querySelectorAll('.account-view').forEach(view => view.classList.toggle('active', view.id === id))
}

function continueWithoutAccount() {
    let flow = document.getElementById('accountFlow');
    flow.classList.remove('visible');
    flow.setAttribute('aria-hidden', 'true');
    openCharacterSetup()
}

function openCharacterSetup(editing = false) {
    characterEditing = editing;
    document.querySelector('#characterSetup .wizard-step').hidden = editing;
    if (editing) {
        characterBeforeEdit = { ...characterConfig };
        characterReturnNav = document.querySelector('.nav button.active')?.id || 'navHome';
        characterInitialized = false;
        document.querySelectorAll('.nav button').forEach(button => button.classList.remove('active'));
        document.getElementById('navCharacter').classList.add('active');
    }
    document.getElementById('characterCancel').textContent = editing ? '취소' : '처음으로';
    document.getElementById('characterSave').textContent = editing ? '캐릭터 저장하기' : '이 캐릭터로 시작하기';
    let page = document.getElementById('onboarding');
    page.classList.remove('visible');
    page.setAttribute('aria-hidden', 'true');
    let flow = document.getElementById('accountFlow');
    flow.classList.remove('visible');
    flow.setAttribute('aria-hidden', 'true');
    let setup = document.getElementById('characterSetup');
    setup.style.display = 'grid';
    setup.classList.add('visible');
    setup.setAttribute('aria-hidden', 'false');
    renderCharacter()
}

function closeCharacterEditor() {
    const setup = document.getElementById('characterSetup');
    setup.classList.remove('visible', 'leaving');
    setup.style.display = 'none';
    setup.setAttribute('aria-hidden', 'true');
    characterEditing = false;
    document.querySelectorAll('.nav button').forEach(button => button.classList.remove('active'));
    document.getElementById(characterReturnNav).classList.add('active');
    document.getElementById('navCharacter').focus({ preventScroll: true });
}

function cancelCharacterSetup() {
    if (characterEditing) {
        characterConfig = { ...characterBeforeEdit };
        characterInitialized = false;
        closeCharacterEditor();
        return;
    }
    const setup = document.getElementById('characterSetup');
    setup.classList.remove('visible');
    setup.style.display = 'none';
    setup.setAttribute('aria-hidden', 'true');
    document.getElementById('welcome').style.display = 'grid';
    document.getElementById('welcome').setAttribute('aria-hidden', 'false');
}

function completeCharacterSetup() {
    const setup = document.getElementById('characterSetup');
    if (setup.classList.contains('leaving')) return;
    renderCharacter();
    localStorage.setItem('codini-character', JSON.stringify(characterConfig));
    accountNeedsCharacterSetup = false;
    if (characterEditing) {
        document.querySelectorAll('#outfits .look-avatar').forEach((avatar, index) => {
            if (looks[index]) avatar.innerHTML = avatarClothesMarkup(looks[index], index);
        });
        renderCalendar();
        closeCharacterEditor();
        toast('내 캐릭터를 저장했어요. 추천 코디에도 적용돼요!');
        return;
    }
    setup.classList.add('leaving');
    setTimeout(() => {
        setup.classList.remove('visible', 'leaving');
        setup.style.display = 'none';
        setup.setAttribute('aria-hidden', 'true');
        const praise = document.getElementById('characterPraise');
        praise.classList.add('visible');
        praise.setAttribute('aria-hidden', 'false');
        document.getElementById('praiseTitle').focus({
            preventScroll: true
        });
    }, 240);
}

function startAfterCharacterPraise() {
    const praise = document.getElementById('characterPraise');
    praise.classList.remove('visible');
    praise.setAttribute('aria-hidden', 'true');
    const app = document.getElementById('app');
    app.style.display = 'block';
    app.classList.add('slide-in-right');
    autoDate();
    document.getElementById('navHome').focus({
        preventScroll: true
    });
    setTimeout(() => app.classList.remove('slide-in-right'), 360);
    if (typeof maybeStartAccountTour === 'function') maybeStartAccountTour();
}
