# LG CNS C팀 라스트미션
## 보이스피싱 판별기

통화 스크립트(텍스트) 또는 녹음 파일(오디오)을 넣으면 Gemini API가 위험도 점수와 판단 근거를 알려주는 데모입니다.

### 실행 방법

1. 패키지 설치
   ```
   npm install
   ```

2. API 키 설정
   - https://aistudio.google.com 에서 API 키 발급
   - 이 폴더에 `.env` 파일을 만들고 아래처럼 입력 (또는 터미널에서 직접 export)
     ```
     GEMINI_API_KEY=발급받은_키
     ```
   - `.env`를 자동으로 불러오려면 `npm install dotenv` 후 `server.js` 맨 위에
     `require('dotenv').config();` 한 줄만 추가하면 됩니다.

3. 서버 실행
   ```
   npm start
   ```

4. 브라우저에서 http://localhost:3000 접속

### 파일 구성

- `server.js` — 백엔드: 텍스트/오디오 분기 처리, Gemini API 호출, 응답 검증
- `system-prompt.js` — 판별 기준과 few-shot 예시가 담긴 프롬프트
- `validate-response.js` — Gemini 응답 스키마 검증 (zod)
- `public/index.html` — 프론트엔드 (탭 전환, 업로드, 결과 게이지)

### 팀원과 나눠서 할 일

- `system-prompt.js`의 예시(few-shot)를 실제 수집한 사례로 5개 이상 늘리기
- 정상 통화 스크립트도 2~3개 넣어서 오탐 여부 테스트하기
- 오디오 파일로 실제 테스트해서 transcript 품질 확인하기
