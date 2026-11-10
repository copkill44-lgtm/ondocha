// Public outfit feed; database RLS enforces ownership for every write.
const COMMUNITY_PAGE_SIZE = 12;
let communityPosts = [], communityLiked = new Set(), communityPage = 0;
let communityRequest = 0, communityLoading = false, communityDraft = null;
const communityUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function communityElement(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
}
function communityButton(text, action, cls = '') {
    const button = communityElement('button', cls, text);
    button.type = 'button';
    button.addEventListener('click', () => action(button));
    return button;
}
function communityName() {
    const m = currentAuthUser?.user_metadata || {};
    return String(m.nickname || m.name || m.full_name || '코디 친구').trim().slice(0,24) || '코디 친구';
}
function communityRequireLogin() {
    if (currentAuthUser && supabaseClient) return true;
    openEmailAuth('loginView');
    setAuthMessage('loginMessage', '로그인하면 코디를 올리고 댓글과 하트를 남길 수 있어요.', 'info');
    return false;
}
function communityAppearance(config = {}) {
    const allowed = {hair:['open','openLong','tied','tiedLong','openBob','tiedBob'],skin:['default','toneA','toneB'],eyes:['default','normal2','sad','sleepy']};
    return Object.fromEntries(Object.entries(allowed).map(([key, values]) => [key,values.includes(config[key]) ? config[key] : values[0]]));
}
function communityOutfit(outfit = {}) {
    const text = value => String(value || '').slice(0,100), result = {};
    for (const key of ['top','bottom','shoes','onepiece']) if (Array.isArray(outfit[key])) result[key] = [text(outfit[key][0])];
    if (/^#[0-9a-f]{6}$/i.test(outfit.wearColor || '')) result.wearColor = outfit.wearColor;
    result.outerwear = text(outfit.outerwear); result.accessory = text(outfit.accessory);
    return result;
}
function communityOutfitText(x) {
    return [x.onepiece?.[0] || x.top?.[0], x.onepiece ? '' : x.bottom?.[0], x.outerwear,x.shoes?.[0],x.accessory].filter(Boolean).join(' · ');
}
function communityAvatar(post) {
    const stage = communityElement('div','community-outfit-stage');
    stage.innerHTML = renderOutfitAvatar(communityOutfit(post.outfit),post.visual_index,communityAppearance(post.appearance));
    return stage;
}
function communityError(error) {
    if(error?.message?.includes('COMMUNITY_TEXT_BLOCKED')) return '욕설·비하·성적인 표현이 포함되어 있어요. 표현을 바꿔 주세요.';
    if (['42P01','PGRST205','PGRST200'].includes(error?.code)) return '커뮤니티를 준비 중이에요. 잠시 후 다시 확인해 주세요.';
    if (error?.code === '42501') return '로그인 상태를 확인하고 다시 시도해 주세요.';
    return '연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
function showCommunity() {
    document.getElementById('sky').hidden=true;
    document.getElementById('recommendCard').style.display='none';
    document.getElementById('calendarCard').classList.remove('visible');
    document.getElementById('communityCard').hidden=false;
    document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.id==='navCommunity'));
    loadCommunity();
}
function hideCommunity() { document.getElementById('communityCard').hidden=true; document.getElementById('sky').hidden=false; }
function communityAuthChanged() {
    if (!currentAuthUser && document.getElementById('communityComposer')?.open) document.getElementById('communityComposer').close();
    if (document.getElementById('communityCard') && !document.getElementById('communityCard').hidden) loadCommunity();
}
function communitySharedId() {
    const id = new URL(location.href).searchParams.get('community');
    return communityUuid.test(id || '') ? id : null;
}
function openSharedCommunity() {
    if (!communitySharedId()) return;
    for (const id of ['welcome','onboarding','accountFlow','characterSetup','characterPraise']) {
        const s=document.getElementById(id); s.classList.remove('visible');s.style.display='none';s.setAttribute('aria-hidden','true');
    }
    document.getElementById('app').style.display='block';showCommunity();
}
async function loadCommunity(more=false) {
    if (more && communityLoading) return;
    const request=++communityRequest;
    communityLoading=true;
    const status=document.getElementById('communityStatus'),next=document.getElementById('communityMore');
    next.hidden=true;status.textContent='코디를 불러오고 있어요…';
    if (!more) {communityPosts=[];communityPage=0;communityLiked=new Set();renderCommunity();}
    try {
        if (!supabaseClient) throw Error('unavailable');
        const shared=communitySharedId();
        let query=supabaseClient.from('community_posts').select('id,user_id,author_name,caption,outfit,appearance,visual_index,created_at,community_likes(count),community_comments(count)').order('created_at',{ascending:false}).order('id',{ascending:false});
        if (shared) query=query.eq('id',shared);
        const {data,error}=await query.range(communityPage*COMMUNITY_PAGE_SIZE,(communityPage+1)*COMMUNITY_PAGE_SIZE-1);
        if (error) throw error;
        let likes=[];
        const userId=currentAuthUser?.id;
        if (userId && data.length) {
            const r=await supabaseClient.from('community_likes').select('post_id').eq('user_id',userId).in('post_id',data.map(p=>p.id));
            if (r.error) throw r.error;likes=r.data;
        }
        if (request!==communityRequest) return;
        communityPosts.push(...data);likes.forEach(l=>communityLiked.add(l.post_id));communityPage++;
        renderCommunity();
        status.textContent=communityPosts.length?'':shared?'게시물이 삭제되었거나 찾을 수 없어요.':'아직 올라온 코디가 없어요. 첫 코디를 나눠 보세요!';
        next.hidden=!!shared || data.length<COMMUNITY_PAGE_SIZE;
    } catch(error) {if(request===communityRequest) status.textContent=communityError(error);}
    finally {if(request===communityRequest) communityLoading=false;}
}
function renderCommunity() {
    const feed=document.getElementById('communityFeed');feed.replaceChildren();
    communityPosts.forEach(post=>{
        const card=communityElement('article','community-post');card.id='community-post-'+post.id;
        const head=communityElement('div','community-post-head'),author=communityElement('div','community-author');
        author.append(communityElement('span','community-author-badge',String(communityDisplayText(post.author_name)||'코디 친구').slice(0,1)),communityElement('strong','',communityDisplayText(post.author_name)||'코디 친구'));head.append(author);
        if(currentAuthUser?.id===post.user_id) head.append(communityButton('삭제',()=>deleteCommunityPost(post),'community-text-button'));
        const actions=communityElement('div','community-post-actions'),liked=communityLiked.has(post.id);
        const like=communityButton((liked?'♥ ':'♡ ')+(post.community_likes?.[0]?.count||0),b=>toggleCommunityLike(post,b),'community-heart');
        like.setAttribute('aria-label','하트');like.setAttribute('aria-pressed',String(liked));
        const comments=communityElement('section','community-comments');comments.hidden=true;
        const comment=communityButton('댓글 '+(post.community_comments?.[0]?.count||0),b=>toggleCommunityComments(post,comments,b),'community-text-button');comment.setAttribute('aria-expanded','false');
        actions.append(like,comment,communityButton('공유 ↗',()=>shareCommunityPost(post,card),'community-text-button'));
        const date=communityElement('time','community-date');date.dateTime=post.created_at;
        const d=new Date(post.created_at);date.textContent=Number.isNaN(d.getTime())?'':d.toLocaleDateString('ko-KR');
        card.append(head,communityAvatar(post),communityElement('p','community-items',communityOutfitText(communityOutfit(post.outfit))),communityElement('p','community-caption',communityDisplayText(post.caption)),actions,date,comments);
        feed.append(card);
    });
}
async function toggleCommunityLike(post,button) {
    if(!communityRequireLogin()) return;
    const userId=currentAuthUser.id,liked=communityLiked.has(post.id);button.disabled=true;
    try {
        const q=supabaseClient.from('community_likes');
        const r=liked?await q.delete().eq('post_id',post.id).eq('user_id',userId):await q.insert({post_id:post.id,user_id:userId});
        if(r.error) throw r.error;
        if(currentAuthUser?.id!==userId) return;
        liked?communityLiked.delete(post.id):communityLiked.add(post.id);
        const count=Math.max(0,(post.community_likes?.[0]?.count||0)+(liked?-1:1));post.community_likes=[{count}];
        button.textContent=(liked?'♡ ':'♥ ')+count;button.setAttribute('aria-pressed',String(!liked));
    } catch(error){toast(communityError(error));}
    finally{button.disabled=false;}
}
async function deleteCommunityPost(post) {
    if(currentAuthUser?.id!==post.user_id || !confirm(typeof uiText === 'function' ? uiText('이 코디 게시물을 삭제할까요? 댓글과 하트도 함께 삭제돼요.') : '이 코디 게시물을 삭제할까요? 댓글과 하트도 함께 삭제돼요.')) return;
    try {
        const {error}=await supabaseClient.from('community_posts').delete().eq('id',post.id).eq('user_id',currentAuthUser.id);
        if(error) throw error;
        communityPosts=communityPosts.filter(p=>p.id!==post.id);renderCommunity();
        if(!communityPosts.length) document.getElementById('communityStatus').textContent='아직 올라온 코디가 없어요.';
        toast('게시물을 삭제했어요.');
    }catch(error){toast(communityError(error));}
}

