from pydantic import BaseModel, Field, RootModel
from typing import Dict, List, Optional
from enum import Enum
from app.models.common import PlotJSON

class PortfolioInitialHoldings(BaseModel):
    asset: str = Field(..., title='Asset', description='The asset ticker according to Yahoo Finance')
    shares: float = Field(..., title='Shares', description='The number of shares held')
    avg_price: float = Field(..., title='Average Price', description='The average buying price of the holding')

class PortfolioCreatePost(BaseModel):
    assets: List[PortfolioInitialHoldings] = Field(None, title='Initial Holdings', description='The initial holdings of the portfolio')
    cash: float = Field(0, title='Cash', description='The initial cash in the portfolio')
    currency: Optional[str] = Field(None, title='Currency', description='The currency of the portfolio')
    r: float = Field(0.02, title='Risk-Free Rate', description='The risk-free rate for the portfolio')
    name: Optional[str] = Field(None, title='Name', description='The name of the portfolio')

class PortfolioCreate(BaseModel):
    portfolio_id: str = Field(..., title='Portfolio ID', description='The unique identifier for the portfolio')
    currency: str = Field(..., title='Currency', description='The currency of the portfolio')
    cash: float = Field(..., title='Cash', description='The current cash in the portfolio')
    holdings: Dict[str, float] = Field(..., title='Holdings', description='The current holdings in the portfolio')

class CashflowResponse(BaseModel):
    cashflow: float = Field(..., title='Cashflow', description='The cashflow value')
    current_cash: float = Field(..., title='Current Cash', description='The current cash in the portfolio')

class TradeResponse(BaseModel):
    asset_ticker: str = Field(..., title='Asset Ticker', description='The asset ticker according to Yahoo Finance')
    shares: float = Field(..., title='Shares', description='The number of shares traded')
    value: float = Field(..., title='Value', description='The value of the trade')
    date: str = Field(..., title='Date', description='The date of the trade')
    current_cash: float = Field(..., title='Remaining Cash', description='The remaining cash in the portfolio')

class DailyReturnsMetrics(BaseModel):
    mean: float = Field(..., title='Mean', description='The mean daily returns')
    median: float = Field(..., title='Median', description='The median daily returns')
    std: float = Field(..., title='Standard Deviation', description='The standard deviation of the daily returns')
    skewness: float = Field(..., title='Skewness', description='The skewness of the daily returns')
    kurtosis: float = Field(..., title='Kurtosis', description='The kurtosis of the daily returns')

class PerformanceMetrics(BaseModel):
    total_returns: float = Field(..., title='Total Returns', description='The total returns of the portfolio')
    trading_returns: float = Field(..., title='Trading Returns', description='The returns from trading')
    annualized_returns: float = Field(..., title='Annualized Returns', description='The annualized returns of the portfolio')
    daily_returns: DailyReturnsMetrics = Field(..., title='Daily Returns', description='The daily returns statistics')
    best_day: float = Field(..., title='Best Day', description='The returns of the best day')
    worst_day: float = Field(..., title='Worst Day', description='The returns of the worst day')
    positive_days: float = Field(..., title='Positive Days', description='Ratio of days with positive returns')

class RiskMetrics(BaseModel):
    volatility: float = Field(..., title='Volatility', description='The volatility of the portfolio')
    sharpe_ratio: float = Field(..., title='Sharpe Ratio', description='The Sharpe ratio of the portfolio')
    sortino_ratio: float = Field(..., title='Sortino Ratio', description='The Sortino ratio of the portfolio')
    beta: float = Field(..., title='Beta', description='The beta of the portfolio')
    value_at_risk: float = Field(..., title='Value at Risk', description='The VAR of the portfolio at 95% confidence')
    tracking_error: float = Field(..., title='Tracking Error', description='The tracking error of the portfolio compared to SPY')
    information_ratio: float = Field(..., title='Information Ratio', description='The information ratio of the portfolio compared to SPY')
    treynor_ratio: float = Field(..., title='Treynor Ratio', description='The Treynor ratio of the portfolio')

