# Web Game Homepage

게시판 기능이 포함된 웹 애플리케이션

## 프로젝트 구조

- `my-board/` - React 프론트엔드
- `board-backend/` - FastAPI 백엔드

## 주요 기능

### 인증 시스템
- 회원가입 (아이디, 이메일, 비밀번호, 성별, 생년월일)
- 로그인/로그아웃
- 아이디 찾기 (이메일 + 생년월일)
- 비밀번호 초기화 (이메일 발송)
- 마이페이지에서 비밀번호 변경

### 게시판
- 게시글 작성, 조회, 수정, 삭제
- 조회수 자동 증가
- 작성자별 게시글 관리

### 마이페이지
- 사용자 정보 조회
- 비밀번호 변경
- 임시 비밀번호 사용 시 자동 안내

## 기술 스택

### 프론트엔드
- React 19
- Tailwind CSS
- Vite

### 백엔드
- Python
- FastAPI
- MongoDB (Motor - async driver)
- JWT 인증
- bcrypt 비밀번호 암호화
- SMTP 이메일 발송

## 설치 및 실행

### 백엔드

```bash
cd board-backend
pip install fastapi motor pymongo bcrypt pyjwt python-multipart uvicorn
python main.py
```

백엔드는 `http://localhost:8000`에서 실행됩니다.

### 프론트엔드

```bash
cd my-board
npm install
npm run dev
```

프론트엔드는 `http://localhost:5173`에서 실행됩니다.

## 환경 설정

### MongoDB
- MongoDB가 `localhost:27017`에서 실행 중이어야 합니다.

### 이메일 설정
`board-backend/main.py`의 이메일 설정을 수정하세요:

```python
EMAIL_ADDRESS = "your-email@gmail.com"
EMAIL_PASSWORD = "your-app-password"
```

Gmail 앱 비밀번호 생성 방법:
1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성
3. 생성된 16자리 코드를 `EMAIL_PASSWORD`에 입력

## 라이선스

MIT
