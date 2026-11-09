// Picture controls share the existing selects and character save/cancel flow.
let characterPickerCategory = 'hair';
const characterPickerGroups = [
    { key: 'hair', control: 'charHair', label: '머리', title: '어떤 머리가 좋을까요?', icon: '<path d="M4 15V10a8 8 0 0 1 16 0v5l-4-3-2-5-3 5-7 3Z"/><path d="M6 14v6m12-6v6"/>' },
    { key: 'eyes', control: 'charEyes', label: '눈', title: '마음에 드는 눈을 골라요', icon: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>' },
    { key: 'skin', control: 'charSkin', label: '피부톤', title: '나에게 어울리는 피부톤', icon: '<circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/>' }
];
function mountCharacterPicker() {
    if (document.getElementById('characterPicker')) return;
    const fields = document.querySelector('#characterSetup .character-customization');
    if (!fields) return;
    fields.hidden = true;
    const picker = document.createElement('div');
    picker.id = 'characterPicker';
    picker.className = 'character-picker';
    const tabs = document.createElement('div');
    tabs.className = 'character-picker-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '꾸밀 부위');
    characterPickerGroups.forEach((group, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.id = 'character-tab-' + group.key;
        tab.dataset.category = group.key;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', 'characterPickerPanel');
        tab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + group.icon + '</svg><span>' + group.label + '</span>';
        tab.addEventListener('click', () => {
            characterPickerCategory = group.key;
            renderCharacterPickerPanel();
        });
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % characterPickerGroups.length;
            if (event.key === 'ArrowLeft') next = (index + characterPickerGroups.length - 1) % characterPickerGroups.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = characterPickerGroups.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            const target = tabs.children[next];
            target.click();
            target.focus();
        });
        tabs.append(tab);
    });
    const panel = document.createElement('div');
    panel.id = 'characterPickerPanel';
    panel.setAttribute('role', 'tabpanel');
    picker.append(tabs, panel);
    fields.after(picker);
    renderCharacterPickerPanel();
}
function renderCharacterPickerPanel() {
    const panel = document.getElementById('characterPickerPanel');
    if (!panel) return;
    const group = characterPickerGroups.find(item => item.key === characterPickerCategory);
    document.querySelectorAll('.character-picker-tabs button').forEach(tab => {
        const active = tab.dataset.category === group.key;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'character-tab-' + group.key);
    const heading = document.createElement('div');
    heading.className = 'character-picker-heading';
    const title = document.createElement('h2');
    title.textContent = group.title;
    const select = document.getElementById(group.control);
    heading.append(title);
    const grid = document.createElement('div');
    grid.className = 'character-choice-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', group.label + ' 선택');
    Array.from(select.options).forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'character-choice';
        button.dataset.value = option.value;
        button.setAttribute('aria-label', option.textContent);
        const picture = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        picture.setAttribute('viewBox', group.key === 'skin' ? '0 0 896 1792' : '0 0 896 900');
        picture.setAttribute('aria-hidden', 'true');
        picture.classList.add('character-choice-picture');
        ['body', 'face', 'hair'].forEach(layer => {
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.dataset.layer = layer;
            image.setAttribute('width', '896');
            image.setAttribute('height', '1792');
            picture.append(image);
        });
        const name = document.createElement('span');
        name.className = 'character-choice-name';
        name.textContent = option.textContent;
        const check = document.createElement('span');
        check.className = 'character-choice-check';
        check.textContent = '✓';
        check.setAttribute('aria-hidden', 'true');
        button.append(picture, name, check);
        button.addEventListener('click', () => {
            select.value = option.value;
            renderCharacter();
        });
        grid.append(button);
    });
    panel.replaceChildren(heading, grid);
    syncCharacterPicker();
}
function syncCharacterPicker() {
    if (!document.getElementById('characterPicker')) mountCharacterPicker();
    const group = characterPickerGroups.find(item => item.key === characterPickerCategory);
    document.querySelectorAll('.character-choice').forEach(button => {
        button.setAttribute('aria-pressed', String(characterConfig[group.key] === button.dataset.value));
        const layers = characterImageLayers({ ...characterConfig, [group.key]: button.dataset.value });
        button.querySelectorAll('image').forEach(image => image.setAttribute('href', layers[image.dataset.layer]));
    });
}