class DrawdownMetrics(BaseModel):
    max_drawdown: float = Field(..., title='Max Drawdown', description='The maximum drawdown value of the portfolio')
    longest_drawdown_duration: Dict[str, str | int | None] = Field(..., title='Longest Drawdown Duration', description='The start, end date and duration of the longest drawdown')
    average_drawdown: float = Field(..., title='Average Drawdown', description='The average drawdown value of the portfolio')
    average_drawdown_duration: float = Field(..., title='Average Drawdown Duration', description='The average duration of a drawdown')
    time_to_recovery: float = Field(..., title='Time to Recovery', description='The average time to recover from a drawdown')
    drawdown_ratio: float = Field(..., title='Drawdown Ratio', description='The drawdown ratio of the portfolio')
    calmar_ratio: float = Field(..., title='Calmar Ratio', description='The Calmar ratio of the portfolio')

class PositionMetrics(BaseModel):
    total_value: float = Field(..., title='Total Value', description='The current total value of the portfolio')
    cash: float = Field(..., title='Cash', description='The current cash in the portfolio')
    cash_weight: float = Field(..., title='Cash Weight', description='The weight of cash in the portfolio')
    number_of_positions: int = Field(..., title='Number of Positions', description='The number of positions in the portfolio')
    largest_position: float = Field(..., title='Largest Position', description='The weight of the largest position')
    smallest_position: float = Field(..., title='Smallest Position', description='The weight of the smallest position')
    concentration: float = Field(..., title='Concentration', description='The concentration of the portfolio')

class ActivityMetrics(BaseModel):
    realized_pnl: float = Field(..., title='Realized PnL', description='The realized profit and loss of the portfolio from trades')
    unrealized_pnl: float = Field(..., title='Unrealized PnL', description='The unrealized profit and loss of the portfolio from holdings')
    total_pnl: float = Field(..., title='Total PnL', description='The total profit and loss of the portfolio from trades and holdings')
    investment_pnl: float = Field(..., title='Investment PnL', description='The difference between current value and initial investment')
    net_deposits: float = Field(..., title='Net Deposits', description='The net deposits into the portfolio')
    number_of_trades: int = Field(..., title='Number of Trades', description='The number of buys and sells')
    win_rate: float = Field(..., title='Win Rate', description='The percentage of winning trades')
    profit_factor: float = Field(..., title='Profit Factor', description='The ratio of gross profit to gross loss')
    average_win_loss_ratio: float = Field(..., title='Average Win/Loss Ratio', description='The ratio of average win to average loss')

class PortfolioStats(BaseModel):
    performance: PerformanceMetrics = Field(..., title='Performance', description='The performance metrics of the portfolio')
    risk: RiskMetrics = Field(..., title='Risk', description='The risk metrics of the portfolio')
    drawdown: DrawdownMetrics = Field(..., title='Drawdown', description='The drawdown metrics of the portfolio')
    position: PositionMetrics = Field(..., title='Positions', description='The position metrics of the portfolio')
    activity: ActivityMetrics = Field(..., title='Activity', description='The activity metrics of the portfolio')

class HoldingsMetrics(BaseModel):
    shares: float = Field(..., title='Shares', description='The number of shares held')
    weight: float = Field(..., title='Weight', description='The weight of the holding in the portfolio')
    pnl: float = Field(..., title='PnL', description='The profit and loss of the holding')
    returns: float = Field(..., title='Returns', description='The returns of the holding')
    value: float = Field(..., title='Value', description='The current value of the holding')
    cost_basis: float = Field(..., title='Cost Basis', description='The average buying price of the holding')
    deposited: float = Field(..., title='Deposited', description='The total amount deposited into the holding')

class HoldingsStats(RootModel):
    root: Dict[str, HoldingsMetrics] = Field(..., title='Holdings', description='The holdings metrics for each asset in the portfolio')

