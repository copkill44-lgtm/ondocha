from pathlib import Path
import json
import unittest
import quickjs

BOOT = r"""
const nodes={};
function $(id){return nodes[id]||(nodes[id]={textContent:'',value:'',dataset:{},setAttribute(){},classList:{add(){},toggle(){return true;}}});}
let city='Seoul',weatherTemp=null;
const coords=[['Seoul',37.5665,126.978],['Busan',35.1796,129.0756]];
const storage={};const localStorage={getItem(k){return storage[k]??null},setItem(k,v){storage[k]=String(v)}};
const navigator={};const document={visibilityState:'visible'};
function setTimeout(){return 1} function clearTimeout(){} function setInterval(){}
class AbortController{constructor(){this.signal={}}abort(){}}
class URLSearchParams{constructor(value){this.value=value}toString(){return Object.entries(this.value).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&')}}
let requests=[];
let response={current:{temperature_2m:14.7,apparent_temperature:13.7,weather_code:61,relative_humidity_2m:67,wind_speed_10m:1.25,is_day:1,time:'2026-10-30T18:15'}};
let fail=false;
async function fetch(url){requests.push(url);if(fail)throw Error('offline');return {ok:true,json:async()=>response};}
"""

class WeatherTests(unittest.TestCase):
    def setUp(self):
        self.context=quickjs.Context()
        self.context.eval(BOOT)
        self.context.eval(Path('scripts/weather.js').read_text(encoding='utf-8'))
    def run_js(self,body):
        self.context.eval('var done=false,result=null,failure=null;(async()=>{'+body+'})().then(v=>{result=v;done=true},e=>{failure=String(e);done=true});')
        for _ in range(200):
            if self.context.eval('done'): break
            self.context.execute_pending_job()
        self.assertTrue(self.context.eval('done'))
        self.assertIsNone(self.context.eval('failure'))
        return json.loads(self.context.eval('JSON.stringify(result)'))
    def test_current_weather_updates_temperature_and_animation(self):
        value=self.run_js("await selectWeatherCity('Seoul');return [weatherTemp,weatherApparentTemp,$('sky').dataset.weather,requests[0]];")
        self.assertEqual(value[:3],[14.7,13.7,'rainy'])
        self.assertIn('latitude=37.5665',value[3])
        self.assertNotIn('apikey',value[3])
    def test_zero_temperature_is_valid(self):
        value=self.run_js("response.current.temperature_2m=0;await selectWeatherCity('Seoul');return weatherTemp;")
        self.assertEqual(value,0)
    def test_failed_request_clears_previous_temperature(self):
        value=self.run_js("await selectWeatherCity('Seoul');fail=true;await selectWeatherCity('Busan');return [weatherTemp,weatherApparentTemp];")
        self.assertEqual(value,[None,None])
    def test_null_temperature_is_not_treated_as_zero(self):
        value=self.run_js("response.current.temperature_2m=null;await selectWeatherCity('Seoul');return weatherTemp;")
        self.assertIsNone(value)
    def test_denied_location_uses_labeled_city_fallback(self):
        value=self.run_js("navigator.geolocation={getCurrentPosition(ok,fail){fail({code:1})}};locate();await Promise.resolve();await Promise.resolve();return [requests.length,weatherDestination.label,weatherDestination.source];")
        self.assertEqual(value[:2],[1,'Seoul'])
        self.assertNotEqual(value[2],'')
    def test_gps_coordinates_are_used_instead_of_city_center(self):
        value=self.run_js("navigator.geolocation={getCurrentPosition(ok){ok({coords:{latitude:37.1234,longitude:127.5678}})}};locate(true);await Promise.resolve();return requests[0];")
        self.assertIn('latitude=37.1234',value)
        self.assertIn('longitude=127.5678',value)
    def test_manual_choice_wins_over_late_location_callback(self):
        value=self.run_js("let success;navigator.geolocation={getCurrentPosition(ok){success=ok}};locate(true);await selectWeatherCity('Busan');success({coords:{latitude:37.1,longitude:127.1}});return [requests.length,weatherDestination.label];")
        self.assertEqual(value,[1,'Busan'])
    def test_saved_manual_city_skips_location_prompt(self):
        value=self.run_js("localStorage.setItem('weather-mode','manual');localStorage.setItem('weather-city','Busan');await locate();return [weatherDestination.label,requests.length];")
        self.assertEqual(value,['Busan',1])
    def test_denied_location_does_not_complete_tour_requirement(self):
        value=self.run_js("navigator.geolocation={getCurrentPosition(ok,fail){fail({code:1})}};locate();await Promise.resolve();await Promise.resolve();return weatherSetupComplete;")
        self.assertFalse(value)
    def test_explicit_city_confirmation_completes_requirement(self):
        value=self.run_js("await selectWeatherCity('Seoul');return weatherSetupComplete;")
        self.assertTrue(value)
    def test_failed_weather_does_not_complete_requirement(self):
        value=self.run_js("fail=true;await selectWeatherCity('Seoul');return weatherSetupComplete;")
        self.assertFalse(value)
    def test_weather_codes(self):
        value=self.run_js("return [weatherDescription(0).kind,weatherDescription(3).kind,weatherDescription(75).kind,weatherDescription(95).kind,weatherDescription(999).kind];")
        self.assertEqual(value,['sunny','overcast','snowy','stormy','unknown'])

if __name__=='__main__':unittest.main()
