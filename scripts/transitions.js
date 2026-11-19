// transitions.js — Page and weather transitions
// Page cards animate themselves, matching Community and Notices.
function transitionPage(change) {
    $('app').classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
    change();
}
showHome = function() {
    transitionPage(() => {
        if (typeof hideNotices === 'function') hideNotices();
        if (typeof hideCommunity === 'function') hideCommunity();
        $('calendarCard').classList.remove('visible');
        $('recommendCard').style.display = 'block';
        document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
        $('navHome').classList.add('active')
    }, 'right')
};
showCalendar = function() {
    transitionPage(() => {
        if (typeof hideNotices === 'function') hideNotices();
        if (typeof hideCommunity === 'function') hideCommunity();
        $('recommendCard').style.display = 'none';
        $('calendarCard').classList.add('visible');
        document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
        document.getElementById('navCalendar').classList.add('active');
        renderCalendar()
    }, 'left')
};
