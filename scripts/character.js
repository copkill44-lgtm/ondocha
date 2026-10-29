// character.js — Onboarding and character setup
let characterConfig = JSON.parse(localStorage.getItem('codini-character') || 'null') || {
    hair: 'open',
    skin: 'default',
    eyes: 'default'
};
let characterInitialized = false;

function renderCharacter() {
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
        img.src = selectedHair[0];
        img.alt = selectedHair[1]
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
    }, 260)
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
    document.getElementById('onboardingNext').textContent = onboardingIndex === slides.length - 1 ? '캐릭터 만들기' : '다음'
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

function authComingSoon() {
    toast('로그인과 회원가입 기능은 준비 중이에요.')
}

function openCharacterSetup() {
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

function completeCharacterSetup() {
    const setup = document.getElementById('characterSetup');
    if (setup.classList.contains('leaving')) return;
    renderCharacter();
    localStorage.setItem('codini-character', JSON.stringify(characterConfig));
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
}
