from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.asset import Asset
from app.core.portfolio import Portfolio

from app.routers.asset import router as asset_router

app = FastAPI()
app.include_router(asset_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}
