# 📘 TOEIC 750 형용사·부사 550 마스터 - 스마트 웹 학습기

> **2025–2026 ETS 토익 출제기준 완벽 반영!**  
> 필수 형용사 300개 + 부사 250개 + 136개 짝어휘 + 11가지 Part 5 빈출 함정 유형을 효과적으로 암기하고 실전 테스트할 수 있는 **스마트 단어 학습 웹 애플리케이션**입니다.

---

## ✨ 핵심 주요 기능

### 1. 🔑 다중 사용자 로그인 & 회원가입 (Multi-User Profile)
- **개인별 독립 학습 관리**: 유저별로 암기 현황, 진도율, 복습 횟수, 오답 노트를 SQLite DB에 안전하게 분리 저장
- **로그인 & 회원가입 오버레이**: 닉네임 등록 및 계정 선택으로 간편 진입 / 헤더 로그아웃 지원

### 2. 🔁 순차적 목록 연속 자동 재생 (Auto-Play Engine)
- **정확한 재생 순서**: `[ 1번 ]` ➡️ `[ 🇺🇸/🇬🇧/🇦🇺 원어민 MP3 ]` ➡️ `[ 한글 뜻 & 품사 ]`
- **배속 조절**: `0.8x` (천천히) ~ `2.0x` (2배속) 실전 배속 조절 지원
- **스마트 제어**: 일시정지 & 멈춘 위치부터 이어듣기, 특정 단어 위치부터 재생 지원
- **CORS 100% 회피**: 파이썬 백엔드 MP3 오디오 프록시(`GET /api/audio`)로 고품질 원어민 음성 스트리밍

### 3. 🎯 5대 학습 모드 & 📌 개인 오답 노트
- **대시보드**: 전체 달성률 %, 형용사/부사 및 A/B/C 등급별 프로그레스 링 & 통계
- **단어장 (550개)**: 실시간 초성/영문/한글 검색, 품사/등급/암기상태/오답노트 4중 다중 필터
- **3D 플래시카드**: 영어/한글 우선 카드 뒤집기 학습
- **실전 퀴즈**: 4선 객관식, 예문 빈칸 채우기, 🔥 **내 오답 노트 전용 재시험 모드**
- **형·부 짝어휘 세트 (136개) & Part 5 함정 정리 (11가지)**

---

## 🏗️ 시스템 아키텍처 및 폴더 구조

본 프로젝트는 **Flask Blueprint 백엔드**와 **기능별 프론트엔드 모듈화 구조**, **SQLite3 영구 데이터베이스**로 깔끔하게 모듈화되어 있습니다.

```
.
├── app.py                  # Flask 웹 애플리케이션 생성 및 서버 실행 (Port 7071)
├── config.py               # 중앙 환경 및 파일 경로 설정
├── requirements.txt        # Python 의존성 패키지 명세서 (flask, openpyxl)
├── .gitignore              # Git 버전 관리 제외 설정
├── README.md               # 프로젝트 사용 및 개발 문서
├── TOEIC_750_...xlsx       # 550 어휘 원본 엑셀 데이터 파일
│
├── routes/                 # 백엔드 Flask Blueprint 라우트 모듈
│   ├── main_routes.py      # SPA index.html 및 정적 리소스 라우팅
│   └── api_routes.py       # REST API 라우트 (/api/words, /api/users, /api/audio 등)
│
├── services/               # 데이터 파싱 & DB 전담 파이썬 서비스
│   ├── excel_service.py    # 엑셀 파서 & Unicode NFC 정규화 모듈
│   └── db_service.py       # SQLite3 DB (toeic.db) 자동 시더 & CRUD 서비스
│
└── static/                 # 프론트엔드 정적 웹 자원
    ├── index.html          # 메인 단일 페이지 애플리케이션 (SPA) Layout
    ├── css/                # 기능별 모듈화 CSS
    │   ├── base.css        # CSS 변수, 다크/라이트 테마, 기본 리셋
    │   ├── header.css      # 헤더, 네비게이션, 유저 및 억양 선택기
    │   ├── login.css       # 로그인 & 회원가입 오버레이 디자인
    │   ├── dashboard.css   # 대시보드 및 달성률 프로그레스 링
    │   ├── vocabs.css      # 단어장 그리드 및 연속 자동 재생 툴바
    │   ├── flashcards.css  # 3D 플래시카드 뒤집기 애니메이션
    │   ├── quiz.css        # 실전 퀴즈, 선택지, 결과 리포트
    │   └── modal.css       # 단어 상세 모달 팝업
    └── js/                 # 기능별 모듈화 JavaScript
        ├── state.js        # 전역 상태 및 데이터 관리
        ├── auth.js         # 로그인, 회원가입, 세션 체크 전담
        ├── audio.js        # 서버 MP3 오디오 프록시 연동 & 배속 설정
        ├── autoPlayer.js   # 순차적 목록 연속 자동 재생 엔진
        ├── dashboard.js    # 진도율 계산 및 대시보드 렌더링
        ├── vocabs.js       # 단어장 그리드, 4중 필터링, 암기 완료 처리
        ├── flashcards.js   # 3D 플래시카드 제어
        ├── quiz.js         # 실전 퀴즈 생성기 & 오답 노트 집계
        ├── modal.js        # 단어 상세 팝업 제어
        └── main.js         # 애플리케이션 메인 엔트리포인트
```

---

## 🚀 실행 가이드 (How to Run)

### 1. 프로젝트 클론 및 이동
```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. 의존성 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. 서버 실행
```bash
python app.py
```
> 실행 시 `toeic.db` SQLite 데이터베이스가 없으면 원본 엑셀 파일로부터 최초 1회 자동으로 550개 단어가 시딩(Seeding)됩니다.

### 4. 웹 브라우저 접속
웹 브라우저를 열고 아래 주소로 접속하세요:
```
http://localhost:7071
```

---

## 📝 환경 설정 (`config.py`)

- **포트 번호**: `7071`
- **데이터베이스**: `toeic.db` (SQLite3)
- **오디오 프록시**: Google Native Audio Engine (CORS Bypass)

---

## 📄 라이선스 (License)

본 프로젝트는 TOEIC 어휘 학습 및 연구 목적으로 제작되었습니다.
