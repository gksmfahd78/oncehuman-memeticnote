# 메메틱 노트 - Once Human

Once Human 게임의 메메틱을 추적하고 관리하는 웹 애플리케이션입니다.

🌐 **운영 사이트**: [https://memeticnote.kr](https://memeticnote.kr)

## 기능

- **메메틱 추적**: 캐릭터별 메메틱 수집 현황을 기록하고 관리
- **하이브 관리**: 하이브(클랜)를 생성하고 멤버들과 메메틱 정보를 공유
- **실시간 채팅**: 하이브 멤버들과 실시간 소통
- **거래 게시판**: 아이템 거래 등록 및 검색
- **프로필 관리**: 사용자 프로필 및 신뢰 점수 시스템
- **OCR 기능**: 스크린샷에서 메메틱 정보 자동 인식
- **다크 모드**: 라이트/다크 테마 지원
- **모바일 최적화**: 반응형 디자인으로 모바일 환경 지원

## 기술 스택

### Frontend
- React 19
- React Router v7
- Vite
- Tailwind CSS
- Axios
- Tesseract.js (OCR)

### Backend
- Node.js
- Express
- SQLite3
- Passport.js (Discord OAuth)
- JWT Authentication
- Multer (파일 업로드)
- bcrypt (비밀번호 암호화)

## 설치 및 실행

### 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 클론
```bash
git clone <repository-url>
cd once-human-memetic-tracker
```

### 서버 설정
```bash
cd server
npm install

# .env 파일 생성
cp .env.example .env
# .env 파일을 편집하여 필요한 환경 변수 설정

# 서버 실행
npm run dev
```

### 클라이언트 설정
```bash
cd client
npm install

# .env 파일 생성
cp .env.example .env
# .env 파일을 편집하여 API URL 설정

# 개발 서버 실행
npm run dev
```

### 빌드
```bash
# 클라이언트 빌드
cd client
npm run build

# 빌드된 파일은 client/dist 폴더에 생성됩니다
```

## 환경 변수

### 서버 (.env)
```
PORT=5000
JWT_SECRET=your-secret-key
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:5000/auth/discord/callback
CLIENT_URL=http://localhost:5173
```

### 클라이언트 (.env)
```
VITE_API_URL=http://localhost:5000
```

## 프로젝트 구조

```
oncehuman_memeticnote/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── contexts/      # React Context (Auth, Theme)
│   │   ├── data/          # 정적 데이터 (메메틱 목록)
│   │   ├── pages/         # 페이지 컴포넌트
│   │   └── utils/         # 유틸리티 함수
│   ├── public/            # 정적 파일
│   └── dist/              # 빌드 출력 (생성됨)
│
├── server/                # Node.js 백엔드
│   ├── config/           # 설정 파일
│   ├── database/         # 데이터베이스 파일
│   ├── middleware/       # Express 미들웨어
│   ├── routes/           # API 라우트
│   ├── migrations/       # 데이터베이스 마이그레이션
│   ├── utils/            # 유틸리티 함수
│   └── uploads/          # 업로드된 파일
│
├── .gitignore
├── README.md
└── LICENSE
```

## API 엔드포인트

### 인증
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `GET /auth/discord` - Discord OAuth 시작
- `GET /auth/discord/callback` - Discord OAuth 콜백

### 사용자
- `GET /users/profile` - 내 프로필 조회
- `PUT /users/profile` - 프로필 수정
- `GET /users/:uid` - 사용자 프로필 조회

### 하이브 (클랜)
- `GET /clans` - 내 하이브 목록
- `POST /clans` - 하이브 생성
- `GET /clan/:id` - 하이브 상세 정보
- `DELETE /clan/:id` - 하이브 삭제
- `POST /clan/:id/invite` - 초대 코드 재생성
- `POST /invite/:code` - 초대 수락

### 메메틱
- `GET /memetics/my-memetics` - 내 메메틱 조회
- `POST /memetics` - 메메틱 추가
- `PUT /memetics/:id` - 메메틱 수정
- `DELETE /memetics/:id` - 메메틱 삭제

### 캐릭터
- `GET /characters` - 내 캐릭터 목록
- `POST /characters` - 캐릭터 생성
- `PUT /characters/:id` - 캐릭터 수정
- `DELETE /characters/:id` - 캐릭터 삭제

### 채팅
- `GET /chats` - 채팅방 목록
- `GET /chats/:id/messages` - 메시지 조회
- `POST /chats/:id/messages` - 메시지 전송

### 거래
- `GET /trades` - 거래 목록
- `POST /trades` - 거래 등록
- `GET /trades/:id` - 거래 상세
- `PUT /trades/:id` - 거래 수정
- `DELETE /trades/:id` - 거래 삭제

## 기여

이슈나 풀 리퀘스트는 언제든지 환영합니다!

## 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.
