import scipy.optimize as sco
import numpy as np
import plotly.graph_objects as go
import math
import pandas as pd
from app.core.portfolio import Portfolio


class PortfolioOptimizer():

    def __init__(self, portfolio: Portfolio, min_alloc: float = 0., max_alloc: float = 1.):

        self.data = pd.DataFrame({asset: asset.daily['adj_close'] for asset in portfolio.assets}).dropna()
        self.rets = pd.DataFrame({asset: asset.daily['log_rets'] for asset in portfolio.assets}).dropna()

        weights = portfolio.weights
        self.weights = np.array([weights[asset] for asset in self.rets.columns])
        self.num_of_assets = len(portfolio.assets)
        self.r = portfolio.r

        self.min_alloc = min_alloc
        self.max_alloc = max_alloc
        self.ann_factor = 365 if all(a.asset_type == 'Cryptocurrency' for a in portfolio.assets) else 252

        self.optimize_sharpe()
        self.opt_sharpe_ratio = -self.opt_sharpe.fun
        self.opt_sharpe_weight = {ast: round(float(x), 5) for ast, x in zip(self.rets.columns, self.opt_sharpe.x)}

        self.t_rets = None
        self.t_vols = None
        self.t_weights = None

    def optimize_sharpe(self):

        def min_sharpe(weights):
            return - (self.port_rets(weights) - self.r) / self.port_vols(weights)

        cons = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bnds = tuple((self.min_alloc, self.max_alloc) for x in range(self.num_of_assets))
        eweights = np.array(self.num_of_assets * (1. / self.num_of_assets,))

        self.opt_sharpe = sco.minimize(min_sharpe, eweights, method='SLSQP', bounds=bnds, constraints=cons)

    @property
    def optimal_sharpe_portfolio(self):
        weights_array = np.array(list(self.opt_sharpe_weight.values()))
        return {
            'returns': round(float(self.port_rets(weights_array)), 3),
            'volatility': round(float(self.port_vols(weights_array)), 3),
            'sharpe_ratio': round(float(self.opt_sharpe_ratio), 3),
            'weights': self.opt_sharpe_weight
        }

    def port_rets(self, weights=None):
        if weights is None:
            weights = self.weights
        else:
            weights = np.array(weights)

        rets = np.array(self.rets.mean())
        if weights.ndim == 1:
            return float(np.sum(rets * weights) * self.ann_factor)
        else:
            return np.sum(rets * weights, axis=1) * self.ann_factor

    def port_vols(self, weights=None):
        if weights is None:
            weights = self.weights
        else:
            weights = np.array(weights)
        cov_matrix = self.rets.cov() * self.ann_factor

        if weights.ndim == 1:
            return float(np.sqrt(np.sum(weights * (weights @ cov_matrix))))
        else:
            return np.array(np.sqrt(np.sum(weights * (weights @ cov_matrix), axis=1)))

    def port_sharpe(self, weights):
        sharpe = (self.port_rets(weights) - self.r) / self.port_vols(weights)
        try:
            return float(sharpe)
        except:
            return sharpe

    def generate_constrained_weights(self, I):
        """Generate I sets of weights at once"""
        weights = np.zeros((I, self.num_of_assets))
        remaining = np.ones(I)

        for i in range(self.num_of_assets - 1):
            # Calculate valid ranges for all simulations at once
            min_for_this = np.maximum(
                self.min_alloc,
                remaining - (self.num_of_assets - i - 1) * self.max_alloc
            )
            max_for_this = np.minimum(
                self.max_alloc,
                remaining - (self.num_of_assets - i - 1) * self.min_alloc
            )

            # Generate weights for this asset for all simulations
            weights[:, i] = np.random.uniform(
                min_for_this, 
                max_for_this
            )
            remaining -= weights[:, i]

        # Set final weights
        weights[:, -1] = remaining

        # Return equal weights for any invalid combinations
        invalid_mask = (
            (weights < self.min_alloc).any(axis=1) | 
            (weights > self.max_alloc).any(axis=1) |
            ~np.isclose(weights.sum(axis=1), 1.0)
        )
        weights[invalid_mask] = np.full(self.num_of_assets, 1.0/self.num_of_assets)

        return weights

    def mcs_port_diagram(self, I=10000, plot=True):
        weights = self.generate_constrained_weights(I)
        returns = self.port_rets(weights)
        volatility = self.port_vols(weights)

        if plot:
                fig = go.Figure()
                fig.add_trace(
                    go.Scatter(
                        x=volatility, y=returns,
                        mode='markers',
                        marker=dict(
                            size=5,
                            colorbar=dict(title='Sharpe<br>Ratio'),
                            color=((returns - self.r) / volatility),
                            colorscale='RdBu_r',
                            showscale=True,
                        ), 
                        # showlegend=False
                    )
                )

                fig.update_layout(
                    title='Monte Carlo Simulation of Portfolio Weights',
                    xaxis_title='Expected Volatility',
                    yaxis_title='Expected Return',
                    coloraxis_colorbar=dict(title='Sharpe Ratio'),
                    hovermode='closest',
                    height=800,
                )

                fig.show()

        return volatility, returns


    def efficient_frontier(self, plot=True, I=10000, show_cml=True, points=50):
        eweights = np.array(self.num_of_assets * (1. / self.num_of_assets,))

        def min_vol(weights):
            return self.port_vols(weights)

        scatter_vols, scatter_rets = self.mcs_port_diagram(I=I, plot=False)

        t_rets = np.linspace(min(scatter_rets), max(scatter_rets), points)
        t_vols = []
        weights = []
        for t_ret in t_rets:
            cons = (
                {'type': 'eq', 'fun': lambda x: self.port_rets(x) - t_ret},
                {'type': 'eq', 'fun': lambda x: np.sum(x) - 1}
            )

            bnds = tuple((self.min_alloc, self.max_alloc) for x in range(self.num_of_assets))

            res = sco.minimize(min_vol, eweights, method='SLSQP',
                            bounds=bnds, constraints=cons)
            t_vols.append(res['fun'])
            weights.append([float(x) for x in res.x])

        t_vols = np.array(t_vols)

        t_vols = np.array(t_vols)
        optimal_weights = np.array(list(self.opt_sharpe_weight.values()))
        if plot:
            fig = go.Figure()
            fig.add_trace(
                    go.Scatter(
                        x=scatter_vols, y=scatter_rets,
                        mode='markers',
                        name='Random Portfolios',
                        marker=dict(
                            colorbar=dict(title='Sharpe<br>Ratio'),
                            size=5,
                            color=((scatter_rets - self.r) / scatter_vols),
                            colorscale='RdBu_r',
                            showscale=True
                        ),
                        showlegend=False,
                        hoverinfo='skip'
                    )
                )

            fig.add_trace(
                go.Scatter(
                    x=t_vols,
                    y=t_rets,
                    mode='lines',
                    name='Efficient Frontier',
                    line=dict(
                        color='blue',
                        width=3.5
                    ),
                    showlegend=False
                )
            )

            fig.add_trace(
                go.Scatter(
                    x=[self.port_vols(optimal_weights)],
                    y=[self.port_rets(optimal_weights)],
                    mode='markers',
                    name='Optimal Sharpe Portfolio',
                    marker=dict(
                        size=10,
                        color='blue'
                    ),
                    showlegend=False,
                )
            )

            # fig.add_annotation(
            #     text=(f'Optimal Sharpe Ratio: {round(self.opt_sharpe_ratio, 3)}<br>'
            #         f'Expected Return: {round(self.port_rets(optimal_weights), 3)}<br>'
            #         f'Expected Volatility: {round(self.port_vols(optimal_weights), 3)}<br>'
            #         ),
            #     xref='paper', yref='paper',
            #     x=0.05, y=0.95,
            #     showarrow=False,
            #     font=dict(
            #         size=10,
            #         color='black'
            #     ),
            #     align='left',
            #     bgcolor='white',
            #     bordercolor='black',
            #     borderwidth=1,
            #     xanchor='left',
            #     yanchor='top'

            # )

            fig.update_layout(
                # title='Efficient Frontier',
                # xaxis_title='Expected Volatility',
                xaxis=dict(
                    title='Expected Volatility',
                    gridcolor='rgba(128,128,128,0.2)',
                ),
                yaxis=dict(
                    title='Expected Return',
                    gridcolor='rgba(128,128,128,0.2)',
                ),
                coloraxis_colorbar=dict(title='Sharpe Ratio'),
                hovermode='closest',
                # height=800
            )

            # fig.show()
        self.t_vols, self.t_rets, self.t_weights = t_vols, t_rets, weights


        if show_cml:
            opt_weights = np.array(list(self.opt_sharpe_weight.values()))
            opt_ret = self.port_rets(opt_weights)
            opt_vol = self.port_vols(opt_weights)

            x = np.linspace(0, max(self.t_vols) * 1.2, 100)  # Extend a bit past the frontier
            y = self.r + (opt_ret - self.r) * (x / opt_vol)  # Equation of CML

            fig.add_trace(
                go.Scatter(
                    x=x, y=y,
                    mode='lines',
                    name='Capital Market Line',
                    line=dict(
                        color='green',
                        width=2,
                        dash='dash'
                    ),
                    showlegend=False,
                    cliponaxis=True
                )
            )

            fig.update_layout(
                xaxis_range=[min(scatter_vols) * 0.9, max(scatter_vols) * 1.1],
                yaxis_range=[min(scatter_rets) * 0.9, max(scatter_rets) * 1.1],
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                font=dict(color='white')
            )

        weights = [
            {ast.ticker: w for ast, w in zip(self.rets.columns, w)} for w in self.t_weights
        ]

        res = {
            'returns': [float(x) for x in self.t_rets],  # this is sorted
            'volatility': [float(x) for x in self.t_vols],
            'sharpe_ratio': [(r - self.r) / v for r, v in zip(self.t_rets, self.t_vols)],
            'weights': weights
        }
        return fig, res

    def find_nearest(self, array, value):
        idx = np.searchsorted(array, value, side="left")
        if idx > 0 and (idx == len(array) or math.fabs(value - array[idx - 1]) < math.fabs(value - array[idx])):
            return idx - 1
        else:
            return idx

    def portfolio_for_volatility(self, vol):
        if self.t_vols is None:
            self.efficient_frontier(plot=False)

        idx = self.find_nearest(self.t_vols, vol)
        returns = self.t_rets[idx]
        volatility = self.t_vols[idx]
        weights = {ast: round(float(w), 3) for ast, w in zip(self.rets.columns, self.t_weights[idx])}
        sharpe = round(float((self.t_rets[idx] - self.r) / self.t_vols[idx]), 3)

        return {'sharpe ratio': sharpe, 
                'returns': round(float(returns), 3),  
                'volatility': round(float(volatility), 3), 
                'weights': weights}

    def portfolio_for_returns(self, ret):
        if self.t_rets is None:
            self.efficient_frontier(plot=False)

        idx = self.find_nearest(self.t_rets, ret)
        returns = self.t_rets[idx]
        volatility = self.t_vols[idx]
        weights = {ast: round(float(w), 3) for ast, w in zip(self.rets.columns, self.t_weights[idx])}
        sharpe = round(float((self.t_rets[idx] - self.r) / self.t_vols[idx]), 3)

        return {'sharpe ratio': sharpe, 
                'returns': round(float(returns), 3),  
                'volatility': round(float(volatility), 3), 
                'weights': weights}

    @property
    def min_volatility_portfolio(self):
        if self.t_vols is None:
            self.efficient_frontier(plot=False)
        min_volatility = min(self.t_vols)
        return self.portfolio_for_volatility(min_volatility)

