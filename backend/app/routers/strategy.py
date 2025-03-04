from fastapi import APIRouter, Depends
from app.core.strategy import MA_Crossover, RSI, MACD, BB, CombinedStrategy, Strategy
from app.models.strategy import (StrategyBase, StrategyCreate, StrategyPlot, StrategyParams, 
                                 StrategySignal, StrategyUpdateParams,
                                 StrategyOptimize, StrategySave, StrategyLoad)
import json
from plotly.utils import PlotlyJSONEncoder
from app.core.asset import Asset
from functools import lru_cache
from enum import Enum

router = APIRouter(prefix='/api/strategies')

@lru_cache(maxsize=30)
def get_asset(asset_ticker: str):
    return Asset(asset_ticker)

_id = 0
strategy_cache = {'rsi_AAPL_-1': RSI(Asset('AAPL'))}

@router.post('/{asset_ticker}/{strategy_name}', response_model=StrategyCreate)
def create_strategy(strategy_name: str, asset: Asset = Depends(get_asset)):
    global _id
    if strategy_name == 'ma_crossover':
        strategy = MA_Crossover(asset)
    elif strategy_name == 'rsi':
        strategy = RSI(asset)
    elif strategy_name == 'macd':
        strategy = MACD(asset)
    elif strategy_name == 'bb':
        strategy = BB(asset)
    else:
        raise ValueError(f'Invalid strategy name: {strategy_name}')
    key = f'{strategy_name}_{asset.ticker}_{_id}'
    _id += 1
    strategy_cache[key] = strategy
    return {
        'strategy': strategy.__class__.__name__,
        'ticker': asset.ticker,
        'strategy_id': key,
    }

@router.delete('/{strategy_key}/delete', response_model=StrategyBase)
def delete_strategy(strategy_key: str):
    strategy = strategy_cache.pop(strategy_key)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
    }

@router.get("/cache")
def get_cache():
    return str(strategy_cache)

@router.get('/{strategy_key}/indicator', response_model=StrategyPlot)
def plot_strategy(strategy_key: str, 
                  timeframe: str = '1d', 
                  start_date: str = None, 
                  end_date: str = None,
                  ):
    strategy: Strategy = strategy_cache.get(strategy_key)
    fig = strategy.plot(timeframe, start_date, end_date)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get('/{strategy_key}/params', response_model=StrategyParams)
def get_strategy_params(strategy_key: str):
    strategy: Strategy = strategy_cache.get(strategy_key)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'params': strategy.parameters,
    }

@router.get('/{strategy_key}/signals', response_model=StrategySignal)
def get_strategy_signals(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None):
    strategy: Strategy = strategy_cache.get(strategy_key)
    if timeframe == '1d':
        signal = strategy.daily['signal']
    elif timeframe == '5m':
        signal = strategy.five_min['signal']

    if start_date is not None:
        signal = signal.loc[start_date:]
    if end_date is not None:
        signal = signal.loc[:end_date]

    _format = '%Y-%m-%d' if timeframe == '1d' else '%Y-%m-%d<br>%H:%M:%S'
    signal.index = signal.index.strftime(_format)
    signal = signal.to_dict()
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'signals': signal,
    }

@router.patch('/{strategy_key}/params', response_model=StrategyParams)
def update_strategy_params(strategy_key: str, params: StrategyUpdateParams):
    strategy: Strategy = strategy_cache.get(strategy_key)
    param_updates = params.model_dump(exclude_none=True)
    for k, v in param_updates.items():
        if isinstance(v, Enum):
            param_updates[k] = v.value
        elif k == 'signal_type':
            param_updates[k] = [x.value for x in v]
    strategy.change_params(**param_updates)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'params': strategy.parameters,
    }

