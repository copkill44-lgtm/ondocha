// weather.js — Location and weather forecast
function saveKmaKey() {
    let key = $('kmaKey').value.trim();
    if (!key) return;
    sessionStorage.setItem('kma-key', key);
    $('weatherConfig').classList.remove('open');
    getWeather(city, key)
}

function locate() {
    const cached = localStorage.getItem('weather-city');
    if (cached) city = cached;
    if (!navigator.geolocation) {
        weatherStatus('위치 권한을 켜면 지역별 예보를 볼 수 있어요');
        return
    }
    navigator.geolocation.getCurrentPosition(p => {
        city = coords.slice().sort((a, b) => Math.hypot(a[1] - p.coords.latitude, a[2] - p.coords.longitude) - Math.hypot(b[1] - p.coords.latitude, b[2] - p.coords.longitude))[0][0];
        localStorage.setItem('weather-city', city);
        const key = sessionStorage.getItem('kma-key');
        if (key) getWeather(city, key);
        else weatherStatus(city + ' 위치 확인 · 기상청 인증키 연결 필요')
    }, () => weatherStatus(city + ' · 위치 권한을 확인해 주세요'), {
        timeout: 8000,
        maximumAge: 3600000
    })
}

function weatherStatus(text) {
    $('weatherBadge').textContent = text;
    $('skyTitle').textContent = city + ' 오늘의 날씨';
    $('skyDetail').textContent = '기상청 예보를 연결해 체감온도와 함께 코디에 반영해요.'
}

function baseTime() {
    let d = new Date(Date.now() - 20 * 60000),
        h = d.getHours(),
        slots = [2, 5, 8, 11, 14, 17, 20, 23],
        slot = slots.filter(x => x <= h).pop();
    if (slot === undefined) {
        d.setDate(d.getDate() - 1);
        slot = 23
    }
    return {
        date: localDate(d).replaceAll('-', ''),
        time: String(slot).padStart(2, '0') + '00'
    }
}
async function getWeather(which, key) {
    city = which;
    let g = grids[city] || grids.서울,
        b = baseTime(),
        q = new URLSearchParams({
            pageNo: '1',
            numOfRows: '1000',
            dataType: 'JSON',
            base_date: b.date,
            base_time: b.time,
            nx: g[0],
            ny: g[1],
            authKey: key
        });
    try {
        let r = await fetch('https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?' + q),
            j = await r.json(),
            root = j.response || j,
            items = root.body.items.item,
            now = new Date(),
            stamp = localDate(now).replaceAll('-', '') + String(now.getHours()).padStart(2, '0'),
            times = [...new Set(items.map(x => x.fcstDate + x.fcstTime))].filter(x => x >= stamp).sort(),
            t = times[0] || items[0].fcstDate + items[0].fcstTime,
            hour = items.filter(x => x.fcstDate + x.fcstTime === t),
            get = c => hour.find(x => x.category === c)?.fcstValue;
        weatherTemp = Number(get('TMP'));
        let sky = Number(get('SKY')),
            pty = Number(get('PTY')),
            state = pty ? '비/눈 예보' : sky === 1 ? '맑음' : sky === 3 ? '구름 많음' : '흐림';
        $('skyTitle').textContent = city + ' ' + state;
        $('skyDetail').textContent = '기상청 예보 기온 ' + weatherTemp + '°C · ' + t.slice(8, 10) + '시 예보';
        $('weatherBadge').textContent = '기상청 · ' + city + ' ' + weatherTemp + '°C'
    } catch (e) {
        weatherStatus(city + ' · 기상청 연결 실패, 인증키를 확인해 주세요')
    }
}
