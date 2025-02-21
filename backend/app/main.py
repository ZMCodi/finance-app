from fastapi import FastAPI
from app.core.asset import Asset
from app.core.portfolio import Portfolio

from app.routers.asset import router as asset_router

app = FastAPI()
app.include_router(asset_router)

@app.get("/")
def read_root():
    return {"Hello": "World"}
