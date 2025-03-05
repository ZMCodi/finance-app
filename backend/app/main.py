from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.asset import router as asset_router
from app.routers.strategy import router as strategy_router
from app.routers.portfolio import router as portfolio_router

app = FastAPI()
app.include_router(asset_router)
app.include_router(strategy_router)
app.include_router(portfolio_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'https://flapp.vercel.app'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}
