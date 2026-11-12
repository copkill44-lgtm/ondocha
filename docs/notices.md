# 管理者 / 관리자 및 공지사항 설정

1. `copkill44@gmail.com`, `copkill4@gmail.com` 두 계정으로 사이트에 가입하고 각각 이메일 인증을 완료합니다.
2. Supabase SQL Editor에서 `supabase/community.sql`이 이미 적용되어 있는지 확인합니다.
3. `supabase/admin-notices.sql` 전체를 실행합니다. 기존 게시물과 계정 데이터는 유지됩니다.
4. 사이트를 새로고침하고 위 관리자 계정으로 다시 로그인합니다.

관리자는 마이페이지에 관리자 표시가 나오며, 공지사항에서 작성·수정·삭제할 수 있습니다.
커뮤니티의 다른 사람 게시물과 댓글에도 삭제 버튼이 나옵니다.
일반 사용자는 공지를 읽을 수 있고, 자기 커뮤니티 게시물과 댓글만 삭제할 수 있습니다.

관리자 권한은 `private.site_admins`와 `public.is_site_admin()` RPC가 관리합니다.
브라우저의 이메일 비교나 사용자가 편집 가능한 메타데이터로 관리자 권한을 부여하지 않습니다.
공지·게시물·댓글의 실제 변경은 RLS 정책이 검증합니다.
관리자 추가/해제는 Supabase SQL Editor에서 `private.site_admins`를 변경해야 합니다.
서비스 키나 비밀번호를 웹사이트 코드에 넣을 필요가 없습니다.

공지 원본은 `public.site_notices`에 저장됩니다. 영어 내용은 선택 사항이며 미작성 시 한국어를 표시합니다.
중요 공지가 먼저 나오며 읽음 표시는 각 기기에 저장됩니다.
최초 설정 SQL은 기존 공지 세 개를 한 번만 옮깁니다. 재실행해도 삭제한 공지가 복구되지 않습니다.
`scripts/notices-data.js`는 DB 설정 전의 기본 표시용이며, DB 연결 후에는 DB 목록만 사용합니다.

검증: `tests/notices_browser_test.html`, `tests/admin_notices_browser_test.html`.
운영 DB의 권한 적용 여부는 SQL 실행 후 관리자 계정과 일반 계정으로 각각 확인해야 합니다.