from pathlib import Path
import unittest
import test_weather as weather_tests

class RegionTests(unittest.TestCase):
    run_js = weather_tests.WeatherTests.run_js
    def setUp(self):
        weather_tests.WeatherTests.setUp(self)
        self.context.eval("document.createElement=()=>({value:'',textContent:''});const originalNode=$;$=id=>{const n=originalNode(id);n.replaceChildren=(...children)=>{n.children=children;};return n;};")
        for name in ['weather-region-data.js','weather-regions.js']:
            self.context.eval(Path('scripts',name).read_text(encoding='utf-8'))
        self.context.eval('initWeatherRegions();')
    def test_all_provinces_available(self):
        self.assertEqual(self.run_js("return $('weatherProvince').children.length;"),17)
    def test_seoul_and_gyeonggi_district_lists(self):
        value=self.run_js("setWeatherRegionSelectors('11');const seoul=$('weatherDistrict').children.length;setWeatherRegionSelectors('13');return [seoul,$('weatherDistrict').children.length];")
        self.assertEqual(value,[26,32])
    def test_changing_province_clears_previous_district(self):
        value=self.run_js("setWeatherRegionSelectors('11',WEATHER_REGIONS[0].districts[0].id);$('weatherProvince').value='13';changeWeatherRegion(true);return [$('weatherDistrict').value,weatherSetupComplete];")
        self.assertEqual(value,['',False])
    def test_confirmed_district_uses_its_coordinates(self):
        value=self.run_js("const p=WEATHER_REGIONS.find(r=>r.id==='13');const d=p.districts.find(r=>r.name==='수원시');setWeatherRegionSelectors(p.id,d.id);await confirmWeatherRegion();return [weatherDestination.label,weatherDestination.latitude===d.latitude,weatherSetupComplete,JSON.parse(localStorage.getItem('weather-region')).districtId===d.id];")
        self.assertEqual(value,['경기도 수원시',True,True,True])
    def test_legacy_city_is_migrated(self):
        value=self.run_js("await restoreWeatherRegion('부산');return [JSON.parse(localStorage.getItem('weather-region')).provinceId,weatherDestination.label];")
        self.assertEqual(value,['10','부산광역시 대표 지역'])
    def test_fallback_cannot_become_confirmed_manual_preference(self):
        value=self.run_js("await restoreWeatherRegion('서울','권한 거부');return [weatherSetupComplete,localStorage.getItem('weather-mode')];")
        self.assertEqual(value,[False,'fallback'])

if __name__=='__main__':unittest.main()
