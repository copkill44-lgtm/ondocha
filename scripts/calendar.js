// calendar.js — Saved outfits, feedback, and calendar
let feedbackTarget = null;

function openOutfitFeedback(date, index) {
    feedbackTarget = {
        date,
        index
    };
    let modal = document.getElementById('outfitFeedback');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'
}

function closeOutfitFeedback() {
    let modal = document.getElementById('outfitFeedback');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    feedbackTarget = null
}

function rateOutfit(rating) {
    if (!feedbackTarget) return;
    let saved = events[feedbackTarget.date],
        list = Array.isArray(saved) ? saved : [saved];
    if (list[feedbackTarget.index]) {
        list[feedbackTarget.index].rating = rating;
        events[feedbackTarget.date] = list;
        localStorage.setItem('ootd-events', JSON.stringify(events))
    }
    closeOutfitFeedback();
    toast('평가 고마워요! 다음 코디에 참고할게요 💗')
}

function saveLook() {
    if (!looks.length) return;
    let date = $('eventDate').value;
    if (!date) {
        toast('저장할 날짜를 골라주세요');
        return
    }
    let x = looks[selected],
        entry = {
            name: $('eventName').value || '오늘의 코디',
            time: $('eventTime').value || '',
            outfit: (x.onepiece ? x.onepiece[0] : x.top[0] + ' · ' + x.bottom[0]) + (x.accessory ? ' · 액세서리 ' + x.accessory : '') + ' · ' + x.shoes[0],
            look: JSON.parse(JSON.stringify(x)),
            character: characterConfig.gender || 'female'
        };
    if (!Array.isArray(events[date])) events[date] = events[date] ? [events[date]] : [];
    events[date].push(entry);
    localStorage.setItem('ootd-events', JSON.stringify(events));
    let entryIndex = events[date].length - 1;
    toast('선택한 코디를 캘린더에 저장했어요 📅');
    document.getElementById('suggest').classList.remove('show');
    showCalendar();
    setTimeout(() => openOutfitFeedback(date, entryIndex), 240)
}

function shiftMonth(n) {
    view.setMonth(view.getMonth() + n);
    renderCalendar()
}

function escapeCalendarText(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c]))
}

function outfitFromSaved(item) {
    if (item.look) return item.look;
    let parts = String(item.outfit || '').split(' · ').filter(Boolean),
        shoeName = parts.length > 1 ? parts[parts.length - 1] : '운동화',
        shoeIcon = /부츠/.test(shoeName) ? '👢' : /로퍼|메리제인/.test(shoeName) ? '👞' : '👟';
    if (parts.some(p => p.includes('원피스'))) {
        let dress = parts.find(p => p.includes('원피스')) || parts[0];
        return {
            onepiece: [dress, '👗'],
            bottom: ['원피스', ''],
            shoes: [shoeName, shoeIcon]
        }
    }
    let top = parts[0] || '상의',
        bottom = parts[1] || '하의',
        topIcon = /니트/.test(top) ? '🧶' : /가디건/.test(top) ? '🧥' : /블라우스/.test(top) ? '👚' : /맨투맨/.test(top) ? '👕' : '👚',
        bottomIcon = /치마|스커트/.test(bottom) ? '👗' : '👖';
    return {
        top: [top, topIcon],
        bottom: [bottom, bottomIcon],
        shoes: [shoeName, shoeIcon]
    }
}

function savedOutfitMarkup(item) {
    let x = outfitFromSaved(item),
        body = x.onepiece ? x.onepiece[1] : x.top[1],
        name = x.onepiece ? x.onepiece[0] : x.top[0] + ' · ' + x.bottom[0],
        bottom = x.onepiece ? '' : x.bottom[1];
    return '<div class="saved-outfit"><div class="saved-stage"><div class="look-avatar gender-' + (item.character || characterConfig.gender || "female") + '">' + avatarClothesMarkup(x, 0) + '</div></div><div class="saved-outfit-names">' + escapeCalendarText(name) + '<br>' + escapeCalendarText(x.shoes[0]) + (x.accessory ? '<br>액세서리 ' + escapeCalendarText(x.accessory) : '') + '</div></div>'
}

function savedFeedbackMarkup(item) {
    const ratings = {
        '좋았어요': {
            icon: '💗',
            tone: 'happy'
        },
        '보통이에요': {
            icon: '🙂',
            tone: 'neutral'
        },
        '아쉬웠어요': {
            icon: '🛠️',
            tone: 'sad'
        }
    };
    const feedback = ratings[item.rating];
    if (!feedback) return '<div class="saved-feedback empty"><span>내가 남긴 후기</span><span>아직 남긴 후기가 없어요</span></div>';
    return '<div class="saved-feedback ' + feedback.tone + '"><span>내가 남긴 후기</span><strong>' + feedback.icon + ' ' + escapeCalendarText(item.rating) + '</strong></div>';
}

function openCalendarDay(key) {
    let date = new Date(key + 'T12:00:00');
    $('detailDate').textContent = date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
    let saved = events[key] || [],
        list = Array.isArray(saved) ? saved : [saved],
        box = $('detailEvents');
    box.innerHTML = list.length ? list.map(item => '<article class="detail-event"><h3>' + escapeCalendarText(item.name || '오늘의 코디') + '</h3>' + (item.time ? '<span class="detail-time">' + escapeCalendarText(item.time) + '</span>' : '') + savedOutfitMarkup(item) + savedFeedbackMarkup(item) + '</article>').join('') : '<div class="detail-empty">이 날짜에는 저장된 코디가 없어요.<br>코디 추천에서 마음에 드는 옷을 캘린더에 담아보세요.</div>';
    let modal = $('dayDetail');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('dayDetail').querySelector('.day-detail-close').focus()
}

function closeCalendarDay() {
    let modal = $('dayDetail');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''
}

function renderCalendar() {
    let y = view.getFullYear(),
        m = view.getMonth(),
        first = new Date(y, m, 1).getDay(),
        count = new Date(y, m + 1, 0).getDate(),
        now = new Date();
    $('monthTitle').textContent = y + '년 ' + (m + 1) + '월';
    let html = ['일', '월', '화', '수', '목', '금', '토'].map(x => '<div class="dow">' + x + '</div>').join('');
    for (let i = 0; i < first; i++) html += '<div class="day empty"></div>';
    for (let d = 1; d <= count; d++) {
        let k = localDate(new Date(y, m, d)),
            saved = events[k] || [],
            arr = Array.isArray(saved) ? saved : [saved];
        html += '<button type="button" class="day ' + (now.getFullYear() === y && now.getMonth() === m && now.getDate() === d ? 'today' : '') + '" data-date="' + k + '">' + d + (arr.length ? '<span class="event" title="' + escapeCalendarText(arr[0].name) + '"><strong>' + (arr[0].time ? escapeCalendarText(arr[0].time) + ' ' : '') + escapeCalendarText(arr[0].name) + '</strong>' + (arr[0].outfit ? '<small class="event-outfit">' + escapeCalendarText(arr[0].outfit) + '</small>' : '') + '</span>' : '') + (arr.length > 1 ? '<span class="event-more" title="날짜를 눌러 나머지 일정을 확인하세요">+' + (arr.length - 1) + ' 더 보기</span>' : '') + '</button>'
    }
    $('calendarGrid').innerHTML = html;
    document.querySelectorAll('.day[data-date]').forEach(button => button.addEventListener('click', () => openCalendarDay(button.dataset.date)))
}
