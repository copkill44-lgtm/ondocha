# 네이버 로그인 서버 배포

구글/카카오와 달리 Supabase Custom Auth Provider를 만들지 않습니다.
Issuer URL, JWKS URI를 임의로 입력하지 마세요. 네이버 전용 Edge Function으로 연결합니다.

## 1. 네이버 앱 설정 변경

Naver Developers > 온도차 > API 설정 > PC 웹

서비스 URL:
https://copkill44-lgtm.github.io/ondocha/

Callback URL:
https://copkill44-lgtm.github.io/ondocha/naver-callback.html

기존 Supabase /auth/v1/callback 대신 위 전용 페이지를 사용합니다.
로컬 테스트도 하려면 별도 환경에 아래 주소를 등록합니다.
서비스 URL: http://127.0.0.1:8000/
Callback URL: http://127.0.0.1:8000/naver-callback.html

네이버 개발 중 앱의 허용 계정으로 먼저 검사합니다. 일반 사용자 공개에는 네이버 검수가 필요합니다.
Client ID/Secret은 다음 Supabase Secrets에만 저장하며 채팅, GitHub, 브라우저 코드에 넣지 않습니다.

## 2. Supabase Secrets 등록

프로젝트 rwfjbdhfabwgefkwnwgn > Edge Functions > Secrets

- NAVER_CLIENT_ID: 네이버 앱의 Client ID
- NAVER_CLIENT_SECRET: 네이버 앱의 Client Secret

SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY는 Supabase가 기본 주입합니다.
이 키를 프런트엔드에 복사하거나 새로 공개하지 마세요.

## 3. 함수 배포

CLI가 연결된 환경에서는 저장소 루트에서:

    supabase functions deploy naver-auth --project-ref rwfjbdhfabwgefkwnwgn --no-verify-jwt

대시보드에서는 Edge Functions > Deploy a new function > Via Editor:

1. 함수 이름을 naver-auth로 지정합니다.
2. .tools/naver-auth-deploy/index.ts의 전체 내용을 에디터 index.ts에 붙여넣습니다.
   이 파일은 handler.js와 호출 코드를 합친 로컬 생성물입니다. 비밀 키는 없습니다.
3. Deploy를 누릅니다.
4. 함수 Details > Verify JWT with legacy secret을 끕니다.
   로그인 전 사용자를 받는 함수이며, 내부에서 서명된 state와 브라우저 verifier를 검증합니다.

다중 파일 편집을 지원하면 저장소의 supabase/functions/naver-auth/index.ts와 handler.js를 함께 사용해도 됩니다.

## 4. 확인

- PC와 모바일의 같은 탭에서 로그인합니다. 돌아올 주소와 시작 주소의 origin이 같아야 합니다.
- 네이버 동의 후 코디 홈으로 복귀하고, 새로고침해도 로그인 상태가 유지되는지 확인합니다.
- 로그아웃 후 같은 네이버 계정으로 로그인해서 저장된 코디가 유지되는지 확인합니다.
- 다른 네이버 계정이 이전 계정의 코디를 볼 수 없는지 확인합니다.
- 취소/만료된 인증은 재시도 안내로 끝나야 합니다.

네이버 ID별 내부 이메일 별칭(.invalid)을 사용합니다. 실제 이메일이 같아도
기존 구글·카카오·이메일 계정과 합치지 않습니다. 기존 계정 코디는 자동 이전되지 않습니다.
이는 네이버 기본 OAuth identity 등록이 아닌, 서버에서 네이버 ID를 검증한 후
Supabase의 일회용 로그인 해시를 발급·검증하는 별도 로그인 방식입니다.
비밀번호 재설정 메일은 이 내부 별칭으로 받을 수 없습니다. 네이버로 재로그인합니다.

실제 네이버 로그인 검증은 함수 배포 및 Secrets 등록 후에만 가능합니다.
로컬 검사는 외부 API를 모의하며 네이버 토큰이나 실제 계정을 생성하지 않습니다.

검사:
    .tools/deno/deno.exe test supabase/functions/naver-auth/handler_test.js
    .tools/deno/deno.exe test --allow-read=scripts/naver-login.js tests/naver_browser_test.js

참고:
https://developers.naver.com/docs/login/api/api.md
https://developers.naver.com/docs/login/profile/profile.md
https://supabase.com/docs/reference/javascript/auth-admin-generatelink
https://supabase.com/docs/guides/functions/secrets
