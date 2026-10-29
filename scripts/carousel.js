// carousel.js — Single-card outfit carousel
let visibleOutfitCard = 0;

function resetOutfitCards() {
    visibleOutfitCard = 0;
    const cards = document.querySelectorAll('#outfits .look');
    const dots = document.getElementById('outfitPagination');
    dots.replaceChildren();
    cards.forEach((card, index) => {
        card.setAttribute('role', 'group');
        card.setAttribute('aria-label', (index + 1) + ' / ' + cards.length);
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'outfit-dot';
        dot.setAttribute('aria-label', (index + 1) + '번째 코디 보기');
        dot.onclick = () => showOutfitCard(index);
        dots.appendChild(dot);
    });
    showOutfitCard(0, false);
}

function moveOutfitCard(delta) {
    showOutfitCard(visibleOutfitCard + delta);
}

function showOutfitCard(index, animate = true) {
    const cards = [...document.querySelectorAll('#outfits .look')];
    if (index < 0 || index >= cards.length) return;
    const direction = index >= visibleOutfitCard ? 1 : -1;
    visibleOutfitCard = index;
    cards.forEach((card, i) => {
        card.hidden = i !== index;
    });
    document.querySelectorAll('#outfitPagination button').forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    document.getElementById('outfitPrevious').disabled = index === 0;
    document.getElementById('outfitNext').disabled = index === cards.length - 1;
    document.getElementById('outfitCount').textContent = (index + 1) + ' / ' + cards.length + ' · 한 장씩 둘러보고 마음에 드는 코디를 골라요';
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cards[index].animate([{
            opacity: 0,
            transform: 'translateX(' + direction * 22 + 'px)'
        }, {
            opacity: 1,
            transform: 'translateX(0)'
        }], {
            duration: 300,
            easing: 'ease-out'
        });
    }
}
const outfitCarousel = document.getElementById('outfitCarousel');
outfitCarousel.addEventListener('keydown', event => {
    if (event.target !== outfitCarousel) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        moveOutfitCard(event.key === 'ArrowLeft' ? -1 : 1);
    }
});
let outfitTouchStart = null;
outfitCarousel.addEventListener('touchstart', event => {
    const t = event.touches[0];
    outfitTouchStart = {
        x: t.clientX,
        y: t.clientY
    };
}, {
    passive: true
});
outfitCarousel.addEventListener('touchend', event => {
    if (!outfitTouchStart) return;
    const t = event.changedTouches[0],
        dx = t.clientX - outfitTouchStart.x,
        dy = t.clientY - outfitTouchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) moveOutfitCard(dx < 0 ? 1 : -1);
    outfitTouchStart = null;
}, {
    passive: true
});