class HoldingsPlots(BaseModel):
    holdings_chart: Optional[PlotJSON] = Field(None, title='Holdings Chart', description='The pie chart representing the weights of each asset')
    asset_type_exposure: Optional[PlotJSON] = Field(None, title='Asset Type Exposure', description='The pie chart representing the exposure to each asset type')
    sector_exposure: Optional[PlotJSON] = Field(None, title='Sector Exposure', description='The pie chart representing the exposure to each sector')
    correlation_matrix: Optional[PlotJSON] = Field(None, title='Correlation Matrix', description='The correlation matrix of the assets')

class ReturnsPlots(BaseModel):
    returns_chart: Optional[PlotJSON] = Field(None, title='Returns Chart', description='The line chart representing the daily returns')
    returns_dist: Optional[PlotJSON] = Field(None, title='Returns Distribution', description='The histogram representing the returns distribution')
    pnl_chart: Optional[PlotJSON] = Field(None, title='PnL Chart', description='The line chart representing the profit and loss')

class RiskPlots(BaseModel):
    risk_decomposition: Optional[PlotJSON] = Field(None, title='Risk Decomposition', description='The pie chart representing the risk decomposition for each asset in the portfolio')
    drawdown_plot: Optional[PlotJSON] = Field(None, title='Drawdown Plot', description='The line chart representing the drawdowns')
    drawdown_frequency: Optional[PlotJSON] = Field(None, title='Drawdown Frequency', description='The histogram representing the drawdown frequency')

class PortfolioPlots(BaseModel):
    holdings: HoldingsPlots = Field(..., title='Holdings', description='The holdings plots of the portfolio')
    returns: ReturnsPlots = Field(..., title='Returns', description='The returns plots of the portfolio')
    risk: RiskPlots = Field(..., title='Risk', description='The risk plots of the portfolio')

class TransactionType(str, Enum):
    BUY = 'BUY'
    SELL = 'SELL'
    DEPOSIT = 'DEPOSIT'
    WITHDRAW = 'WITHDRAW'

class TransactionData(BaseModel):
    type: TransactionType = Field(..., title='Type', description='The type of transaction')
    asset: str = Field(..., title='Asset', description='The asset ticker or cash')
    shares: float = Field(..., title='Shares', description='The number of shares traded')
    value: float = Field(..., title='Value', description='The value of the trade')
    profit: float = Field(..., title='Profit', description='The profit of the trade')
    date: str = Field(..., title='Date', description='The date of the trade')

class PortfolioTransactions(RootModel):
    root: Dict[float, TransactionData] = Field(..., title='Transactions', description='The transaction data for each transaction in the portfolio/rebalance transactions to be made')

class PortfolioOptimize(BaseModel):
    returns: float = Field(..., title='Returns', description='The expected returns of the optimal portfolio')
    volatility: float = Field(..., title='Volatility', description='The expected volatility of the optimal portfolio')
    sharpe_ratio: float = Field(..., title='Sharpe Ratio', description='The expected Sharpe ratio of the optimal portfolio')
    weights: Dict[str, float] = Field(..., title='Weights', description='The optimal weights for each asset in the portfolio')

class PortfolioEfficientFrontier(BaseModel):
    efficient_frontier: PlotJSON = Field(..., title='Efficient Frontier', description='The efficient frontier plot of the portfolio')
    returns: List[float] = Field(..., title='Returns', description='The (sorted) expected returns of the portfolios on the efficient frontier')
    volatilities: List[float] = Field(..., title='Volatilities', description='The expected volatilities of the portfolios on the efficient frontier')
    sharpe_ratios: List[float] = Field(..., title='Sharpe Ratios', description='The expected Sharpe ratios of the portfolios on the efficient frontier')
    weights: List[Dict[str, float]] = Field(..., title='Weights', description='The optimal weights for each asset in the portfolios on the efficient frontier')
