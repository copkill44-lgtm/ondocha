# 지역 선택 데이터

시/도 → 시/군/구 선택에 GeoNames의 한국 행정구역과 대표 위경도를 사용합니다.
행정경계 지도나 공식 주소 검색이 아닌, 날씨 조회 지점을 정하기 위한 목록입니다.
시/군/구를 선택하지 않으면 ‘시/도 대표 지역’ 좌표로 조회하며 화면에도 명시합니다.

- 데이터: GeoNames, https://download.geonames.org/export/dump/KR.zip
- 형식 설명: https://download.geonames.org/export/dump/readme.txt
- 이용 허락: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
- 변환: ADM1·ADM2 기록에서 이름과 대표 위도·경도를 추출해 `scripts/weather-region-data.js`에 저장
- 반영일: 2026-10-30

기본 자료의 군위군은 대구광역시로 이동하고, 강원·전북 명칭을 갱신했습니다.
인천의 2026년 개편에 따라 제물포·영종·서해·검단구를 목록에 반영했습니다.
해당 신설 구의 좌표는 기존 지역 및 대표 지점의 근사 좌표로, 공식 청사 좌표가 아닙니다.

- 군위군 편입: https://kostat.go.kr/boardDownload.es?bid=3001&list_no=426515&seq=4
- 인천 개편: https://www.icouncil.go.kr/webzine/webzineno/webzineNoDetail.do?menudetail=52&no_seq=2241
- 인천 서해구: https://www.seohae.go.kr/open_content/main/open_info/boundary/faq.jsp

지역 이름과 소속, 대표 좌표는 행정구역 개편 시 갱신이 필요합니다.
