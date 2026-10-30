// init.js — Initialize after all feature scripts are loaded
// Authentication must start even if an unrelated form or weather widget fails.
authInitialization = initSupabaseAuth().finally(() => {
    document.documentElement.classList.remove('auth-checking');
});
updateGuestUsage();
let now = new Date();
$('today').textContent = now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일';
$('eventDate').value = localDate(now);
$('eventTime').value = String(now.getHours()).padStart(2, '0') + ':00';
let savedFeel = localStorage.getItem('feel-level');
if (savedFeel) document.querySelectorAll('input[name=feel]').forEach(x => x.checked = x.value === savedFeel);
let feelIndex = ['매우 추워요', '쌀쌀해요', '괜찮아요', '따뜻해요', '더워요'].indexOf(savedFeel);
$('feelSlider').value = feelIndex < 0 ? 1 : feelIndex;
updateFeelFromSlider();
renderCategoryChoices();
initWeatherRegions();
locate();
renderCalendar();
