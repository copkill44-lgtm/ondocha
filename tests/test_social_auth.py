import unittest
from pathlib import Path
import test_email_auth as email_tests

class SocialAuthTests(unittest.TestCase):
    setUp = email_tests.EmailAuthTests.setUp
    run_js = email_tests.EmailAuthTests.run_js

    def setUp(self):
        email_tests.EmailAuthTests.setUp(self)
        self.ctx.eval(Path('scripts/social-auth.js').read_text(encoding='utf-8'))
        self.ctx.eval("let oauthCalls=[]; fetch=async()=>({ok:true,json:async()=>({external:{google:true,kakao:true}})}); client.auth.signInWithOAuth=async p=>{oauthCalls.push(p);return {data:{url:'https://accounts.example/authorize'},error:null};};window.location.assign=url=>{calls.redirect=url;};")

    def test_google_and_kakao_preserve_github_pages_path(self):
        for provider in ['google','kakao']:
            result=self.run_js("await startSocialLogin('"+provider+"');return [oauthCalls[oauthCalls.length - 1],calls.redirect,authActionBusy];")
            self.assertEqual(result[0]['provider'],provider)
            self.assertEqual(result[0]['options']['redirectTo'],'https://copkill44-lgtm.github.io/ondocha/')
            self.assertTrue(result[0]['options']['skipBrowserRedirect'])
            self.assertEqual(result[1],'https://accounts.example/authorize')
            self.assertFalse(result[2])

    def test_disabled_provider_stays_on_form(self):
        result=self.run_js("fetch=async()=>({ok:true,json:async()=>({external:{google:false}})});await startSocialLogin('google');return [oauthCalls.length,calls.redirect??null,authActionBusy,document.getElementById('loginMessage').textContent];")
        self.assertEqual(result[:3],[0,None,False]);self.assertIn('준비 중',result[3])

    def test_unconfigured_naver_does_not_redirect(self):
        result=self.run_js("await startSocialLogin('naver','signupMessage');return [oauthCalls.length,document.getElementById('signupMessage').textContent];")
        self.assertEqual(result[0],0);self.assertIn('준비 중',result[1])

    def test_network_failure_does_not_authenticate(self):
        result=self.run_js("fetch=async()=>{throw new Error('offline');};await startSocialLogin('kakao');return [oauthCalls.length,currentAuthUser,authActionBusy];")
        self.assertEqual(result,[0,None,False])

    def test_provider_error_does_not_redirect(self):
        result=self.run_js("client.auth.signInWithOAuth=async()=>({error:{message:'disabled'}});await startSocialLogin('google');return [calls.redirect??null,authActionBusy,document.getElementById('loginMessage').dataset.kind];")
        self.assertEqual(result,[None,False,'error'])

    def test_unknown_provider_ignored(self):
        self.assertEqual(self.run_js("await startSocialLogin('evil');return oauthCalls.length;"),0)
