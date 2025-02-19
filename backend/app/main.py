from fastapi import FastAPI
from core.assets import Asset

Asset('AAPL').plot_candlestick(timeframe='5m')