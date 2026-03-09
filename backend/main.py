from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db import engine
from db import Base
from routers import auth_router, documents_router, chat_router, agents_router

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # 开发期：自动建表；生产建议用 Alembic
    Base.metadata.create_all(bind=engine)


app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(agents_router)


@app.get("/health")
def health():
    return {"ok": True, "env": settings.env}
