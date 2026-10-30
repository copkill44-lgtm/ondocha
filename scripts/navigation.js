// navigation.js — Navigation and shared UI helpers
function toast(text) {
    $('toast').textContent = text;
    $('toast').classList.add('show');
    setTimeout(() => $('toast').classList.remove('show'), 2100)
}

function startApp() {
    let welcome = $("welcome");
    welcome.classList.add("leaving");
    setTimeout(() => {
        welcome.style.display = "none";
        $("app").style.display = "block";
        $("app").classList.add("slide-in-right");
        autoDate();
        setTimeout(() => $("app").classList.remove("slide-in-right"), 360)
    }, 280)
}

function autoDate() {
    let d = new Date();
    $("eventDate").value = localDate(d);
    $("eventTime").value = String(d.getHours()).padStart(2, "0") + ":00"
}

function showRecommendationHome() {
    for (const id of ['welcome', 'onboarding', 'accountFlow', 'characterSetup', 'characterPraise']) {
        const screen = document.getElementById(id);
        screen.classList.remove('visible', 'leaving');
        screen.setAttribute('aria-hidden', 'true');
        if (id !== 'accountFlow') screen.style.display = 'none';
    }
    document.getElementById('app').style.display = 'block';
    document.getElementById('recommendCard').style.display = 'block';
    document.getElementById('calendarCard').classList.remove('visible');
    document.querySelectorAll('.nav button').forEach(button => button.classList.remove('active'));
    document.getElementById('navHome').classList.add('active');
    autoDate();
    renderCalendar();
    updateGuestUsage();
    document.getElementById('accountButton').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function showHome() {
    $('calendarCard').classList.remove('visible');
    $('recommendCard').style.display = 'block';
    document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
    $('navHome').classList.add('active')
}

function showCalendar() {
    $('recommendCard').style.display = 'none';
    $('calendarCard').classList.add('visible');
    document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
    renderCalendar()
}
