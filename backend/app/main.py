from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  모델을 등록해야 create_all이 테이블을 만듦
from .config import get_settings
from .database import Base, engine
from .routers import auth, config as config_router, datasets, ev_stations, places

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="주소 지도 표시기 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(config_router.router)
app.include_router(datasets.router)
app.include_router(places.router)
app.include_router(ev_stations.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
