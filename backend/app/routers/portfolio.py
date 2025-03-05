from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
import os
import tempfile
from app.core.portfolio import Portfolio
from app.core.portfolio_optimizer import PortfolioOptimizer
from app.core.asset import Asset
from functools import lru_cache
from plotly.utils import PlotlyJSONEncoder
import json
from typing import Dict
from app.models.portfolio import (PortfolioCreate, PortfolioCreatePost, TransactionResponse,
                                  PortfolioStats, HoldingsStats, PortfolioPlots,
                                  PortfolioTransactions, PortfolioOptimize,
                                  PortfolioSave)
import urllib.parse
from app.database.redis_client import cache_portfolio, get_cached_portfolio

router = APIRouter(prefix='/api/portfolio')

@lru_cache(maxsize=30)
def get_asset(asset_ticker: str):
    return Asset(asset_ticker)

# Helper function to decode portfolio IDs
def decode_portfolio_id(portfolio_id: str) -> str:
    """Decode URL-encoded portfolio ID to ensure proper lookup in the cache."""
    try:
        return urllib.parse.unquote(portfolio_id)
    except:
        # Return the original if there's any error in decoding
        return portfolio_id

# test_portfolio = Portfolio.load('my_portfolio')

_id = 0

@router.post('/create', response_model=PortfolioCreate)
def create_portfolio(request: PortfolioCreatePost):
    global _id
    if request.name is None:
        name = f'my_portfolio_{_id}'
        _id += 1
    else:
        name = request.name
    print(request.model_dump(exclude_none=True, exclude={'name'}))
    portfolio = Portfolio(**request.model_dump(exclude_none=True, exclude={'name'}))
    cache_portfolio(name, portfolio)
    return {
        'portfolio_id': name,
        'currency': portfolio.currency,
        'cash': portfolio.cash,
        'holdings': {a.ticker: v for a, v in portfolio.holdings.items()},
    }

@router.post('/{portfolio_id}/save', response_model=PortfolioSave)
def save_portfolio(portfolio_id: str):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    state, transactions = portfolio.save()

    return {
        'state': state,
        'transactions': transactions
    }

@router.post('/{portfolio_id}/load', response_model=PortfolioCreate)
def load_portfolio(request: PortfolioSave, name: str = None):
    state = request.state.model_dump()
    transactions = request.transactions
    portfolio = Portfolio.load(state, transactions)
    cache_portfolio(name, portfolio)
    return {
        'portfolio_id': name,
        'currency': portfolio.currency,
        'cash': portfolio.cash,
        'holdings': {a.ticker: v for a, v in portfolio.holdings.items()},
    }

@router.patch('/{portfolio_id}/upload', response_model=PortfolioTransactions)
async def upload_portfolio(portfolio_id: str, file: UploadFile = File(...), source: str = Form(...)):
    decoded_id = decode_portfolio_id(portfolio_id)
    suffix = '.csv' if source == 'trading212' else '.xlsx'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_name = tmp.name

    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    if source == 'trading212':
        transactions = portfolio.from_212(tmp_name)
    else:
        transactions = portfolio.from_vanguard(tmp_name)

    os.unlink(tmp_name)
    cache_portfolio(portfolio_id, portfolio)

    return {
        'transactions': [
            {
                'type': t.type,
                'asset': t.asset.ticker if isinstance(t.asset, Asset) else t.asset,
                'shares': t.shares,
                'value': t.value,
                'profit': t.profit,
                'date': t.date,
                'id': t.id,
            }
            for t in transactions
        ]
    }

@router.patch('/{portfolio_id}/deposit', response_model=TransactionResponse)
def deposit(portfolio_id: str, value: float, currency: str = None, date: str = None):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    t, cash = portfolio.deposit(value, currency, date)
    cache_portfolio(portfolio_id, portfolio)
    return {
        'type': t.type,
        'asset': t.asset,
        'shares': t.shares,
        'value': t.value,
        'profit': t.profit,
        'date': t.date,
        'id': t.id,
        'current_cash': cash,
    }

@router.patch('/{portfolio_id}/withdraw', response_model=TransactionResponse)
def withdraw(portfolio_id: str, value: float, currency: str = None, date: str = None):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    t, cash = portfolio.withdraw(value, currency, date)
    cache_portfolio(portfolio_id, portfolio)
    return {
        'type': t.type,
        'asset': t.asset,
        'shares': t.shares,
        'value': t.value,
        'profit': t.profit,
        'date': t.date,
        'id': t.id,
        'current_cash': cash
    }

@router.patch('/{portfolio_id}/buy', response_model=TransactionResponse)
def buy(portfolio_id: str, shares: float = None, value: float = None, date: str = None, currency: str = None, asset: Asset = Depends(get_asset)):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    t, cash = portfolio.buy(asset=asset, shares=shares, value=value, date=date, currency=currency)
    cache_portfolio(portfolio_id, portfolio)
    return {
        'type': t.type,
        'asset': t.asset.ticker,
        'shares': t.shares,
        'value': t.value,
        'profit': t.profit,
        'date': t.date,
        'id': t.id,
        'current_cash': cash
    }

@router.patch('/{portfolio_id}/sell', response_model=TransactionResponse)
def sell(portfolio_id: str, shares: float = None, value: float = None, date: str = None, currency: str = None, asset: Asset = Depends(get_asset)):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    t, cash = portfolio.sell(asset=asset, shares=shares, value=value, date=date, currency=currency)
    cache_portfolio(portfolio_id, portfolio)
    return {
        'type': t.type,
        'asset': t.asset.ticker,
        'shares': t.shares,
        'value': t.value,
        'profit': t.profit,
        'date': t.date,
        'id': t.id,
        'current_cash': cash
    }

