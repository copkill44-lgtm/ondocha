# AI 착장 이미지 설정

로그인하고 코디 추천을 받으면 첫 코디의 AI 이미지를 자동 생성합니다. 다른 코디는 카드의 버튼을 누르세요. 캐릭터의 몸과 머리 이미지를 합쳐 참고 이미지로 전송합니다.

1. Supabase에서 supabase/functions/outfit-image/index.ts를 outfit-image 함수로 배포하세요.
2. Edge Function Secrets에 GEMINI_API_KEY를 등록하세요. 브라우저 코드에 키를 넣지 마세요.
3. ALLOWED_ORIGINS에 사이트 origin을 등록하세요. 예: https://example.com,http://localhost:8000 (끝 슬래시 제외).
4. 기본 모델은 gemini-2.5-flash-image입니다. GEMINI_IMAGE_MODEL로 변경할 수 있습니다. 해당 모델 권한과 API 결제가 필요합니다.
5. HTTP 서버에서 사이트를 열고 로그인한 뒤 추천받기로 확인하세요.

이미지는 현재 결과 화면에서만 유지합니다. 캘린더에는 기존 캐릭터 미리보기와 옷 정보를 저장합니다. AI가 캐릭터와 옷 세부를 완벽하게 보존하지는 않을 수 있습니다.

기존 텍스트 추천 서버 /.netlify/functions/recommend는 이 저장소에 없습니다. 연결 실패 시 기본 코디를 사용하며 그 옷 설명으로 AI 이미지를 만듭니다.

로그인 검증과 브라우저 중복 요청 방지를 구현했습니다. 공개 운영 전 서버에서 계정별 생성 한도를 추가하세요. 이미지 생성에는 API 비용이 발생합니다.

공식 문서: https://ai.google.dev/gemini-api/docs/image-generation

## Google AI Studio로 전환

AI Studio에서 발급받은 키를 Supabase Secrets의 GEMINI_API_KEY에 등록합니다. ALLOWED_ORIGINS는 기존 값을 유지합니다. 변경한 서버 파일을 Supabase의 outfit-image 함수 안 index.ts에 붙여넣고 다시 배포하세요. 사이트의 scripts/outfit-images.js도 최신 파일을 사용해야 합니다.

Google 이미지 생성 API는 무료 사용을 보장하지 않습니다. 기본 모델 gemini-2.5-flash-image는 공식 요금표상 무료 티어가 없으므로 프로젝트 결제 및 사용 한도를 확인하세요. 이 모델은 2027년 3월 15일 종료 예정으로 안내되어 있으므로 이후에는 지원되는 이미지 편집 모델을 GEMINI_IMAGE_MODEL에 지정해야 합니다.

요금: https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-image
