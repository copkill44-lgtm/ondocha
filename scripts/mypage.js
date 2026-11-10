function openMyPage() {
    syncMotionSettings();
    const user = currentAuthUser;
    const metadata = user?.user_metadata || {};
    document.getElementById('myPageName').textContent = metadata.nickname || metadata.name || metadata.full_name || (user ? '온도차 회원' : '방문자님');
    document.getElementById('myPageEmail').textContent = user?.email?.endsWith('@naver.ondocha.invalid') ? '네이버로 로그인한 계정' : (user?.email || '로그인하면 내 코디를 계정에 저장할 수 있어요.');
    const count = Object.values(events || {}).reduce((total, entries) => total + (Array.isArray(entries) ? entries.length : entries ? 1 : 0), 0);
    document.getElementById('myPageOutfits').textContent = count + '개';
    document.getElementById('myPageFeel').textContent = localStorage.getItem('feel-level') || '아직 설정하지 않았어요';
    document.getElementById('myPageNicknameForm').hidden = !user;
    document.getElementById('myPageNickname').value = metadata.nickname || metadata.name || metadata.full_name || '';
    document.getElementById('myPageNicknameStatus').textContent = '커뮤니티에 공개되는 이름이에요.';
    const action = document.getElementById('myPageAccountAction');
    action.textContent = user ? '로그아웃' : '로그인 / 회원가입';
    action.disabled = authActionBusy;
    const dialog = document.getElementById('myPage');
    if (!dialog.open) dialog.showModal();
}
function closeMyPage() {
    document.getElementById('myPage').close();
}
function myPageNavigate(destination) {
    closeMyPage();
    if (destination === 'character') openCharacterSetup(true);
    else showCalendar();
}
async function myPageAccountAction() {
    if (!currentAuthUser) {
        closeMyPage();
        openEmailAuth('loginView');
        return;
    }
    const button = document.getElementById('myPageAccountAction');
    if (button.disabled) return;
    button.disabled = true;
    try { await logoutAccount(); }
    finally { button.disabled = false; }
}
async function saveMyPageNickname(event) {
    event.preventDefault();
    const input=document.getElementById('myPageNickname');
    const button=document.getElementById('myPageNicknameSave');
    const status=document.getElementById('myPageNicknameStatus');
    if(button.disabled)return;
    if(!currentAuthUser || !supabaseClient){status.textContent='로그인 후 닉네임을 설정할 수 있어요.';return;}
    const nickname=input.value.normalize('NFKC').trim();
    if(!nickname || [...nickname].length>24){status.textContent='닉네임은 1~24자로 입력해 주세요.';input.focus();return;}
    const warning=communityModerationMessage(nickname);
    if(warning){status.textContent=warning;input.focus();return;}
    const userId=currentAuthUser.id;
    button.disabled=true;status.textContent='닉네임을 저장하고 있어요…';
    try{
        const {data,error}=await supabaseClient.auth.updateUser({data:{nickname}});
        if(error)throw error;
        if(currentAuthUser?.id!==userId)return;
        if(!data.user || data.user.id!==userId)throw Error('invalid_user');
        currentAuthUser=data.user;
        document.getElementById('myPageName').textContent=nickname;
        input.value=nickname;
        setAccountUi(currentAuthUser);
        status.textContent='닉네임을 저장했어요. 새 게시물과 댓글에 적용돼요.';
    }catch{
        status.textContent='닉네임을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
    }finally{button.disabled=false;}
}
