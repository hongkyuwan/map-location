# 주소 지도 표시기 (v2)

엑셀 주소 목록을 지도에 표시하고, 현장 방문 시 사진과 메모를 남기는 개인용 도구.
Python(FastAPI) 백엔드 + React 프론트엔드 + MariaDB로 구성되어 있어 폰/PC 등 여러 기기에서 같은 데이터를 볼 수 있다.

이전 버전(서버 없이 단일 HTML 파일로 동작하던 버전)은 git 태그 `v1-single-file-final`에 보존되어 있다.
자세한 요구사항은 [PRD.html](PRD.html) 참고.

## 실행 전 준비

이 프로젝트는 Docker로 백엔드/프론트엔드/DB를 한 번에 띄우도록 만들었다. **로컬 PC에 Docker Desktop을 설치할 수 없는 경우(예: 회사 지급 PC라 관리자 권한이 없는 경우) GitHub Codespaces 사용을 권장** — 브라우저만으로 Docker가 포함된 클라우드 개발 환경을 쓸 수 있다: 저장소 페이지 → **Code** → **Codespaces** 탭 → **Create codespace on main**.

1. `.env.example`을 `.env`로 복사하고 값 채우기:
   ```bash
   cp .env.example .env
   ```
   - `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`: [console.ncloud.com](https://console.ncloud.com)에서 AI·NAVER API → Application 등록 (Maps 상품 중 Web Dynamic Map, Geocoding 선택) 후 발급. v1과 달리 이번엔 Client Secret도 필요하다 — Geocoding을 백엔드가 REST API로 직접 호출하기 때문.
   - `AUTH_PASSWORD`: 앱 로그인 비밀번호, 원하는 값으로 직접 지정.
   - `JWT_SECRET`: 임의의 긴 무작위 문자열.
   - **Codespaces에서 실행하는 경우에만** `VITE_API_BASE_URL`, `CORS_ORIGINS`도 채워야 한다 — Codespaces 터미널에서 `echo $CODESPACE_NAME`으로 확인한 값을 써서 `.env.example`에 적힌 형식대로 입력 (`https://<CODESPACE_NAME>-8000.app.github.dev` 등). 로컬 Docker면 비워두면 자동으로 `localhost`를 쓴다.
   - Naver 콘솔 Application의 "Web 서비스 URL"에는 프론트엔드가 실제로 열리는 주소를 등록해야 지도가 뜬다 — 로컬이면 `http://localhost:5173`, Codespaces면 `https://<CODESPACE_NAME>-5173.app.github.dev` (포트 번호 없이 호스트만).

## 실행

```bash
docker compose up --build
```

- 로컬: 프론트엔드 http://localhost:5173, 백엔드 API 문서(Swagger) http://localhost:8000/docs
- Codespaces: 컨테이너가 뜨면 하단 "Ports" 탭에 5173/8000이 자동으로 나타난다 — 5173 포트 행의 지구본 아이콘을 클릭하면 브라우저에서 열림. 포트 옆 자물쇠가 "Private"로 되어 있으면 GitHub 로그인 세션이 있어야 접속되니, 다른 기기(폰)에서 열어보려면 "Public"으로 바꿔두는 게 편하다 (앱 자체에 비밀번호 로그인이 있으니 이중 보호가 됨).

## 구조

```
backend/    FastAPI + SQLAlchemy + MariaDB
frontend/   React (Vite)
docker-compose.yml
```

엔드포인트, 데이터 모델 등 상세 설계는 이 저장소의 커밋 로그와 [PRD.html](PRD.html)에 정리되어 있다.

## 알려진 제약

- 사진은 백엔드 컨테이너의 로컬 디스크(`backend/storage/photos`, docker volume으로 마운트)에 저장된다. 컨테이너를 완전히 새로 만들면서 이 볼륨까지 지우면 사진도 함께 사라진다.
- 로그인은 계정 개념 없이 단일 비밀번호로만 구분한다 (개인 전용 도구 기준).
- 외부에서 폰으로 접속하려면 이 서버를 실제로 공개된 곳에 배포해야 한다 (Railway, Fly.io, VPS 등). 지금은 로컬 Docker Compose 실행만 구성되어 있다.
