// Keep picture selection and layout together, including phone desktop-view mode.
function refreshOnboardingLayout() {
    const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    const deviceWidth = Math.min(screen.width, screen.height);
    const portraitViewport = window.innerHeight >= window.innerWidth;
    const portraitArtwork = portraitViewport && (matchMedia('(max-width: 900px)').matches ||
        (touchDevice && deviceWidth > 0 && deviceWidth <= 900));
    document.documentElement.classList.toggle('onboarding-portrait', portraitArtwork);
    document.querySelectorAll('#onboarding .onboard-picture').forEach(picture => {
        const source = picture.querySelector('source');
        const image = picture.querySelector('img');
        if (!source || !image) return;
        if (!image.dataset.desktopSrc) image.dataset.desktopSrc = image.getAttribute('src');
        source.media = portraitArtwork ? 'all' : 'not all';
        const target = portraitArtwork ? source.getAttribute('srcset') : image.dataset.desktopSrc;
        if (image.getAttribute('src') !== target) image.src = target;
    });
}
refreshOnboardingLayout();
window.addEventListener('resize', refreshOnboardingLayout);
window.addEventListener('pageshow', refreshOnboardingLayout);
window.addEventListener('orientationchange', refreshOnboardingLayout);
