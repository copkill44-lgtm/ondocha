# 계정 탈퇴 설정

배포 전에 Supabase Database → Extensions에서 pg_cron을 활성화하고 SQL Editor에서 `supabase/account-withdrawal.sql`을 실행합니다. 기존 schema.sql과 community.sql이 먼저 적용되어 있어야 합니다. 예약 작업 생성에 실패하면 SQL 전체가 롤백됩니다.

마이페이지에서 탈퇴하면 로그아웃됩니다. 서버의 탈퇴 요청 시각부터 정확히 7일 전까지 다시 로그인하면 자동 복구됩니다. 기한에 도달하면 복구되지 않으며, 1분마다 실행되는 서버 작업이 Auth 사용자 및 외래 키로 연결된 코디·커뮤니티 데이터를 삭제합니다. 복구 기간 동안 기존 커뮤니티 콘텐츠는 공개 상태를 유지합니다.

검증: 테스트 계정 탈퇴 → 로그아웃 확인 → 재로그인 및 코디 복구 확인. 만료 검증은 운영 계정 대신 테스트 계정의 private.account_withdrawals.delete_after를 과거로 바꾼 뒤 진행합니다. cron.job_run_details에서 정리 작업 성공 여부도 확인합니다.
