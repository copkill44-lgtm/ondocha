// state.js — Shared application state
const grids = {
    서울: [60, 127],
    인천: [55, 124],
    대전: [67, 100],
    대구: [89, 90],
    부산: [98, 76],
    광주: [58, 74],
    제주: [52, 38]
};
const coords = [
    ['서울', 37.5665, 126.978],
    ['인천', 37.4563, 126.7052],
    ['대전', 36.3504, 127.3845],
    ['대구', 35.8714, 128.6014],
    ['부산', 35.1796, 129.0756],
    ['광주', 35.1595, 126.8526],
    ['제주', 33.4996, 126.5312]
];
let city = '서울',
    weatherTemp = null,
    looks = [],
    selected = 0,
    events = JSON.parse(localStorage.getItem('ootd-events') || '{}'),
    view = new Date();
const $ = id => document.getElementById(id);
