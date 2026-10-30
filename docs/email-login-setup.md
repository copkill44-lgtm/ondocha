# 이메일 + 비밀번호 로그인 연결하기

코드는 준비되어 있지만 Supabase 프로젝트 연결 전에는 실제 가입과 로그인이 동작하지 않습니다.
README는 요청하신 사이트 링크 한 줄로 유지합니다.

1. https://supabase.com/dashboard 에서 계정을 만들고 New project로 프로젝트를 생성합니다.
2. 프로젝트의 Connect / API Keys에서 Project URL과 Publishable key를 복사해
   `scripts/config.js`의 두 값을 바꿉니다. 공개 키만 사용하며 secret/service_role 키는 넣지 않습니다.
3. Authentication의 이메일 제공자를 활성화하고 이메일 확인(Confirm email)을 켭니다.
   새 계정의 최소 비밀번호 길이는 8자 이상으로 설정하세요. Google 제공자는 필요 없습니다.
4. Authentication의 URL Configuration에 아래 주소를 Site URL과 허용 Redirect URL로 등록합니다.
   - `https://copkill44-lgtm.github.io/ondocha/`
   - `https://copkill44-lgtm.github.io/ondocha/?auth=recovery`
5. SQL Editor에서 `supabase/schema.sql`을 실행합니다.
   코디·후기는 사용자별 행으로 저장하며 RLS 정책으로 본인 데이터만 읽고 쓸 수 있습니다.
   이미 테이블을 운영 중이면 기존에 추가한 정책도 확인하세요. 다른 허용 정책이 있으면
   이 파일의 정책과 함께 적용되므로 의도치 않은 접근을 허용할 수 있습니다.
6. 외부 방문자에게 가입 확인·비밀번호 재설정 메일을 보내려면 Custom SMTP를 설정합니다.
   Supabase 기본 발송기는 테스트용이며 수신자 제한이 있습니다.
   메일 발송 서비스의 SMTP 비밀번호는 Supabase 대시보드에만 저장합니다.
7. 새 파일까지 함께 GitHub에 push합니다. Pages 배포 후 아래 절차를 확인합니다.

## 동작 확인

- 이메일·8자 이상 비밀번호로 가입 → 확인 메일 클릭 → 로그인
- 잘못된 비밀번호 안내와 비밀번호 확인 불일치 확인
- 로그아웃 후 새로고침 → 로그인 상태 해제
- 다른 브라우저에서 같은 계정으로 로그인 → 저장한 코디·후기 확인
- 비밀번호를 잊었나요? → 메일 링크 클릭 → 새 비밀번호 저장 → 다시 로그인
- 재설정 링크가 만료되면 새 메일 요청
- 다른 계정으로 로그인했을 때 이전 계정 데이터가 섞이지 않는지 확인

`file://`로는 인증 메일의 돌아올 주소를 설정할 수 없습니다.
실제 인증 테스트는 위의 HTTPS 사이트에서 하거나, 별도 허용한 로컬 HTTP 주소에서 합니다.

연결이 없거나 서버 오류가 나면 로그인 성공으로 표시하지 않습니다.
설정 전에도 ‘로그인 없이 둘러보기’는 사용할 수 있습니다.

## 코드 검사

프로젝트 폴더에서 다음 명령으로 인증 흐름 검사를 재실행합니다.
테스트는 Supabase와 브라우저를 모의하므로 실제 메일 발송은 하지 않습니다.

```powershell
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
python tools/check_assets.py
```

가입 확인 대기, 잘못된 로그인, 비밀번호 불일치, 재설정 링크 만료,
계정 간 데이터 분리, 클라우드 읽기 실패 시 업로드 차단을 확인합니다.
실제 Supabase 프로젝트와 브라우저에서의 가입·메일·로그인은 별도로 확인해야 합니다.

## 공식 문서

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/database/postgres/row-level-security
