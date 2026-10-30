// Open-Meteo current conditions. Precise coordinates are never included in cloud saves.
let weatherApparentTemp = null;
let weatherDestination = null;
let weatherRequest = 0;
let locationRequest = 0;
let weatherController = null;

function weatherDescription(code) {
    if (code === 0 || code === 1) return { label: code === 0 ? '맑음' : '대체로 맑음', kind: 'sunny' };
    if (code === 2) return { label: '구름 조금', kind: 'cloudy' };
    if (code === 3) return { label: '흐림', kind: 'overcast' };
    if ([45, 48].includes(code)) return { label: '안개', kind: 'overcast' };
    if ([51, 53, 55, 56, 57].includes(code)) return { label: '이슬비', kind: 'rainy' };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: '비', kind: 'rainy' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '눈', kind: 'snowy' };
    if ([95, 96, 97, 99].includes(code)) return { label: '뇌우', kind: 'stormy' };
    return { label: '현재 날씨', kind: 'unknown' };
}

function toggleWeatherSettings() {
    const panel = $('weatherConfig');
    const open = panel.classList.toggle('open');
    $('weatherSettingsToggle').setAttribute('aria-expanded', String(open));
}

function selectWeatherCity(name, notice = '') {
    const entry = coords.find(item => item[0] === name) || coords[0];
    locationRequest++;
    city = entry[0];
    $('weatherCity').value = city;
    try { localStorage.setItem('weather-city', city); localStorage.setItem('weather-mode', 'manual'); } catch {}
    return getWeather({ label: city, latitude: entry[1], longitude: entry[2], source: notice || '선택한 도시 기준' });
}

function locate(force = false) {
    let savedCity = '서울', manual = false;
    try { savedCity = localStorage.getItem('weather-city') || '서울'; manual = localStorage.getItem('weather-mode') === 'manual'; } catch {}
    if (manual && !force) return selectWeatherCity(savedCity);
    const request = ++locationRequest;
    weatherRequest++;
    if (weatherController) weatherController.abort();
    weatherTemp = null;
    weatherApparentTemp = null;
    $('skyTitle').textContent = '내 위치를 확인하고 있어요';
    $('skyDetail').textContent = '위치를 허용하면 지금 있는 곳의 날씨를 자동으로 알려드려요.';
    $('weatherBadge').textContent = '위치 확인 중';
    $('sky').dataset.weather = 'unknown';
    const fallback = message => {
        if (request !== locationRequest) return;
        $('weatherConfig').classList.add('open');
        $('weatherSettingsToggle').setAttribute('aria-expanded', 'true');
        return selectWeatherCity(savedCity, message + ' · 도시 기준');
    };
    if (!navigator.geolocation) return fallback('위치 확인 불가');
    navigator.geolocation.getCurrentPosition(position => {
        if (request !== locationRequest) return;
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return fallback('위치 확인 불가');
        try { localStorage.setItem('weather-mode', 'auto'); } catch {}
        getWeather({ label: '현재 위치', latitude, longitude, source: '내 위치 기준' });
    }, error => fallback(error.code === 1 ? '위치 권한 꺼짐' : '위치 확인 지연'), {
        timeout: 10000, maximumAge: 300000, enableHighAccuracy: false
    });
}

async function getWeather(destination) {
    weatherDestination = destination;
    const request = ++weatherRequest;
    if (weatherController) weatherController.abort();
    const controller = new AbortController();
    weatherController = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    city = destination.label;
    weatherTemp = null;
    weatherApparentTemp = null;
    $('sky').setAttribute('aria-busy', 'true');
    $('sky').dataset.weather = 'unknown';
    $('skyTitle').textContent = city + ' 날씨를 불러오고 있어요';
    $('skyDetail').textContent = destination.source;
    $('weatherBadge').textContent = '날씨 확인 중';
    const params = new URLSearchParams({
        latitude: destination.latitude, longitude: destination.longitude,
        current: 'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,is_day',
        temperature_unit: 'celsius', wind_speed_unit: 'ms', timezone: 'auto', forecast_days: 1
    });
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: controller.signal });
        if (!response.ok) throw new Error('Weather request failed');
        const data = await response.json();
        const current = data.current;
        if (!current || typeof current.temperature_2m !== 'number' || !Number.isFinite(current.temperature_2m)) throw new Error('Missing temperature');
        if (request !== weatherRequest) return;
        weatherTemp = current.temperature_2m;
        weatherApparentTemp = typeof current.apparent_temperature === 'number' && Number.isFinite(current.apparent_temperature) ? current.apparent_temperature : null;
        const state = weatherDescription(current.weather_code);
        $('sky').dataset.weather = state.kind;
        $('sky').dataset.night = String(current.is_day === 0);
        $('skyTitle').textContent = city + ' ' + state.label + ' ' + Math.round(weatherTemp) + '°C';
        const details = [];
        if (weatherApparentTemp !== null) details.push('체감 ' + Math.round(weatherApparentTemp) + '°C');
        if (typeof current.relative_humidity_2m === 'number') details.push('습도 ' + current.relative_humidity_2m + '%');
        if (typeof current.wind_speed_10m === 'number') details.push('바람 ' + current.wind_speed_10m + 'm/s');
        $('skyDetail').textContent = details.join(' · ');
        const time = typeof current.time === 'string' ? current.time.slice(11, 16) : '';
        $('weatherBadge').textContent = destination.source + (time ? ' · ' + time + ' 기준' : '');
    } catch {
        if (request !== weatherRequest) return;
        weatherTemp = null;
        weatherApparentTemp = null;
        $('sky').dataset.weather = 'unknown';
        $('skyTitle').textContent = city + ' 날씨를 가져오지 못했어요';
        $('skyDetail').textContent = '연결을 확인하고 새로고침을 눌러 주세요. 날씨 없이도 체감온도로 추천받을 수 있어요.';
        $('weatherBadge').textContent = destination.source + ' · 조회 실패';
    } finally {
        clearTimeout(timeout);
        if (request === weatherRequest) $('sky').setAttribute('aria-busy', 'false');
    }
}

function refreshWeather() {
    return weatherDestination ? getWeather(weatherDestination) : locate(true);
}

// Refresh current conditions while the page is visible; manual refresh is also available.
setInterval(() => { if (document.visibilityState === 'visible' && weatherDestination) refreshWeather(); }, 15 * 60 * 1000);
