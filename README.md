# Kync

말하지 않아도 연결되는 가족 — 부모와 자녀가 함께 쓰는 소통 앱

- 바닐라 JS + Firebase(로그인, Firestore) + GitHub Pages
- AI 상담 서버: `counsel-worker/` (Cloudflare Workers)

## 파일 구조

```
index.html            앱 화면 (가입 단계, 부모·자녀 앱, 설정)
kync.css              디자인 시스템 (색, 글꼴, 모든 화면 스타일)
kync-ui.js            공통 UI: 아이콘, 마스코트 '도치'(보영이 직접 그린 캐릭터), 토스트·확인창·시트, 설정값(버전·문의 메일·약관 버전)
kync-legal.js         약관·개인정보·국외 이전·AI 상담·보호자 동의 문서 (초안)
firebase-system.js    Firebase 초기화, 로그인, 가족 연결, 데이터 저장·삭제
kync-account.js       가입 단계(역할→기본 정보→약관→가족 연결→보호자 동의), 설정, 탈퇴
kync-core.js          오늘 탭 (질문, 답변 공개, 감정 체크인, 자녀 상태)
kync-features.js      칭찬 카드, 연속 기록, 활동 질문 목록
kync-diary.js         기록 탭 (사진·감정·한 줄, 캘린더)
kync-activity.js      활동 탭
kync-quests2.js       퀘스트 탭
kync-counsel.js       AI 상담
kync-balance.js       취향 맞추기 질문
activity-*.html       활동 상세 화면, quiz.html 대화 유형 검사
fonts/                SUIT (OFL 라이선스)
icons/, manifest.webmanifest   홈 화면 추가용
firestore.rules       Firestore 보안 규칙
```

## 가입 흐름

1. 처음 소개 (처음 한 번)
2. 로그인 (Google 또는 이메일)
3. 역할 선택 → 기본 정보 (자녀는 출생 연월, 부모는 만 19세 이상 확인) → 약관 동의 → 가족 연결
4. 만 14세 미만 자녀는 부모가 앱에서 보호자 동의를 해야 시작할 수 있어요

## 설정해야 할 것

- `firestore.rules` 내용을 Firebase 콘솔 > Firestore > 규칙에 붙여넣고 게시
- 약관을 바꾸면 `kync-ui.js`의 `termsVersion` 날짜를 바꾸기 (모두에게 다시 동의를 받아요)
- 정식 출시 전 `kync-legal.js` 약관 검토
