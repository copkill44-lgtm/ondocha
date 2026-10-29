// transitions.js — Page and weather transitions
function transitionPage(change, direction) {
    const app = $('app');
    app.classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
    app.classList.add('slide-out-' + direction);
    setTimeout(() => {
        change();
        app.classList.remove('slide-out-' + direction);
        app.classList.add('slide-in-' + (direction === 'left' ? 'right' : 'left'));
        setTimeout(() => app.classList.remove('slide-in-left', 'slide-in-right'), 360)
    }, 180)
}
showHome = function() {
    transitionPage(() => {
        $('calendarCard').classList.remove('visible');
        $('recommendCard').style.display = 'block';
        document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
        $('navHome').classList.add('active')
    }, 'right')
};
showCalendar = function() {
    transitionPage(() => {
        $('recommendCard').style.display = 'none';
        $('calendarCard').classList.add('visible');
        document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
        document.getElementById('navCalendar').classList.add('active');
        renderCalendar()
    }, 'left')
};
const originalGetWeather = getWeather;
getWeather = async function(which, key) {
    await originalGetWeather(which, key);
    const title = $('skyTitle').textContent;
    let kind = title.includes('눈') ? 'snowy' : title.includes('비') ? 'rainy' : title.includes('구름') ? 'cloudy' : title.includes('흐림') ? 'overcast' : 'sunny';
    $('sky').dataset.weather = kind
};
