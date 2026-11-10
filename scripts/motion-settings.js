// This preference belongs to the browser, so it also works for guests.
const MOTION_PREFERENCE_KEY='ondocha-motion-preference';
let motionPreference=null;
try{motionPreference=localStorage.getItem(MOTION_PREFERENCE_KEY);}catch{}
const systemMotionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
function motionReductionEnabled(){
 return motionPreference==='off' || (motionPreference!=='on' && systemMotionPreference.matches);
}
function syncMotionSettings(){
 const input=document.getElementById('disableAnimations');
 if(input)input.checked=motionReductionEnabled();
}
function applyMotionPreference(){
 const reduce=motionReductionEnabled();
 document.documentElement.classList.toggle('reduce-motion',reduce);
 if(reduce && document.getAnimations){
  document.getAnimations().forEach(animation=>{try{animation.finish();}catch{animation.cancel();}});
 }
 syncMotionSettings();
}
function setAnimationsDisabled(disabled){
 motionPreference=disabled?'off':'on';
 try{localStorage.setItem(MOTION_PREFERENCE_KEY,motionPreference);}catch{}
 applyMotionPreference();
}
systemMotionPreference.addEventListener('change',applyMotionPreference);
window.addEventListener('storage',event=>{
 if(event.key===MOTION_PREFERENCE_KEY || event.key===null){motionPreference=event.newValue;applyMotionPreference();}
});
applyMotionPreference();
