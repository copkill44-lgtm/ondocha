# 소셜 로그인 설정

현재 로컬 코드에 로그인·회원가입 화면의 구글·카카오·네이버 버튼을 추가했습니다.
구글·카카오 제공자가 꺼져 있으면 준비 중 안내를 표시합니다.
네이버는 전용 함수 배포와 Secrets 등록 후 사용할 수 있습니다.
로그인·회원가입 폼 하단에 아이콘 버튼을 표시합니다. 실제 로그인에는 아래 제공자 설정이 필요합니다.

## 공통 설정

Supabase 프로젝트: rwfjbdhfabwgefkwnwgn
Authentication > URL Configuration에서 Site URL을
https://copkill44-lgtm.github.io/ondocha/ 로 설정합니다.
Redirect URLs에 아래를 등록합니다.

- https://copkill44-lgtm.github.io/ondocha/
- http://127.0.0.1:8000/

Client Secret은 개발자 콘솔과 Supabase 대시보드에만 입력합니다.
HTML·JavaScript·GitHub·채팅에 비밀 키를 넣지 않습니다.

## 구글

1. Google Cloud Console에서 프로젝트를 선택하고 Google Auth Platform의
   Branding, Audience, Data Access를 설정합니다.
2. 웹 애플리케이션 OAuth Client를 생성합니다.
3. 승인된 리디렉션 URI에 Supabase Google 제공자 화면의 Callback URL을 등록합니다.
   기본 주소는 https://rwfjbdhfabwgefkwnwgn.supabase.co/auth/v1/callback 입니다.
4. Supabase > Authentication > Sign In / Providers > Google에서
   Client ID와 Client Secret을 입력하고 활성화합니다.
5. 테스트 모드라면 테스트 사용자를 등록합니다. 일반 공개 시 게시/검증 요구사항을 확인합니다.

## 카카오

1. Kakao Developers에서 애플리케이션을 생성합니다.
2. 웹 플랫폼에 https://copkill44-lgtm.github.io 와 http://127.0.0.1:8000 을 등록합니다.
3. 카카오 로그인을 활성화하고 Supabase Kakao 화면의 Callback URL을 Redirect URI에 등록합니다.
4. REST API 키와 카카오 로그인 Client Secret을 Supabase Kakao 제공자에 등록하고 활성화합니다.
5. 이메일 제공 동의 항목을 확인합니다. 이메일을 받을 수 없는 앱은 Supabase의
   이메일 없는 사용자 허용 여부를 명시적으로 결정하고 실제 사용자로 검증합니다.

## 네이버: 전용 서버 연동

네이버는 Custom Auth Provider 대신 전용 naver-auth Edge Function을 사용합니다.
자세한 배포와 Callback URL 변경은 docs/naver-login-setup.md를 따릅니다.
네이버 Client ID/Secret은 Supabase Edge Function Secrets에만 저장합니다.

## 실제 검증 후 배포

각 서비스에서 새 계정 가입/기존 계정 로그인/동의 취소/로그아웃 후 재로그인을
로컬과 GitHub Pages 모두에서 확인합니다. 코디 저장과 계정 간 데이터 분리도 확인합니다.
서로 다른 로그인 방법으로 만든 계정의 데이터가 자동 병합된다고 보장하지 않습니다.
버튼 연결 모의 검사는 서비스 앱 등록과 실제 OAuth 검증을 대신하지 않습니다.

공식 문서:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao
- https://supabase.com/docs/guides/auth/custom-oauth-providers
- https://developers.naver.com/docs/login/api/api.md