@router.get('/{portfolio_id}/stats', response_model=PortfolioStats)
def portfolio_stats(portfolio_id: str):
    import time
    time.sleep(0.01)
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    return portfolio.stats

@router.get('/{portfolio_id}/holdings_stats', response_model=HoldingsStats)
def holdings_stats(portfolio_id: str):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    holdings = portfolio.holdings
    weights = portfolio.weights
    pnl = portfolio.holdings_pnl()
    returns = portfolio.holdings_returns()
    value = portfolio.holdings_value()
    cost_bases = portfolio.cost_bases

    return {k.ticker: {
        'shares': v,
        'weight': weights[k],
        'pnl': pnl[k],
        'returns': returns[k],
        'value': value[k],
        'cost_basis': cost_bases[k],
        'deposited': v * cost_bases[k],
    } for k, v in holdings.items()}

@router.get('/{portfolio_id}/plots', response_model=PortfolioPlots)
def portfolio_plots(portfolio_id: str):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)

    plots = {}

    holdings_plots = {
        'holdings_chart': portfolio.holdings_chart(),
        'asset_type_exposure': portfolio.asset_type_exposure(),
        'sector_exposure': portfolio.sector_exposure(),
        'correlation_matrix': portfolio.correlation_matrix()
    }
    plots['holdings'] = {k: json.loads(json.dumps(v, cls=PlotlyJSONEncoder)) for k, v in holdings_plots.items()}

    returns_plots = {
        'returns_chart': portfolio.returns_chart(),
        'returns_dist': portfolio.returns_dist(),
        'pnl_chart': portfolio.pnl_chart()
    }
    plots['returns'] = {k: json.loads(json.dumps(v, cls=PlotlyJSONEncoder)) for k, v in returns_plots.items()}

    risk_plots = {
        'risk_decomposition': portfolio.risk_decomposition(),
        'drawdown_plot': portfolio.drawdown_plot(),
        'drawdown_frequency': portfolio.drawdown_frequency()
    }
    plots['risk'] = {k: json.loads(json.dumps(v, cls=PlotlyJSONEncoder)) for k, v in risk_plots.items()}

    return plots

@router.get('/{portfolio_id}/transactions', response_model=PortfolioTransactions)
def portfolio_transactions(portfolio_id: str):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    return {
        'transactions': [
            {
                'type': t.type,
                'asset': t.asset.ticker if isinstance(t.asset, Asset) else t.asset,
                'shares': t.shares,
                'value': t.value,
                'profit': t.profit,
                'date': t.date,
                'id': t.id,
            }
            for t in portfolio.transactions
        ]
    }

@router.get('/{portfolio_id}/optimize', response_model=PortfolioOptimize)
def optimize_portfolio(portfolio_id: str, min_alloc: float = 0., max_alloc: float = 1., points: int = 50):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    optimizer = PortfolioOptimizer(portfolio, min_alloc=min_alloc, max_alloc=max_alloc)
    opt = optimizer.optimal_sharpe_portfolio
    fig, res = optimizer.efficient_frontier(points=points)
    return {
        'opt_returns': opt['returns'],
        'opt_volatility': opt['volatility'],
        'opt_sharpe_ratio': opt['sharpe_ratio'],
        'opt_weights': {k.ticker: v for k, v in opt['weights'].items()},
        'ef_results': {
            'efficient_frontier': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
            'returns': res['returns'],
            'volatilities': res['volatility'],
            'sharpe_ratios': res['sharpe_ratio'],
            'weights': res['weights'],
        } 
    }

@router.post('/{portfolio_id}/rebalance', response_model=PortfolioTransactions)
def rebalance(portfolio_id: str, target_weights: Dict[str, float]):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    asset_mapping = {a.ticker: a for a in portfolio.assets}
    target_weights = {asset_mapping[k]: v for k, v in target_weights.items()}
    transactions = portfolio.rebalance(target_weights, inplace=False)
    return {
        'transactions': [
            {
                'type': t.type,
                'asset': t.asset.ticker if isinstance(t.asset, Asset) else t.asset,
                'shares': t.shares,
                'value': t.value,
                'profit': t.profit,
                'date': t.date,
                'id': t.id,
            }
            for t in transactions
        ]
    }

@router.patch('/{portfolio_id}/parse_transactions', response_model=Dict[str, str])
def parse_transactions(portfolio_id: str, transactions: PortfolioTransactions):
    decoded_id = decode_portfolio_id(portfolio_id)
    portfolio: Portfolio = get_cached_portfolio(decoded_id)
    asset_mapping = {a.ticker: a for a in portfolio.cost_bases}  # use cost bases bcs the method is only for rebalancing
    t_list = [
        Portfolio.transaction(
            t.type,
            asset_mapping.get(t.asset, 'Cash'),
            t.shares,
            t.value,
            t.profit,
            t.date,
            t.id
        ) for t in transactions.transactions
    ]

    portfolio.from_transactions(t_list)
    cache_portfolio(portfolio_id, portfolio)
    return {
        'status': 'success',
        'message': 'Transactions parsed successfully',
    }

# optimizing flow: optimize: weights -> rebalance: transactions -> parse_transactions
# rebalancing flow: rebalance: transactions -> parse_transactions
# portfolio for volatility/returns/sharpe ratio: efficient_frontier: weights -> rebalance: transactions -> parse_transactions