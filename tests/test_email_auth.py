from pathlib import Path
import sys, json, unittest
import quickjs

BOOT = r"""
class Storage { constructor(){this.data={};} getItem(k){return this.data[k]??null;} setItem(k,v){this.data[k]=String(v);} removeItem(k){delete this.data[k];} }
const localStorage=new Storage(), sessionStorage=new Storage();
const nodes={};
function element(id=''){return {id,value:'',textContent:'',hidden:false,dataset:{},style:{display:'none'},
 classList:{add(){},remove(){},contains(){return false;}},setAttribute(){},focus(){},replaceChildren(){},
 reportValidity(){return true;},querySelectorAll(){return [];}};}
const document={getElementById(id){return nodes[id]||(nodes[id]=element(id));}, querySelectorAll(){return [];}};
const window=globalThis;
window.location={href:'https://copkill44-lgtm.github.io/ondocha/',origin:'https://copkill44-lgtm.github.io',pathname:'/ondocha/',protocol:'https:',hash:'',reload(){calls.reload++;}};
window.history={replaceState(){}};
class URLSearchParams {
 constructor(s=''){this.data={};s.replace(/^\?/,'').split('&').filter(Boolean).forEach(x=>{const [k,v]=x.split('=');this.data[k]=v;});}
 get(k){return this.data[k]??null;} set(k,v){this.data[k]=v;} delete(k){delete this.data[k];}
 toString(){return Object.entries(this.data).map(([k,v])=>k+'='+v).join('&');}
}
class URL {
 constructor(s){const [base,hash='']=s.split('#'),[path,query='']=base.split('?'); const m=path.match(/^(https?:\/\/[^/]+)(.*)$/);this.origin=m?m[1]:'';this.pathname=m?m[2]:path;this.hash=hash?'#'+hash:'';this.searchParams=new URLSearchParams(query);}
 get href(){const q=this.searchParams.toString();return this.origin+this.pathname+(q?'?'+q:'')+this.hash;}
}
let calls={signUp:0,signIn:0,update:0,reset:0,save:0,reload:0,setup:0};
let messages=[],lastView='',remoteRow=null,cloudError=null;
let events={},characterConfig={},characterInitialized=false,customCategories=[],customTopCategories=[],customAccessoryCategories=[],categoryOptions=[],baseCategories=[],clothingPreferences={},looks=[],selected=0;
function renderCategoryChoices(){} function updateFeelFromSlider(){} function renderCalendar(){}
function openCharacterSetup(){calls.setup++;} function showAccountView(id){lastView=id;}
function toast(s){messages.push(s);} function setTimeout(){return 0;} function clearTimeout(){}
const ONDOCHA_CONFIG={supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'};
const user={id:'account-a',email:'person@example.com'};
let authResponse={data:{session:{user}},error:null},signupResponse={data:{session:null,user},error:null};
const client={auth:{
 signInWithPassword:async payload=>{calls.signIn++;calls.loginPayload=payload;return authResponse;},
 signUp:async payload=>{calls.signUp++;calls.signupPayload=payload;return signupResponse;},
 resetPasswordForEmail:async(email,options)=>{calls.reset++;calls.resetOptions=options;return {error:null};},
 getSession:async()=>authResponse,
 updateUser:async payload=>{calls.update++;calls.updatePayload=payload;return {data:{user},error:null};},
 signOut:async()=>({error:null}),onAuthStateChange:callback=>{calls.authCallback=callback;}
},from(){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:remoteRow,error:cloudError}),upsert:async payload=>{calls.save++;calls.saved=payload;return {error:null};}};}};
window.supabase={createClient(){return client;}};
function submitEvent(id){return {preventDefault(){},currentTarget:document.getElementById(id)};}
"""

