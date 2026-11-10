# 코디니 채팅 연결

오른쪽 아래 코디니 캐릭터를 누르면 채팅창이 열립니다.
로그인한 사용자만 AI 질문을 보낼 수 있습니다. 대화는 현재 페이지 메모리에만 유지되며
새 대화·로그아웃·계정 변경·새로고침 시 지워집니다.
질문과 최근 대화, 선택한 옷 구성, 현재 사이트에 표시된 기온만 Groq에 보냅니다.
이메일·닉네임·계정 캘린더를 보내지 않습니다.

## 서버 설정

1. https://console.groq.com/keys 에서 API 키를 발급합니다. Free 플랜은 사용 한도가 있습니다.
2. Supabase > Edge Functions > Secrets에 GROQ_API_KEY를 등록합니다.
3. ALLOWED_ORIGINS에 https://copkill44-lgtm.github.io 를 포함합니다.
   로컬 테스트 주소를 쓰면 http://127.0.0.1:8000 등 실제 origin도 쉼표로 추가합니다.
4. codini-chat 함수를 배포합니다. CLI: supabase functions deploy codini-chat
   index.ts와 handler.ts 두 파일이 필요합니다.
5. 함수의 Verify JWT를 끕니다. handler.ts가 Auth 서버로 사용자 인증을 직접 확인합니다.
6. 로그인하고 캐릭터 채팅창에서 질문합니다.

기본 모델은 qwen/qwen3.8-27b이며 GROQ_CHAT_MODEL Secret으로 바꿀 수 있습니다.
키를 브라우저 JS나 GitHub 파일에 넣지 않습니다.
함수가 없거나 키가 등록되지 않았으면 '연결 준비 중' 안내를 표시합니다.
키가 없을 때 정해진 문구를 AI 답변처럼 만들어 보여주지 않습니다.

## 검사

Deno 서버 테스트: .tools/deno/deno.exe test supabase/functions/codini-chat/handler_test.ts
브라우저 모의 검사: tests/codini_chat_browser_test.html
실제 AI 응답은 API 키 등록 및 함수 배포 후 확인합니다.

Dashboard: paste the entire dashboard.ts file into the function editor as index.ts, name the function codini-chat, then deploy. No additional handler.ts file is needed for this combined version.

Current live Dashboard function slug: smooth-endpoint. The browser calls /functions/v1/smooth-endpoint. codini-chat.ts is the source filename, not the URL slug.