# strategies will be added one at a time
@router.post('/combined/create/{strategy_key}', response_model=StrategyCreate)
def create_combined_strategy(strategy_key: str):
    global _id
    strategy: Strategy = strategy_cache.get(strategy_key)
    combined = CombinedStrategy(strategy.asset, strategies=[strategy])
    key = f'combined_{strategy.asset.ticker}_{_id}'
    _id += 1
    strategy_cache[key] = combined
    return {
        'ticker': strategy.asset.ticker,
        'strategy': combined.__class__.__name__,
        'strategy_id': key,
    }

@router.patch('/combined/{combined_key}/{strategy_key}/add_strategy', response_model=StrategyParams)
def add_strategy_to_combined(combined_key: str, strategy_key: str, weight: float = 1.):
    combined: CombinedStrategy = strategy_cache.get(combined_key)
    strategy = strategy_cache.get(strategy_key)
    combined.add_strategy(strategy, weight)
    return {
        'ticker': combined.asset.ticker,
        'strategy': combined.__class__.__name__,
        'params': combined.parameters,
    }

@router.patch('/combined/{combined_key}/{strategy_key}/remove_strategy', response_model=StrategyParams)
def remove_strategy_from_combined(combined_key: str, strategy_key: str):
    combined: CombinedStrategy = strategy_cache.get(combined_key)
    strategy = strategy_cache.get(strategy_key)
    combined.remove_strategy(strategy)
    return {
        'ticker': combined.asset.ticker,
        'strategy': combined.__class__.__name__,
        'params': combined.parameters,
    }

@router.post('/combined/{combined_key}/save', response_model=StrategySave)
def save_combined_strategy(combined_key: str):
    combined: CombinedStrategy = strategy_cache.get(combined_key)
    params = combined.parameters
    params.pop('strategies')
    indicators = []
    for strat in combined.strategies:
        indicators.append({
            'type': strat.__class__.__name__,
            'params': strat.parameters,
        })

    return {
        'params': params,
        'indicators': indicators,
    }

@router.post('/load', response_model=StrategyCreate)
def load_combined_strategy(request: StrategyLoad):
    params = request.model_dump(exclude_none=True)
    print(params)
    asset = Asset(params['asset'])
    combined = CombinedStrategy(asset)
    for indicator in params['params']['indicators']:
        match indicator['type']:
            case 'MA_Crossover':
                strategy = MA_Crossover(asset)
            case 'RSI':
                strategy = RSI(asset)
            case 'MACD':
                strategy = MACD(asset)
            case 'BB':
                strategy = BB(asset)

        strategy.change_params(**indicator['params'])
        combined.add_strategy(strategy)

    combined.change_params(**params['params']['params'])
    global _id
    key = f'combined_{asset.ticker}_{_id}'
    _id += 1
    strategy_cache[key] = combined
    return {
        'ticker': asset.ticker,
        'strategy': combined.__class__.__name__,
        'strategy_id': key,
    }

@router.get('/{strategy_key}/backtest', response_model=StrategyPlot)
def backtest(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None):
    strategy: Strategy = strategy_cache.get(strategy_key)
    res, fig = strategy.backtest(plot=True, timeframe=timeframe, start_date=start_date, end_date=end_date)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'results': res.to_dict(),
        'json_data': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
    }

@router.get('/{strategy_key}/optimize/params', response_model=StrategyOptimize)
def optimize_parameters(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None):
    strategy: Strategy = strategy_cache.get(strategy_key)
    res = strategy.optimize(timeframe=timeframe, start_date=start_date, end_date=end_date)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'results': res,
    }

@router.get('/{strategy_key}/optimize/weights', response_model=StrategyOptimize)
def optimize_weights(strategy_key: str, timeframe: str = '1d', start_date: str = None, end_date: str = None, runs: int = 20):
    strategy: Strategy = strategy_cache.get(strategy_key)
    res = strategy.optimize_weights(timeframe=timeframe, start_date=start_date, end_date=end_date, runs=runs)
    return {
        'ticker': strategy.asset.ticker,
        'strategy': strategy.__class__.__name__,
        'results': res,
    }
