// Chat stays in memory. No API keys or conversation storage in the browser.
let codiniChatHistory=[],codiniChatBusy=false,codiniChatController=null,codiniChatRequest=0,codiniChatOwner=null;
function chatNode(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function chatMessage(role,text){
 const n=chatNode('div','codini-message '+role,text);
 document.getElementById('codiniChatMessages').append(n);
 n.scrollIntoView({block:'nearest',behavior:motionReductionEnabled()?'auto':'smooth'});
 return n;
}
function toggleCodiniChat(force){
 const panel=document.getElementById('codiniChatPanel'),open=typeof force==='boolean'?force:panel.hidden;
 panel.hidden=!open;
 document.getElementById('codiniChatLauncher').setAttribute('aria-expanded',String(open));
 if(open)document.getElementById('codiniChatInput').focus();
 else document.getElementById('codiniChatLauncher').focus({preventScroll:true});
}
function resetCodiniChat(){
 codiniChatRequest++;codiniChatController?.abort();codiniChatController=null;codiniChatBusy=false;codiniChatHistory=[];
 document.getElementById('codiniChatSend').disabled=false;
 document.getElementById('codiniChatInput').disabled=false;
 document.getElementById('codiniChatInput').value='';
 document.getElementById('codiniChatLogin').hidden=true;
 document.getElementById('codiniChatStatus').textContent='';
 document.getElementById('codiniChatMessages').replaceChildren();
 chatMessage('assistant','안녕! 코디니예요 ☁ 오늘 입을 옷이나 색 조합이 고민이라면 물어봐 주세요.');
}
function codiniChatAuthChanged(){
 const owner=currentAuthUser?.id||null;
 if(owner!==codiniChatOwner){codiniChatOwner=owner;if(document.getElementById('codiniChatMessages'))resetCodiniChat();}
}
function codiniChatContext(){
 const outfit=typeof looks!=='undefined'?looks[selected]:null;
 const safe=value=>String(value||'').slice(0,100);
 return {
  temperature:typeof weatherTemp==='number'&&Number.isFinite(weatherTemp)?weatherTemp:null,
  outfit:outfit?{top:safe(outfit.top?.[0]),bottom:safe(outfit.onepiece?.[0]||outfit.bottom?.[0]),outerwear:safe(outfit.outerwear),shoes:safe(outfit.shoes?.[0]),accessory:safe(outfit.accessory)}:null
 };
}
async function sendCodiniChat(event){
 event.preventDefault();
 if(codiniChatBusy)return;
 const input=document.getElementById('codiniChatInput'),status=document.getElementById('codiniChatStatus');
 const text=input.value.trim();
 if(!text)return;
 if([...text].length>1000){status.textContent='질문은 1,000자 이내로 입력해 주세요.';return;}
 if(!currentAuthUser||!supabaseClient){status.textContent='로그인하면 코디니와 AI 채팅을 할 수 있어요.';document.getElementById('codiniChatLogin').hidden=false;return;}
 document.getElementById('codiniChatLogin').hidden=true;
 const owner=currentAuthUser.id,request=++codiniChatRequest;
 codiniChatBusy=true;input.value='';input.disabled=true;document.getElementById('codiniChatSend').disabled=true;
 chatMessage('user',text);status.textContent='코디니가 답변을 생각하고 있어요…';
 const controller=new AbortController();codiniChatController=controller;
 const timer=setTimeout(()=>controller.abort(),40000);
 try{
  const {data,error}=await supabaseClient.auth.getSession();
  if(error||!data.session)throw Error('로그인 상태를 확인하고 다시 시도해 주세요.');
  const response=await fetch(SUPABASE_URL+'/functions/v1/codini-chat',{
   method:'POST',signal:controller.signal,
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY},
   body:JSON.stringify({messages:[...codiniChatHistory.slice(-10),{role:'user',content:text}],context:codiniChatContext()})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
   if(response.status===404)throw Error('AI 채팅 연결을 준비 중이에요. 연결이 완료되면 대화할 수 있어요.');
   throw Error(result.error||'AI 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.');
  }
  if(typeof result.reply!=='string'||!result.reply.trim())throw Error('답변을 받지 못했어요. 다시 시도해 주세요.');
  if(request!==codiniChatRequest||currentAuthUser?.id!==owner)return;
  codiniChatHistory.push({role:'user',content:text},{role:'assistant',content:result.reply});
  codiniChatHistory=codiniChatHistory.slice(-10);
  chatMessage('assistant',result.reply.slice(0,6000));status.textContent='';
 }catch(error){
  if(request!==codiniChatRequest||currentAuthUser?.id!==owner)return;
  status.textContent=error.name==='AbortError'?'답변이 지연되고 있어요. 잠시 후 다시 보내 주세요.':error instanceof TypeError?'AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.':error.message;
  input.value=text;
 }finally{
  clearTimeout(timer);
  if(request===codiniChatRequest){codiniChatBusy=false;codiniChatController=null;input.disabled=false;document.getElementById('codiniChatSend').disabled=false;}
 }
}
function mountCodiniChat(){
 const root=chatNode('aside','codini-chat');root.id='codiniChat';root.hidden=true;
 root.innerHTML='<section id="codiniChatPanel" class="codini-chat-panel" role="dialog" aria-labelledby="codiniChatTitle" hidden><header class="codini-chat-head"><div><strong id="codiniChatTitle">코디니와 이야기하기</strong><span>나의 AI 코디 친구</span></div><button type="button" id="codiniChatReset" aria-label="새 대화">↻</button><button type="button" id="codiniChatClose" aria-label="채팅 닫기">×</button></header><div id="codiniChatMessages" class="codini-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div><div class="codini-chat-suggestions"><button type="button">오늘 날씨에 뭘 입을까?</button><button type="button">이 코디 색 조합은 어때?</button></div><p id="codiniChatStatus" class="codini-chat-status" role="status"></p><button type="button" id="codiniChatLogin" class="codini-chat-login" hidden>로그인하고 대화하기</button><form id="codiniChatForm" class="codini-chat-form"><label class="codini-chat-sr" for="codiniChatInput">코디니에게 질문</label><input id="codiniChatInput" maxlength="1000" placeholder="코디니에게 물어보세요" autocomplete="off" required><button type="submit" id="codiniChatSend" aria-label="질문 보내기">↑</button></form><p class="codini-chat-note">질문과 선택한 코디·기온을 AI에 보내요. 답변은 참고용이에요.</p></section><button type="button" id="codiniChatLauncher" class="codini-chat-launcher" aria-expanded="false" aria-controls="codiniChatPanel"><span>코디니에게 물어봐요</span><img src="assets/images/mascots/onboarding-curious.png" alt="코디니 채팅 열기" width="68" height="68"></button>';
 document.body.append(root);
 document.getElementById('codiniChatLauncher').onclick=()=>toggleCodiniChat();
 document.getElementById('codiniChatClose').onclick=()=>toggleCodiniChat(false);
 document.getElementById('codiniChatReset').onclick=()=>{resetCodiniChat();document.getElementById('codiniChatInput').value='';};
 document.getElementById('codiniChatForm').onsubmit=sendCodiniChat;
 document.getElementById('codiniChatLogin').onclick=()=>{toggleCodiniChat(false);openEmailAuth('loginView');};
 root.querySelectorAll('.codini-chat-suggestions button').forEach(button=>button.onclick=()=>{document.getElementById('codiniChatInput').value=button.textContent;document.getElementById('codiniChatInput').focus();});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('codiniChatPanel').hidden){event.preventDefault();toggleCodiniChat(false);}});
 const visibility=()=>{
  const overlays=['welcome','onboarding','accountFlow','characterSetup','characterPraise'];
  root.hidden=getComputedStyle(document.getElementById('app')).display==='none'||overlays.some(id=>{const n=document.getElementById(id);return n&&getComputedStyle(n).display!=='none'&&n.getAttribute('aria-hidden')!=='true';});
 };
 const observer=new MutationObserver(visibility);
 ['app','welcome','onboarding','accountFlow','characterSetup','characterPraise'].forEach(id=>{const n=document.getElementById(id);if(n)observer.observe(n,{attributes:true,attributeFilter:['style','class','aria-hidden']});});
 visibility();resetCodiniChat();
}
window.addEventListener('pagehide',()=>codiniChatController?.abort());
mountCodiniChat();