class EmailAuthTests(unittest.TestCase):
 def setUp(self):
  self.ctx=quickjs.Context();self.ctx.eval(BOOT)
  for name in ['auth.js','auth-forms.js']:self.ctx.eval(Path('scripts',name).read_text(encoding='utf-8'))
  self.ctx.eval('supabaseClient=client;authInitialization=Promise.resolve();')
 def run_js(self,body):
  self.ctx.eval('var result=null,done=false,failure=null;(async()=>{'+body+'})().then(value=>{result=value;done=true;},error=>{failure=String(error);done=true;});')
  for _ in range(200):
   if self.ctx.eval('done'):break
   self.ctx.execute_pending_job()
  self.assertTrue(self.ctx.eval('done'))
  self.assertIsNone(self.ctx.eval('failure'))
  return json.loads(self.ctx.eval('JSON.stringify(result)'))
 def test_unconfigured_login_is_not_success(self):
  result=self.run_js("supabaseClient=null;window.supabase=undefined;await submitEmailLogin(submitEvent('loginForm'));return [calls.signIn,currentAuthUser,document.getElementById('loginMessage').textContent];")
  self.assertEqual(result[:2],[0,None]);self.assertIn('불러오지 못',result[2])
 def test_failed_session_restore_keeps_signup_client(self):
  result=self.run_js("client.auth.getSession=async()=>{throw new Error('refresh failed');};await initSupabaseAuth();return [supabaseClient===client,authInitializationError.length>0];")
  self.assertEqual(result,[True,True])
 def test_login_retries_initialization_if_it_was_skipped(self):
  result=self.run_js("supabaseClient=null;await submitEmailLogin(submitEvent('loginForm'));return [calls.signIn,currentAuthUser.id];")
  self.assertEqual(result,[1,'account-a'])
 def test_signup_password_mismatch_does_not_call_service(self):
  result=self.run_js("document.getElementById('signupPassword').value='password1';document.getElementById('signupPasswordConfirm').value='password2';await submitEmailSignup(submitEvent('signupForm'));return [calls.signUp,document.getElementById('signupMessage').textContent];")
  self.assertEqual(result[0],0);self.assertIn('같지',result[1])
 def test_signup_confirmation_required(self):
  result=self.run_js("document.getElementById('signupEmail').value=' person@example.com ';document.getElementById('signupPassword').value='password1';document.getElementById('signupPasswordConfirm').value='password1';await submitEmailSignup(submitEvent('signupForm'));return [calls.signUp,currentAuthUser,calls.signupPayload,document.getElementById('signupMessage').dataset.kind];")
  self.assertEqual(result[0],1);self.assertIsNone(result[1]);self.assertEqual(result[2]['email'],'person@example.com');self.assertEqual(result[2]['options']['emailRedirectTo'],'https://copkill44-lgtm.github.io/ondocha/');self.assertEqual(result[3],'success')
 def test_login_rejection_never_signs_in(self):
  result=self.run_js("authResponse={data:{session:null},error:{code:'invalid_credentials'}};await submitEmailLogin(submitEvent('loginForm'));return [currentAuthUser,document.getElementById('loginMessage').textContent,authActionBusy];")
  self.assertIsNone(result[0]);self.assertIn('비밀번호',result[1]);self.assertFalse(result[2])
 def test_success_preserves_password_whitespace_and_saves_no_password(self):
  result=self.run_js("document.getElementById('loginEmail').value=' person@example.com ';document.getElementById('loginPassword').value=' password1 ';await submitEmailLogin(submitEvent('loginForm'));return [currentAuthUser.id,calls.loginPayload,JSON.stringify(calls.saved),calls.setup];")
  self.assertEqual(result[0],'account-a');self.assertEqual(result[1]['password'],' password1 ');self.assertEqual(result[1]['email'],'person@example.com');self.assertNotIn('password1',result[2]);self.assertEqual(result[3],1)
 def test_reset_redirect_stays_under_pages_project(self):
  result=self.run_js("document.getElementById('resetEmail').value='person@example.com';await submitPasswordReset(submitEvent('resetPasswordForm'));return calls.resetOptions;")
  self.assertEqual(result['redirectTo'],'https://copkill44-lgtm.github.io/ondocha/?auth=recovery')
 def test_expired_recovery_cannot_change_password(self):
  result=self.run_js("authRecoveryMode=true;authResponse={data:{session:null},error:null};document.getElementById('newPassword').value='newpassword1';document.getElementById('newPasswordConfirm').value='newpassword1';await submitNewPassword(submitEvent('updatePasswordForm'));return [calls.update,document.getElementById('updateMessage').textContent];")
  self.assertEqual(result[0],0);self.assertIn('만료',result[1])
 def test_valid_recovery_updates_then_returns_to_login(self):
  result=self.run_js("authRecoveryMode=true;currentAuthUser=user;document.getElementById('newPassword').value='newpassword1';document.getElementById('newPasswordConfirm').value='newpassword1';await submitNewPassword(submitEvent('updatePasswordForm'));return [calls.update,lastView,currentAuthUser,authRecoveryMode];")
  self.assertEqual(result,[1,'loginView',None,False])
 def test_account_change_cannot_upload_previous_account_data(self):
  result=self.run_js("localStorage.setItem('codini-data-owner','old-account');localStorage.setItem('ootd-events','{\"private\":\"old\"}');await processAuthUser(user);return [events,calls.saved.data,localStorage.getItem('codini-data-owner')];")
  self.assertEqual(result[0],{});self.assertNotIn('ootd-events',result[1]);self.assertEqual(result[2],'account-a')
 def test_cloud_read_failure_blocks_upload(self):
  result=self.run_js("cloudError={code:'42501'};await processAuthUser(user);await saveCloudState();return [authDataReady,calls.save];")
  self.assertEqual(result,[False,0])

if __name__=='__main__':unittest.main(verbosity=2)
