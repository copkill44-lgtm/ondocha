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
