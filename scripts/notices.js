// Notices are published with the site. Read markers belong only to this device.
let siteNotices = [...ONDOCHA_NOTICES], noticeLoadRequest=0, noticeDatabaseReady=false, noticeWriting=false;
const NOTICE_READ_KEY = 'ondocha-notices-read';
let noticeReadIds = new Set();
try { const stored=JSON.parse(localStorage.getItem(NOTICE_READ_KEY)||'[]');if(Array.isArray(stored))noticeReadIds=new Set(stored.filter(id=>typeof id==='string').slice(-300)); } catch {}
function noticeLanguage() { return typeof uiLanguage==='string'&&uiLanguage==='en'?'en':'ko'; }
function noticeText(ko,en) { return noticeLanguage()==='en'?en:ko; }
function noticeNode(tag,cls,text) { const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node; }
function updateNoticeBadge() {
    const unread=siteNotices.filter(notice=>!noticeReadIds.has(notice.id)).length;
    const badge=document.getElementById('noticeUnread');badge.hidden=!unread;badge.textContent=String(unread);
    badge.setAttribute('aria-label',noticeText('읽지 않은 공지 '+unread+'개',unread+' unread notices'));
}
function markNoticeRead(id) {
    noticeReadIds.add(id);
    try{localStorage.setItem(NOTICE_READ_KEY,JSON.stringify([...noticeReadIds].slice(-300)))}catch{}
    updateNoticeBadge();
}
function renderNotices() {
    const lang=noticeLanguage();
    const query=document.getElementById('noticeSearch').value.trim().toLocaleLowerCase();
    const filter=document.getElementById('noticeFilter').value;
    const notices=[...siteNotices].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.date.localeCompare(a.date));
    const filtered=notices.filter(notice=>(filter==='all'||notice.category===filter)&&(!query||(notice[lang].title+' '+notice[lang].body).toLocaleLowerCase().includes(query)));
    const list=document.getElementById('noticeList');list.replaceChildren();
    document.getElementById('noticeCount').textContent=noticeText('총 '+filtered.length+'개의 공지',filtered.length+' notices');
    document.getElementById('noticeEmpty').hidden=filtered.length!==0;
    for(const notice of filtered) {
        const details=noticeNode('details','notice-item');details.dataset.noticeId=notice.id;
        details.classList.toggle('notice-read',noticeReadIds.has(notice.id));
        const summary=noticeNode('summary','notice-summary');
        const text=noticeNode('div','notice-summary-text');
        const labels=noticeNode('div','notice-labels');
        if(notice.pinned)labels.append(noticeNode('span','notice-pinned',noticeText('중요','Pinned')));
        labels.append(noticeNode('span','notice-category',notice.category==='guide'?noticeText('이용 안내','Guide'):noticeText('업데이트','Update')));
        const unread=noticeNode('span','notice-new','NEW');unread.hidden=noticeReadIds.has(notice.id);labels.append(unread);
        text.append(labels,noticeNode('h2','',notice[lang].title));
        const date=noticeNode('time','notice-date',new Intl.DateTimeFormat(lang==='en'?'en-US':'ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(notice.date+'T12:00:00+09:00')));date.dateTime=notice.date;
        const arrow=noticeNode('span','notice-chevron','⌄');arrow.setAttribute('aria-hidden','true');
        summary.append(text,date,arrow);
        const content=noticeNode('div','notice-content',notice[lang].body);
        details.append(summary,content);
        if(typeof isSiteAdmin==='function'&&isSiteAdmin()&&noticeDatabaseReady){
            const actions=noticeNode('div','notice-admin-actions');
            const edit=noticeNode('button','notice-edit',noticeText('수정','Edit'));edit.type='button';edit.onclick=()=>openNoticeComposer(notice);
            const remove=noticeNode('button','notice-delete',noticeText('삭제','Delete'));remove.type='button';remove.onclick=()=>deleteSiteNotice(notice,remove);
            actions.append(edit,remove);details.append(actions);
        }
        details.addEventListener('toggle',()=>{if(details.open){markNoticeRead(notice.id);details.classList.add('notice-read');unread.hidden=true;}});
        list.append(details);
    }
    updateNoticeBadge();
}
function showNotices() {
    if(typeof hideCommunity==='function')hideCommunity();
    document.getElementById('sky').hidden=true;
    document.getElementById('recommendCard').style.display='none';
    document.getElementById('calendarCard').classList.remove('visible');
    document.getElementById('noticesCard').hidden=false;
    document.querySelectorAll('.nav button').forEach(button=>button.classList.toggle('active',button.id==='navNotices'));
    renderNotices();
    loadSiteNotices();
    document.getElementById('noticesTitle').focus({preventScroll:true});
}
function hideNotices() { document.getElementById('noticesCard').hidden=true; }
document.getElementById('noticeSearch').addEventListener('input',renderNotices);
document.getElementById('noticeFilter').addEventListener('change',renderNotices);
window.addEventListener('ondocha-language-change',()=>{updateNoticeBadge();if(!document.getElementById('noticesCard').hidden)renderNotices()});
window.addEventListener('storage',event=>{if(event.key!==NOTICE_READ_KEY)return;try{const ids=JSON.parse(event.newValue||'[]');if(Array.isArray(ids))noticeReadIds=new Set(ids.filter(id=>typeof id==='string'));}catch{}if(!document.getElementById('noticesCard').hidden)renderNotices();else updateNoticeBadge()});
updateNoticeBadge();
async function loadSiteNotices() {
 if(typeof supabaseClient==='undefined'||!supabaseClient)return;
 const request=++noticeLoadRequest,status=document.getElementById('noticeServerStatus');
 status.textContent=noticeText('공지를 불러오고 있어요…','Loading notices…');
 try{
  const {data,error}=await supabaseClient.from('site_notices').select('*').order('pinned',{ascending:false}).order('published_at',{ascending:false}).limit(200);
  if(request!==noticeLoadRequest)return;
  if(error)throw error;
  noticeDatabaseReady=true;
  siteNotices=(data||[]).map(row=>({id:row.id,date:row.published_at.slice(0,10),pinned:row.pinned,category:row.category,ko:{title:row.title_ko,body:row.body_ko},en:{title:row.title_en||row.title_ko,body:row.body_en||row.body_ko},row}));
  status.textContent='';renderNotices();
 }catch{if(request===noticeLoadRequest)status.textContent=noticeText('공지 서버에 연결하지 못했어요. 관리 기능을 사용하려면 관리자 설정 SQL을 적용해 주세요.','Could not load notices. Apply the admin setup SQL to enable management.');}
}
function openNoticeComposer(notice=null) {
 if(!isSiteAdmin())return;
 if(!noticeDatabaseReady){loadSiteNotices();toast(noticeText('공지 서버 연결을 확인한 후 다시 시도해 주세요.','Check the notice server and try again.'));return;}
 const form=document.getElementById('noticeForm');form.reset();form.dataset.noticeId=notice?.id||'';
 document.getElementById('noticeComposerTitle').textContent=noticeText(notice?'공지 수정':'공지 작성',notice?'Edit notice':'New notice');
 for(const [field,value] of Object.entries({noticeTitleKo:notice?.ko.title||'',noticeBodyKo:notice?.ko.body||'',noticeTitleEn:notice?.row?.title_en||'',noticeBodyEn:notice?.row?.body_en||''}))document.getElementById(field).value=value;
 document.getElementById('noticeCategory').value=notice?.category||'update';document.getElementById('noticePinned').checked=notice?.pinned||false;
 document.getElementById('noticeFormStatus').textContent='';document.getElementById('noticeComposer').showModal();
}
async function saveSiteNotice(event) {
 event.preventDefault();if(!isSiteAdmin()||noticeWriting)return;
 const form=event.target;if(!form.reportValidity())return;
 const value=id=>document.getElementById(id).value.trim();
 const payload={title_ko:value('noticeTitleKo'),body_ko:value('noticeBodyKo'),title_en:value('noticeTitleEn'),body_en:value('noticeBodyEn'),category:value('noticeCategory'),pinned:document.getElementById('noticePinned').checked};
 const status=document.getElementById('noticeFormStatus');
 if(!payload.title_ko||!payload.body_ko){status.textContent=noticeText('제목과 내용을 입력해 주세요.','Enter a title and body.');return;}
 const owner=currentAuthUser.id,id=form.dataset.noticeId,button=document.getElementById('noticeSubmit');noticeWriting=true;button.disabled=true;
 try{
  const query=id?supabaseClient.from('site_notices').update(payload).eq('id',id):supabaseClient.from('site_notices').insert({...payload,author_id:owner});
  const {data,error}=await query.select('id');if(error||!data?.length)throw error||Error('denied');
  if(currentAuthUser?.id!==owner)return;
  document.getElementById('noticeComposer').close();await loadSiteNotices();toast(noticeText('공지를 저장했어요.','Notice saved.'));
 }catch{status.textContent=noticeText('저장하지 못했어요. 관리자 권한과 서버 연결을 확인해 주세요.','Could not save. Check your admin permissions and connection.');}
 finally{noticeWriting=false;button.disabled=false;}
}
async function deleteSiteNotice(notice,button) {
 if(!isSiteAdmin()||!noticeDatabaseReady||!confirm(noticeText('이 공지를 삭제할까요?','Delete this notice?')))return;
 const owner=currentAuthUser.id;button.disabled=true;
 try{
  const {data,error}=await supabaseClient.from('site_notices').delete().eq('id',notice.id).select('id');if(error||!data?.length)throw error||Error('denied');
  if(currentAuthUser?.id!==owner)return;
  siteNotices=siteNotices.filter(item=>item.id!==notice.id);renderNotices();toast(noticeText('공지를 삭제했어요.','Notice deleted.'));
 }catch{toast(noticeText('삭제하지 못했어요. 관리자 권한과 서버 연결을 확인해 주세요.','Could not delete. Check permissions and connection.'));}
 finally{button.disabled=false;}
}