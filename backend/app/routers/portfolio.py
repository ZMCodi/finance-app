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
from app.models.portfolio import (PortfolioCreate, PortfolioCreatePost, CashflowResponse, TradeResponse,
                                  PortfolioStats, HoldingsStats, PortfolioPlots,
                                  PortfolioTransactions, PortfolioOptimize, PortfolioEfficientFrontier)

router = APIRouter(prefix='/api/portfolio')

@lru_cache(maxsize=30)
def get_asset(asset_ticker: str):
    return Asset(asset_ticker)

test_portfolio = Portfolio.load('my_portfolio')

portfolio_cache = {'test': test_portfolio, 'empty': Portfolio()}
_id = 0

@router.get('/cache')
def get_cache():
    return str(portfolio_cache)

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
    portfolio_cache[name] = portfolio
    return {
        'portfolio_id': name,
        'currency': portfolio.currency,
        'cash': portfolio.cash,
        'holdings': {a.ticker: v for a, v in portfolio.holdings.items()},
    }

@router.patch('/{portfolio_id}/load', response_model=PortfolioTransactions)
async def upload_portfolio(portfolio_id: str, file: UploadFile = File(...), source: str = Form(...)):
    suffix = '.csv' if source == 'trading212' else '.xlsx'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_name = tmp.name

    portfolio: Portfolio = portfolio_cache[portfolio_id]
    if source == 'trading212':
        transactions = portfolio.from_212(tmp_name)
    else:
        transactions = portfolio.from_vanguard(tmp_name)

    os.unlink(tmp_name)

    return {
        t.id: {
            'type': t.type,
            'asset': t.asset.ticker if isinstance(t.asset, Asset) else t.asset,
            'shares': t.shares,
            'value': t.value,
            'profit': t.profit,
            'date': t.date,
        } for t in transactions
    }

@router.patch('/{portfolio_id}/deposit', response_model=CashflowResponse)
def deposit(portfolio_id: str, value: float, currency: str = None, date: str = None):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    portfolio.deposit(value, currency, date)
    return {
        'cashflow': value,
        'current_cash': portfolio.cash,
    }

@router.patch('/{portfolio_id}/withdraw', response_model=CashflowResponse)
def withdraw(portfolio_id: str, value: float, currency: str = None, date: str = None):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    portfolio.withdraw(value, currency, date)
    return {
        'cashflow': -value,
        'current_cash': portfolio.cash,
    }

@router.patch('/{portfolio_id}/buy', response_model=TradeResponse)
def buy(portfolio_id: str, shares: float = None, value: float = None, date: str = None, currency: str = None, asset: Asset = Depends(get_asset)):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    shares, value, date, cash = portfolio.buy(asset=asset, shares=shares, value=value, date=date, currency=currency)
    return {
        'asset_ticker': asset.ticker,
        'shares': shares,
        'value': value,
        'date': date,
        'current_cash': cash,
    }

@router.patch('/{portfolio_id}/sell', response_model=TradeResponse)
def sell(portfolio_id: str, shares: float = None, value: float = None, date: str = None, currency: str = None, asset: Asset = Depends(get_asset)):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    shares, value, date, cash = portfolio.sell(asset=asset, shares=shares, value=value, date=date, currency=currency)
    return {
        'asset_ticker': asset.ticker,
        'shares': shares,
        'value': value,
        'date': date,
        'current_cash': cash,
    }

@router.get('/{portfolio_id}/stats', response_model=PortfolioStats)
def portfolio_stats(portfolio_id: str):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    return portfolio.stats

@router.get('/{portfolio_id}/holdings_stats', response_model=HoldingsStats)
def holdings_stats(portfolio_id: str):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
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
    portfolio: Portfolio = portfolio_cache[portfolio_id]

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
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    return {
        t.id: {
            'type': t.type,
            'asset': t.asset.ticker if isinstance(t.asset, Asset) else t.asset,
            'shares': t.shares,
            'value': t.value,
            'profit': t.profit,
            'date': t.date,
        }
        for t in portfolio.transactions
    }

@router.get('/{portfolio_id}/optimize', response_model=PortfolioOptimize)
def optimize_portfolio(portfolio_id: str, min_alloc: float = 0., max_alloc: float = 1.):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    optimizer = PortfolioOptimizer(portfolio, min_alloc=min_alloc, max_alloc=max_alloc)
    opt = optimizer.optimal_sharpe_portfolio
    return {
        'returns': opt['returns'],
        'volatility': opt['volatility'],
        'sharpe_ratio': opt['sharpe_ratio'],
        'weights': {k.ticker: v for k, v in opt['weights'].items()},
    }

@router.get('/{portfolio_id}/efficient_frontier', response_model=PortfolioEfficientFrontier)
def efficient_frontier(portfolio_id: str, min_alloc: float = 0., max_alloc: float = 1., points: int = 50):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    optimizer = PortfolioOptimizer(portfolio, min_alloc=min_alloc, max_alloc=max_alloc)
    fig, res = optimizer.efficient_frontier(points=points)
    return {
        'efficient_frontier': json.loads(json.dumps(fig, cls=PlotlyJSONEncoder)),
        'returns': res['returns'],
        'volatilities': res['volatility'],
        'sharpe_ratios': res['sharpe_ratio'],
        'weights': res['weights'],  # order is exactly as in portfolio.assets
    }

@router.post('/{portfolio_id}/rebalance', response_model=PortfolioTransactions)
def rebalance(portfolio_id: str, target_weights: Dict[str, float]):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    asset_mapping = {a.ticker: a for a in portfolio.assets}
    target_weights = {asset_mapping[k]: v for k, v in target_weights.items()}
    transactions = portfolio.rebalance(target_weights, inplace=False)
    return {
        t.id: {
            'type': t.type,
            'asset': t.asset.ticker if isinstance(t.asset, Asset) else t.asset,
            'shares': t.shares,
            'value': t.value,
            'profit': t.profit,
            'date': t.date,
        }
        for t in transactions
    }

@router.patch('/{portfolio_id}/parse_transactions', response_model=Dict[str, str])
def parse_transactions(portfolio_id: str, transactions: PortfolioTransactions):
    portfolio: Portfolio = portfolio_cache[portfolio_id]
    asset_mapping = {a.ticker: a for a in portfolio.cost_bases}

    t_list = [
        Portfolio.transaction(
            v.type,
            asset_mapping.get(v.asset, 'Cash'),
            v.shares,
            v.value,
            v.profit,
            v.date,
            k
        ) for k, v in transactions.root.items()
    ]

    portfolio.from_transactions(t_list)
    return {
        'status': 'success',
        'message': 'Transactions parsed successfully',
    }

# optimizing flow: optimize: weights -> rebalance: transactions -> parse_transactions
# rebalancing flow: rebalance: transactions -> parse_transactions
# portfolio for volatility/returns/sharpe ratio: efficient_frontier: weights -> rebalance: transactions -> parse_transactions