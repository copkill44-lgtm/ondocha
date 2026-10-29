# 오늘의 코디 온도차

화면 구조, 스타일, 기능별 JavaScript, 이미지를 나누어 관리합니다.
`index.html`을 브라우저로 직접 열거나 정적 호스팅에 올려 실행합니다.

## 폴더 구조

```text
index.html                 화면 구조
styles/                    CSS
scripts/                   기능별 JavaScript
assets/
  images/
    characters/            캐릭터 몸체·피부·머리·코디 미리보기
    mascots/               마스코트와 생각·칭찬 이미지
    onboarding/            온보딩 안내 이미지
    screens/               시작 화면·로그인 배경
  source/                  원본 편집 파일 (배포 제외)
tools/                     경로 검사·배포 폴더 생성 도구
publish-ready/             업로드용 결과물 (자동 생성)
```

## 기능을 수정할 파일

| 파일 | 담당 기능 |
| --- | --- |
| `scripts/state.js` | 공통 상태와 DOM 조회 도우미 |
| `scripts/clothing.js` | 체감온도, 옷 종류·색상·무늬, 직접 추가 |
| `scripts/auth.js` | Supabase 설정, 로그인, 클라우드 저장 |
| `scripts/navigation.js` | 기본 화면 이동, 날짜 초기화, 알림 |
| `scripts/weather.js` | 위치와 기상청 날씨 |
| `scripts/recommendations.js` | 코디 추천 요청, 기본 추천, 코디 선택 |
| `scripts/calendar.js` | 코디 저장, 후기, 캘린더와 날짜 상세 |
| `scripts/transitions.js` | 화면 전환과 날씨 효과 |
| `scripts/character.js` | 온보딩, 캐릭터 설정, 완성·칭찬 화면 |
| `scripts/screen-transitions.js` | 계정 화면 페이드 전환 |
| `scripts/tour.js` | 스포트라이트 사용법 안내 |
| `scripts/carousel.js` | 추천 카드를 한 장씩 넘기기 |
| `scripts/init.js` | 모든 기능을 읽은 뒤 최초 화면 초기화 |

`file://`에서도 열 수 있도록 일반 스크립트를 순서대로 불러옵니다.
HTML의 기존 `onclick` 등 이벤트 연결과 공유 상태를 유지하며,
별도 설치나 빌드 서버가 필요한 ES 모듈 방식으로 바꾸지 않았습니다.
의존 순서는 `index.html` 하단에 있으며 `init.js`는 마지막에 둡니다.
JavaScript에서 사용하는 이미지 경로는 `index.html` 기준입니다.

## 스타일을 수정할 파일

| 파일 | 담당 스타일 |
| --- | --- |
| `styles/base.css` | 공통 색상, 버튼, 폼, 기본 앱·추천 화면 |
| `styles/components.css` | 캐릭터, 캘린더 상세, 옷 선택·후기 등 기존 컴포넌트 |
| `styles/onboarding.css` | 온보딩, 시작 화면, 로그인 |
| `styles/character.css` | 화면 높이에 맞춘 캐릭터 설정·완성 화면 |
| `styles/tour.css` | 스포트라이트, 마스코트, 안내 애니메이션 |
| `styles/carousel.css` | 한 장씩 보는 코디 카드 |
| `styles/calendar.css` | 저장한 코디의 후기 표시 |

기존 디자인을 유지하도록 CSS 선언 순서를 보존했습니다.
CSS의 이미지 경로는 해당 CSS 파일 기준이므로 `../assets/images/...`를 사용합니다.

## 수정한 내용을 배포하기

프로젝트 폴더에서 실행합니다. Python 외 추가 패키지는 필요 없습니다.

```powershell
python tools/check_assets.py
python tools/prepare_publish.py
```

명령은 최신 HTML, CSS, JavaScript, 이미지를 `publish-ready`에 복사하고
`website-publish-ready.zip`을 새로 만듭니다.
`publish-ready`는 생성 전용 폴더이므로 직접 수정하지 마세요.
목록에 없는 이전 배포 파일은 생성 도구에서 정리합니다.

Netlify의 기존 사이트에서 Deploys를 열고 **`publish-ready` 폴더 전체**를
업로드하세요. `index.html`만 업로드하면 분리한 파일들이 누락됩니다.

기존 단일 HTML과 정리 전 배포 파일은 `.backups`에 보관합니다.
`.backups`, `.tools`, 원본 그림 편집 파일은 배포에 포함하지 않습니다.

## 기존 연결 설정

AI 추천은 `/.netlify/functions/recommend`를 호출하며, 이 저장소에는 서버 함수가 없습니다.
서버가 연결되지 않으면 기존 기본 코디 추천을 사용합니다.
Google 로그인은 `scripts/auth.js`의 Supabase 공개 설정과 서비스의 로그인 설정이 필요합니다.
비밀 API 키는 브라우저 코드에 넣지 마세요.