async function toggleCommunityComments(post,panel,button) {
    panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden) await renderCommunityComments(post,panel,button);
}
async function renderCommunityComments(post,panel,countButton) {
    panel.replaceChildren(communityElement('p','community-muted','댓글을 불러오고 있어요…'));
    try {
        const {data,error}=await supabaseClient.from('community_comments').select('id,user_id,author_name,body,created_at').eq('post_id',post.id).order('created_at',{ascending:false}).limit(50);
        if(error) throw error;
        panel.replaceChildren();
        if(!data.length) panel.append(communityElement('p','community-muted','첫 댓글을 남겨 보세요.'));
        data.reverse().forEach(comment=>{
            const row=communityElement('div','community-comment');
            row.append(communityElement('strong','',communityDisplayText(comment.author_name)),communityElement('p','',communityDisplayText(comment.body)));
            if(currentAuthUser?.id===comment.user_id) row.append(communityButton('삭제',async button=>{
                button.disabled=true;
                try {
                    const r=await supabaseClient.from('community_comments').delete().eq('id',comment.id).eq('user_id',currentAuthUser.id);
                    if(r.error) throw r.error;
                    post.community_comments=[{count:Math.max(0,(post.community_comments?.[0]?.count||0)-1)}];
                    countButton.textContent='댓글 '+post.community_comments[0].count;
                    await renderCommunityComments(post,panel,countButton);
                }catch(error){toast(communityError(error));button.disabled=false;}
            },'community-text-button'));
            panel.append(row);
        });
        if((post.community_comments?.[0]?.count||0)>50) panel.prepend(communityElement('p','community-muted','최근 댓글 50개를 표시해요.'));
        const form=communityElement('form','community-comment-form'),input=communityElement('input'),submit=communityElement('button','','등록');
        input.placeholder=currentAuthUser?'따뜻한 한마디를 남겨요':'로그인하고 댓글 남기기';
        input.maxLength=300;input.required=true;input.setAttribute('aria-label','댓글 내용');submit.type='submit';
        form.append(input,submit);
        form.addEventListener('submit',async event=>{
            event.preventDefault();
            if(submit.disabled || !communityRequireLogin() || !input.value.trim()) return;
            const warning=communityModerationMessage(input.value)||communityModerationMessage(communityName());
            if(warning){toast(warning);input.focus();return;}
            submit.disabled=true;
            try {
                const r=await supabaseClient.from('community_comments').insert({post_id:post.id,user_id:currentAuthUser.id,author_name:communityName(),body:input.value.trim()});
                if(r.error) throw r.error;
                post.community_comments=[{count:(post.community_comments?.[0]?.count||0)+1}];countButton.textContent='댓글 '+post.community_comments[0].count;
                await renderCommunityComments(post,panel,countButton);
            }catch(error){toast(communityError(error));}
            finally{submit.disabled=false;}
        });
        panel.append(form);
    }catch(error){panel.replaceChildren(communityElement('p','community-muted',communityError(error)));}
}
async function shareCommunityPost(post,card) {
    const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('community',post.id);
    if(navigator.share){
        try{await navigator.share({title:'온도차 · 나의 코디',text:post.caption||'오늘의 코디를 구경해 보세요.',url:url.href});return;}
        catch(error){if(error.name==='AbortError')return;}
    }
    try{await navigator.clipboard.writeText(url.href);toast('게시물 링크를 복사했어요.');}
    catch{
        let input=card.querySelector('.community-share-url');
        if(!input){input=communityElement('input','community-share-url');input.readOnly=true;input.setAttribute('aria-label','공유 링크');card.append(input);}
        input.value=url.href;input.focus();input.select();toast('표시된 링크를 복사해 주세요.');
    }
}
function openCommunityComposer() {
    if(!communityRequireLogin())return;
    if(!looks.length || !looks[selected]){toast('먼저 마음에 드는 코디를 추천받아 주세요.');showHome();return;}
    communityDraft={outfit:communityOutfit(looks[selected]),appearance:communityAppearance(characterConfig),visual_index:Math.abs(Number(selected)||0)%4};
    document.getElementById('communityComposerPreview').replaceChildren(communityAvatar(communityDraft));
    document.getElementById('communityNickname').value=communityName();document.getElementById('communityCaption').value='';
    document.getElementById('communityPublishStatus').textContent='';
    document.getElementById('communityComposer').showModal();
}
async function publishCommunityPost(event) {
    event.preventDefault();
    if(!communityDraft || !communityRequireLogin())return;
    const submit=document.getElementById('communityPublishButton'),status=document.getElementById('communityPublishStatus');
    if(submit.disabled)return;
    submit.disabled=true;status.textContent='코디를 올리고 있어요…';
    try {
        const author=document.getElementById('communityNickname').value.trim();
        if(!author){status.textContent='공개할 닉네임을 입력해 주세요.';return;}
        const warning=communityModerationMessage(author)||communityModerationMessage(document.getElementById('communityCaption').value);
        if(warning){status.textContent=warning;return;}
        const {error}=await supabaseClient.from('community_posts').insert({...communityDraft,user_id:currentAuthUser.id,author_name:author.slice(0,24),caption:document.getElementById('communityCaption').value.trim().slice(0,500)});
        if(error)throw error;
        document.getElementById('communityComposer').close();communityDraft=null;
        const url=new URL(location.href);url.searchParams.delete('community');history.replaceState(null,'',url);
        showCommunity();toast('내 코디를 커뮤니티에 올렸어요!');
    }catch(error){status.textContent=communityError(error);}
    finally{submit.disabled=false;}
}
function showAllCommunity() {
    const url=new URL(location.href);url.searchParams.delete('community');history.replaceState(null,'',url);loadCommunity();
}
