const COMMUNITY_BLOCKED_WORDS = ["씨발","시발","씨빨","시빨","개새끼","개새기","병신","븅신","좆","지랄","꺼져","닥쳐","창녀","걸레년","한남충","한녀충","틀딱","맘충","섹스","야동","포르노","죽어버려","죽여버릴","ㅅㅂ","ㅆㅂ","ㅂㅅ"];
function communityHasInappropriateText(value) {
 const normalized=String(value||'').normalize('NFKC').toLowerCase().replace(/시발점/g,'');
 const compact=normalized.replace(/[\s\p{P}\p{Cf}]/gu,'');
 return COMMUNITY_BLOCKED_WORDS.some(word=>compact.includes(word.normalize('NFKC'))) || /(^|[^a-z])(fuck(ing|er|s)?|shit|bitch(es)?|porn)([^a-z]|$)/.test(normalized);
}
function communityModerationMessage(value){return communityHasInappropriateText(value)?'욕설·비하·성적인 표현이 포함되어 있어요. 표현을 바꿔 주세요.':'';}
function communityDisplayText(value){return communityHasInappropriateText(value)?'부적절한 표현이 포함되어 내용을 숨겼어요.':String(value||'');}
