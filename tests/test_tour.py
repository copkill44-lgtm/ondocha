import unittest
from pathlib import Path
import test_email_auth as auth_tests

class TourTests(unittest.TestCase):
    run_js = auth_tests.EmailAuthTests.run_js
    def setUp(self):
        auth_tests.EmailAuthTests.setUp(self)
        self.ctx.eval("""
        let weatherSetupComplete=false,timers=[];
        function startAfterCharacterPraise(){} function showHome(){}
        function cancelAnimationFrame(){} function requestAnimationFrame(){return 1;}
        class MutationObserver {observe(){}}
        window.matchMedia=()=>({matches:true});
        document.addEventListener=()=>{};
        const originalGetNode=document.getElementById.bind(document);
        document.getElementById=id=>{const node=originalGetNode(id);node.addEventListener=()=>{};return node;};
        document.querySelector=()=>({addEventListener(){},focus(){}});
        """)
        self.ctx.eval(Path('scripts/tour.js').read_text(encoding='utf-8'))
        self.ctx.eval("showFeatureTourStep=()=>updateTourWeatherGate();setTimeout=fn=>{timers.push(fn);return timers.length;};currentAuthUser=user;authDataReady=true;")
    def test_new_account_gets_automatic_tour(self):
        value=self.run_js("maybeStartAccountTour();timers.shift()();return featureTourActive;")
        self.assertTrue(value)
    def test_seen_account_does_not_get_auto_tour(self):
        value=self.run_js("localStorage.setItem('codini-account-tour-seen','1');timers=[];maybeStartAccountTour();return timers.length;")
        self.assertEqual(value,0)
    def test_guest_history_does_not_skip_new_account_tour(self):
        value=self.run_js("localStorage.setItem('codini-tour-seen','1');maybeStartAccountTour();return timers.length;")
        self.assertEqual(value,1)
    def test_next_blocked_without_weather(self):
        value=self.run_js("startFeatureTour();moveFeatureTour(1);return [featureTourIndex,document.getElementById('tourNext').disabled];")
        self.assertEqual(value,[0,True])
    def test_skip_cannot_bypass_weather(self):
        value=self.run_js("startFeatureTour();finishFeatureTour();return [featureTourActive,localStorage.getItem('codini-account-tour-seen')];")
        self.assertEqual(value,[True,None])
    def test_ready_weather_unlocks_next(self):
        value=self.run_js("startFeatureTour();weatherSetupComplete=true;moveFeatureTour(1);return featureTourIndex;")
        self.assertEqual(value,1)
    def test_finished_tour_is_account_scoped_and_synced(self):
        value=self.run_js("startFeatureTour();weatherSetupComplete=true;finishFeatureTour();return [localStorage.getItem('codini-account-tour-seen'),localAppData()['codini-account-tour-seen'],featureTourActive];")
        self.assertEqual(value,['1','1',False])

if __name__=='__main__':unittest.main()
