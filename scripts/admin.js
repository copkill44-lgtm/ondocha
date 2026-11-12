// UI state follows a database RPC; database policies authorize every mutation.
let siteAdmin=false,siteAdminUser=null,siteAdminRequest=0;
function isSiteAdmin() { return siteAdmin && !!currentAuthUser && siteAdminUser===currentAuthUser.id; }
async function adminAuthChanged() {
 const request=++siteAdminRequest,userId=currentAuthUser?.id;
 siteAdmin=false;siteAdminUser=null;refreshAdminUi();
 if(!userId||!supabaseClient)return;
 try{
  const {data,error}=await supabaseClient.rpc('is_site_admin');
  if(request!==siteAdminRequest||currentAuthUser?.id!==userId)return;
  if(!error&&data===true){siteAdmin=true;siteAdminUser=userId;}
 }catch{}finally{if(request===siteAdminRequest)refreshAdminUi();}
}
function refreshAdminUi() {
 const allowed=isSiteAdmin();
 const button=document.getElementById('noticeCreate');if(button)button.hidden=!allowed;
 const badge=document.getElementById('myPageAdminBadge');if(badge)badge.hidden=!allowed;
 if(!allowed)document.getElementById('noticeComposer')?.close();
 if(typeof renderNotices==='function')renderNotices();
 if(typeof renderCommunity==='function')renderCommunity();
}