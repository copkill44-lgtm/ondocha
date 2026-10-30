// Dependent province/district selectors backed by local representative coordinates.
function weatherRegionOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
}

function setWeatherRegionSelectors(provinceId, districtId = '') {
    const province = WEATHER_REGIONS.find(region => region.id === provinceId) || WEATHER_REGIONS[0];
    $('weatherProvince').value = province.id;
    $('weatherDistrict').replaceChildren(
        weatherRegionOption('', '시/도 대표 지역'),
        ...province.districts.map(district => weatherRegionOption(district.id, district.name))
    );
    $('weatherDistrict').value = province.districts.some(district => district.id === districtId) ? districtId : '';
}

function initWeatherRegions() {
    $('weatherProvince').replaceChildren(...WEATHER_REGIONS.map(region => weatherRegionOption(region.id, region.name)));
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem('weather-region'));
    } catch {}
    setWeatherRegionSelectors(saved?.provinceId || '11', saved?.districtId || '');
}

function changeWeatherRegion(provinceChanged = false) {
    if (provinceChanged) setWeatherRegionSelectors($('weatherProvince').value);
    locationRequest++;
    weatherRequest++;
    if (weatherController) weatherController.abort();
    weatherSetupComplete = false;
    weatherTemp = null;
    weatherApparentTemp = null;
    $('skyTitle').textContent = '날씨를 볼 지역을 골라주세요';
    $('skyDetail').textContent = '시/도와 시/군/구를 고르고 ‘이 지역으로 설정’을 눌러주세요.';
    $('weatherBadge').textContent = '지역 설정 대기';
    $('sky').dataset.weather = 'unknown';
    $('sky').setAttribute('aria-busy', 'false');
    notifyWeatherSetup();
}

function applyWeatherRegion(provinceId, districtId = '', notice = '') {
    const province = WEATHER_REGIONS.find(region => region.id === provinceId) || WEATHER_REGIONS[0];
    const district = province.districts.find(region => region.id === districtId);
    const point = district || province;
    const label = province.name + (district ? ' ' + district.name : ' 대표 지역');
    locationRequest++;
    setWeatherRegionSelectors(province.id, district?.id || '');
    try {
        localStorage.setItem('weather-region', JSON.stringify({
            provinceId: province.id,
            districtId: district?.id || ''
        }));
        localStorage.setItem('weather-city', label);
        localStorage.setItem('weather-mode', notice ? 'fallback' : 'manual');
    } catch {}
    return getWeather({
        label,
        latitude: point.latitude,
        longitude: point.longitude,
        source: notice || (district ? '선택 지역 기준' : '시/도 대표 좌표 기준'),
        confirmed: !notice
    });
}

function confirmWeatherRegion() {
    return applyWeatherRegion($('weatherProvince').value, $('weatherDistrict').value);
}

function restoreWeatherRegion(legacyName, notice = '') {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem('weather-region'));
    } catch {}
    if (saved && WEATHER_REGIONS.some(region => region.id === saved.provinceId)) {
        return applyWeatherRegion(saved.provinceId, saved.districtId, notice);
    }
    const province = WEATHER_REGIONS.find(region => region.name === legacyName || region.name.startsWith(legacyName)) || WEATHER_REGIONS[0];
    return applyWeatherRegion(province.id, '', notice);
}
