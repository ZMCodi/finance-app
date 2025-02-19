''' Signal generation module for technical analysis trading strategies.

This module provides functions for generating trading signals from various technical indicators.
All signals are standardized to -1 (sell) or 1 (buy) values.

Module Structure:
- Core Signal Functions: Main entry points for each indicator type
    * ma_crossover: Moving average crossover signals
    * rsi: RSI signals with multiple methods
    * macd: MACD signals with multiple methods
    * bb: Bollinger Bands signals with multiple methods

- Signal Integration
    * vote: Combines multiple signals using weighted voting
    * fill: Ensures continuous signals by forward-filling values

- Pattern Detection
    * find_momentum_divergence: Finds regular and hidden divergence patterns
    * find_double_patterns: Detects double tops and bottoms
    * divergence_signals: Converts divergence patterns to signals
    * double_pattern_signals: Converts double patterns to signals

Signal Generation Methods:
1. Moving Average:
   - Simple crossover between fast and slow MAs

2. RSI:
   - Traditional overbought/oversold crossovers
   - Regular and hidden divergence
   - Mean reversion

3. MACD:
   - Signal line crossovers
   - Regular and hidden divergence
   - Momentum analysis
   - Double peaks/troughs

4. Bollinger Bands:
   - Band bounces
   - Double touches
   - Band walks
   - Squeezes
   - Breakouts
   - %B indicator

Signal Combination Methods:
- Weighted: Weighted average of signals with threshold
- Unanimous: All signals must agree
- Majority: Most signals must agree
'''

import numpy as np
import pandas as pd
from scipy.signal import find_peaks
from typing import Optional
import numba as nb

def ma_crossover(short: pd.Series, long: pd.Series) -> np.ndarray:
    """Generate trading signals from moving average crossovers.

    Buy signal (1) when short MA crosses above long MA.
    Sell signal (-1) when short MA crosses below long MA.

    Args:
        short (pd.Series): Short-term moving average
        long (pd.Series): Long-term moving average

    Returns:
        np.ndarray: Array of -1 and 1 values indicating sell and buy signals
    """
    return np.where(short > long, 1, -1)


def rsi(RSI: pd.Series, price: pd.Series, ub: float, lb: float, 
        exit: str, signal_type: list[str], combine: str, 
        threshold: float, weights: Optional[list[float]] = None, 
        m_rev_bound: float = 50) -> pd.Series:
    """Generate trading signals from RSI using multiple methods.

    Main entry point for RSI signal generation. Combines multiple signal types:
    - Traditional overbought/oversold crossovers
    - Regular price/RSI divergence
    - Hidden divergence patterns

    Args:
        RSI (pd.Series): RSI values
        price (pd.Series): Price series for divergence detection
        ub (float): Upper bound for overbought condition
        lb (float): Lower bound for oversold condition
        exit (str): Exit signal type ('re' for mean reversion)
        signal_type (list[str]): List of signal types to use
        combine (str): Signal combination method ('weighted', 'unanimous', 'majority')
        threshold (float): Voting threshold for signal generation
        weights (list[float], optional): Weights for each signal type. Defaults to equal weights.
        m_rev_bound (float, optional): Mean reversion level. Defaults to 50.

    Returns:
        pd.Series: Combined trading signals (-1 or 1)
    """
    signals = pd.DataFrame(index=RSI.index)

    if 'crossover' in signal_type:
        signals['crossover'] = rsi_crossover(RSI, ub, lb, exit, m_rev_bound)

    if 'divergence' in signal_type:
        signals['divergence'] = rsi_divergence(RSI, price, False)

    if 'hidden divergence' in signal_type:
        signals['hidden_div'] = rsi_divergence(RSI, price, True)

    if combine == 'unanimous':
        threshold = 1
        weights = [1 / len(signals.columns)] * len(signals.columns)
    elif combine == 'majority':
        weights = [1 / len(signals.columns)] * len(signals.columns)

    return vote(signals, threshold, weights)


def rsi_divergence(RSI: pd.Series, price: pd.Series, hidden: bool = False) -> pd.Series:
    """Generate signals from RSI/price divergence patterns.

    Wrapper function that uses find_momentum_divergence to detect divergences
    and converts them to trading signals.

    Args:
        RSI (pd.Series): RSI values
        price (pd.Series): Price series
        hidden (bool, optional): Use hidden divergence. Defaults to False.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    return divergence_signals(RSI, *find_momentum_divergence(price, RSI, hidden=hidden))


def rsi_crossover(RSI: pd.Series, ub: float, lb: float, 
                 exit: str, m_rev_bound: Optional[float] = None) -> pd.Series:
    """Generate signals from RSI crossing overbought/oversold levels.

    Two modes of operation:
    1. Standard: Signals on crossing overbought/oversold levels
    2. Mean reversion: Signals on crossing back from extreme levels
    
    Optional mean reversion modification changes short signals to long
    when RSI falls below mean reversion level.

    Args:
        RSI (pd.Series): RSI values
        ub (float): Upper bound for overbought
        lb (float): Lower bound for oversold
        exit (str): Exit signal type ('re' for mean reversion)
        m_rev_bound (float, optional): Mean reversion level. Defaults to None.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    if exit == 're':
        signal = np.where(
            (RSI.shift(1) > ub) & (RSI < ub), -1, 
            np.where((RSI.shift(1) < lb) & (RSI > lb), 1, np.nan)
        )
        short_entries = (RSI.shift(1) > ub) & (RSI < ub)
    else:
        signal = np.where(
            RSI > ub, -1,
            np.where(RSI < lb, 1, np.nan)
        )
        short_entries = (RSI.shift(1) <= ub) & (RSI > ub)

    signal = pd.Series(signal, index=RSI.index)
    signal = fill(signal)

    if m_rev_bound is not None:
        mean_rev_points = (RSI <= m_rev_bound) & (signal == -1)
        groups = short_entries.cumsum()
        mean_rev_triggered = mean_rev_points.groupby(groups).cummax()
        signal = np.where(mean_rev_triggered, 1, signal)

    return signal


def macd(macd_hist: pd.Series, macd: pd.Series, price: pd.Series, 
         signal_type: list[str], combine: str, threshold: float, 
         weights: Optional[list[float]] = None) -> pd.Series:
    """Generate trading signals from MACD using multiple methods.

    Main entry point for MACD signal generation. Combines multiple signal types:
    - Histogram zero-line crossovers
    - Price/MACD divergence
    - Hidden divergence patterns
    - Momentum analysis
    - Double peak/trough patterns

    Args:
        macd_hist (pd.Series): MACD histogram values
        macd (pd.Series): MACD line values
        price (pd.Series): Price series for divergence detection
        signal_type (list[str]): List of signal types to use
        combine (str): Signal combination method ('weighted', 'unanimous', 'majority')
        threshold (float): Voting threshold for signal generation
        weights (list[float], optional): Weights for each signal type. Defaults to equal weights.

    Returns:
        pd.Series: Combined trading signals (-1 or 1)
    """
    signals = pd.DataFrame(index=macd_hist.index)

    if 'crossover' in signal_type:
        signals['crossover'] = np.where(macd_hist > 0, 1, -1)

    if 'divergence' in signal_type:
        signals['divergence'] = macd_divergence(macd, price, False)

    if 'hidden divergence' in signal_type:
        signals['hidden_div'] = macd_divergence(macd, price, True)

    if 'momentum' in signal_type:
        signals['momentum'] = macd_momentum(macd_hist)

    if 'double peak/trough' in signal_type:
        signals['double'] = macd_double(macd_hist)

    if combine == 'unanimous':
        threshold = 1
        weights = [1 / len(signals.columns)] * len(signals.columns)
    elif combine == 'majority':
        weights = [1 / len(signals.columns)] * len(signals.columns)

    return vote(signals, threshold, weights)


def macd_divergence(macd: pd.Series, price: pd.Series, hidden: bool = False) -> pd.Series:
    """Generate signals from MACD/price divergence patterns.

    Wrapper function that uses find_momentum_divergence to detect divergences
    and converts them to trading signals.

    Args:
        macd (pd.Series): MACD line values
        price (pd.Series): Price series
        hidden (bool, optional): Use hidden divergence. Defaults to False.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    return divergence_signals(macd, *find_momentum_divergence(price, macd, hidden=hidden))


def macd_momentum(macd_hist: pd.Series) -> pd.Series:
    """Generate signals from MACD histogram momentum changes.

    Generates signals based on histogram slope changes:
    - Buy when negative histogram starts increasing
    - Sell when positive histogram starts decreasing

    Args:
        macd_hist (pd.Series): MACD histogram values

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    signal = np.where(
        (macd_hist.shift(1) < macd_hist)
        & (macd_hist.shift(1) < 0), 1,
        np.where(
            (macd_hist.shift(1) > macd_hist)
            & (macd_hist.shift(1) > 0), -1, np.nan
        )
    )

    signal = pd.Series(signal, index=macd_hist.index)
    return fill(signal)


def macd_double(macd_hist: pd.Series) -> pd.Series:
    """Generate signals from MACD histogram double patterns.

    Wrapper function that uses find_double_patterns to detect double tops
    and bottoms in the histogram and converts them to trading signals.

    Args:
        macd_hist (pd.Series): MACD histogram values

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    return double_pattern_signals(macd_hist, *find_double_patterns(macd_hist))


def bb(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series,
      signal_type: list[str], combine: str, threshold: float,
      weights: Optional[list[float]] = None) -> pd.Series:
    """Generate trading signals from Bollinger Bands using multiple methods.

    Main entry point for Bollinger Bands signal generation. Combines multiple signal types:
    - Band bounces (reversals at bands)
    - Double touches (multiple tests of bands)
    - Band walks (price following along bands)
    - Band squeeze (volatility contraction)
    - Band breakouts (momentum breaks outside bands)
    - %B indicator (normalized price position)

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band
        signal_type (list[str]): List of signal types to use
        combine (str): Signal combination method ('weighted', 'unanimous', 'majority')
        threshold (float): Voting threshold for signal generation
        weights (list[float], optional): Weights for each signal type. Defaults to equal weights.

    Returns:
        pd.Series: Combined trading signals (-1 or 1)
    """
    signals = pd.DataFrame(index=price.index)

    if 'bounce' in signal_type:
        signals['bounce'] = bb_bounce(price, bb_up, bb_down)

    if 'double' in signal_type:
        signals['double'] = bb_double(price, bb_up, bb_down)

    if 'walks' in signal_type:
        signals['walks'] = bb_walks(price, bb_up, bb_down)

    if 'squeeze' in signal_type:
        signals['squeeze'] = bb_squeeze(price, bb_up, bb_down)

    if 'breakout' in signal_type:
        signals['breakout'] = bb_breakout(price, bb_up, bb_down)

    if '%B' in signal_type:
        signals['%B'] = bb_pctB(price, bb_up, bb_down)

    if combine == 'unanimous':
        threshold = 1
        weights = [1 / len(signals.columns)] * len(signals.columns)
    elif combine == 'majority':
        weights = [1 / len(signals.columns)] * len(signals.columns)

    return vote(signals, threshold, weights)


def bb_bounce(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series) -> pd.Series:
    """Generate signals from price bouncing off Bollinger Bands.

    Signals generated when price reverses after touching bands:
    - Buy when price bounces up from lower band
    - Sell when price bounces down from upper band

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    signal = pd.Series(np.where(
        (price.shift(1) > bb_up) & (price < bb_up), -1,
        np.where(
            (price.shift(1) < bb_down) & (price > bb_down), 1, np.nan
        )
    ), index=price.index)

    return fill(signal)


def bb_double(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series) -> pd.Series:
    """Generate signals from double touches of Bollinger Bands.

    Normalizes price position relative to bands and detects double top/bottom patterns.

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    rel_width = bb_up - bb_down
    hist = pd.Series(np.where(
        price > bb_up, (price - bb_up) / rel_width,
        np.where(price < bb_down, (price - bb_down) / rel_width, 0)
    ), index=price.index)

    return double_pattern_signals(price, *find_double_patterns(hist, 5, 15))


def bb_walks(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series,
            prox: float = 0.2, periods: int = 5) -> pd.Series:
    """Generate signals from price walking along Bollinger Bands.

    Detects when price consistently stays near bands:
    - Buy when walking along upper band
    - Sell when walking along lower band

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band
        prox (float, optional): Proximity threshold to bands. Defaults to 0.2.
        periods (int, optional): Required consecutive periods. Defaults to 5.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    width = bb_up - bb_down
    close_upper = np.abs(price - bb_up) < width * prox
    close_lower = np.abs(price - bb_down) < width * prox

    upper_walk = close_upper.rolling(periods).sum() >= periods - 1
    lower_walk = close_lower.rolling(periods).sum() >= periods - 1

    walk = pd.Series(np.where(upper_walk, 1,
                    np.where(lower_walk, -1, np.nan)), index=price.index)

    return fill(walk)


def bb_squeeze(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series,
              aggressive: bool = False) -> pd.Series:
    """Generate signals from Bollinger Band squeezes.

    Detects volatility contraction (squeeze) followed by expansion:
    - Buy when price moves up after squeeze
    - Sell when price moves down after squeeze

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band
        aggressive (bool, optional): Use aggressive entry. Defaults to False.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    width = bb_up - bb_down
    squeeze = width < width.rolling(20).quantile(0.2)

    if aggressive:
        ext = (width > width.shift(1)) & squeeze.shift(1)
    else:
        ext = ~squeeze & squeeze.shift(1)

    signal = pd.Series(np.where(
        ext & (price > price.shift(1)), 1,
        np.where(ext & (price < price.shift(1)), -1, np.nan)
    ), index=price.index)

    return fill(signal)


def bb_breakout(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series,
                threshold: float = 0.3) -> pd.Series:
    """Generate signals from Bollinger Band breakouts.

    Detects strong momentum moves outside bands:
    - Buy on upward breakout with momentum
    - Sell on downward breakout with momentum

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band
        threshold (float, optional): Momentum threshold. Defaults to 0.3.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    momentum = price.pct_change()
    mom_range = momentum.max() - momentum.min()

    signal = pd.Series(np.where(
        (price > bb_up) & (momentum > threshold * mom_range), 1,
        np.where((price < bb_down) & (momentum < -threshold * mom_range), -1, np.nan)
    ), index=price.index)

    return fill(signal)


def bb_pctB(price: pd.Series, bb_up: pd.Series, bb_down: pd.Series,
            overbought: float = 0.8, oversold: float = 0.2) -> pd.Series:
    """Generate signals from %B indicator.

    %B normalizes price position within Bollinger Bands.
    Generates signals based on overbought/oversold levels.

    Args:
        price (pd.Series): Price series
        bb_up (pd.Series): Upper Bollinger Band
        bb_down (pd.Series): Lower Bollinger Band
        overbought (float, optional): Overbought threshold. Defaults to 0.8.
        oversold (float, optional): Oversold threshold. Defaults to 0.2.

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    pctB = (price - bb_down) / (bb_up - bb_down)
    signal = pd.Series(np.where(pctB > overbought, -1,
                      np.where(pctB < oversold, 1, np.nan)), index=price.index)

    return fill(signal)


def find_momentum_divergence(price: pd.Series, indicator: pd.Series,
                           distance_min: int = 7, distance_max: int = 25,
                           prominence: float = 0.05, hidden: bool = False,
                           is_rsi: bool = False, ub: float = 0.7,
                           lb: float = 0.3) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """Find regular or hidden divergences between price and momentum indicator.

    Works with both MACD and RSI indicators. Uses peak detection to identify 
    potential divergence patterns in price and indicator movements.

    Regular divergence:
    - Bearish: Higher price high with lower indicator high
    - Bullish: Lower price low with higher indicator low

    Hidden divergence:
    - Bearish: Lower price high with higher indicator high
    - Bullish: Higher price low with lower indicator low

    Args:
        price (pd.Series): Price series
        indicator (pd.Series): Indicator series (MACD or RSI)
        distance_min (int, optional): Minimum distance between peaks. Defaults to 7.
        distance_max (int, optional): Maximum distance between peaks. Defaults to 25.
        prominence (float, optional): Required peak prominence. Defaults to 0.05.
        hidden (bool, optional): Find hidden divergences. Defaults to False.
        is_rsi (bool, optional): True if indicator is RSI. Defaults to False.
        ub (float, optional): RSI upper bound. Defaults to 0.7.
        lb (float, optional): RSI lower bound. Defaults to 0.3.

    Returns:
        tuple[list[tuple[int, int]], list[tuple[int, int]]]: Lists of (price_idx, indicator_idx)
            for bearish and bullish divergences
    """
    price_peaks, _ = find_peaks(price, distance=distance_min,
                               prominence=prominence*(price.max() - price.min()))
    price_troughs, _ = find_peaks(-price, distance=distance_min,
                                 prominence=prominence*(price.max() - price.min()))
    
    ind_peaks, _ = find_peaks(indicator, distance=distance_min,
                             prominence=prominence*(indicator.max() - indicator.min()))
    ind_troughs, _ = find_peaks(-indicator, distance=distance_min,
                               prominence=prominence*(indicator.max() - indicator.min()))

    bearish_divs = []
    for i in range(len(price_peaks)-1):
        peak1_idx = price_peaks[i]
        peak2_idx = price_peaks[i+1]

        if peak2_idx - peak1_idx > distance_max:
            continue

        # Regular: price higher high + indicator lower high
        # Hidden: price lower high + indicator higher high
        if (not hidden and price.iloc[peak2_idx] > price.iloc[peak1_idx]) or \
           (hidden and price.iloc[peak2_idx] < price.iloc[peak1_idx]):

            ind_peak1 = ind_peaks[(ind_peaks >= peak1_idx - distance_min) & 
                                (ind_peaks <= peak1_idx + distance_min)]
            ind_peak2 = ind_peaks[(ind_peaks >= peak2_idx - distance_min) & 
                                (ind_peaks <= peak2_idx + distance_min)]

            if len(ind_peak1) > 0 and len(ind_peak2) > 0:
                if (not hidden and indicator.iloc[ind_peak2[0]] < indicator.iloc[ind_peak1[0]]) or \
                   (hidden and indicator.iloc[ind_peak2[0]] > indicator.iloc[ind_peak1[0]]):
                    # For RSI bearish, more significant if peaks are in overbought territory
                    if not is_rsi or indicator.iloc[ind_peak1[0]] > ub:
                        bearish_divs.append((int(peak2_idx), int(ind_peak2[0])))

    bullish_divs = []
    for i in range(len(price_troughs)-1):
        trough1_idx = price_troughs[i]
        trough2_idx = price_troughs[i+1]

        if trough2_idx - trough1_idx > distance_max:
            continue

        # Regular: price lower low + indicator higher low
        # Hidden: price higher low + indicator lower low
        if (not hidden and price.iloc[trough2_idx] < price.iloc[trough1_idx]) or \
           (hidden and price.iloc[trough2_idx] > price.iloc[trough1_idx]):

            ind_trough1 = ind_troughs[(ind_troughs >= trough1_idx - distance_min) & 
                                    (ind_troughs <= trough1_idx + distance_min)]
            ind_trough2 = ind_troughs[(ind_troughs >= trough2_idx - distance_min) & 
                                    (ind_troughs <= trough2_idx + distance_min)]

            if len(ind_trough1) > 0 and len(ind_trough2) > 0:
                if (not hidden and indicator.iloc[ind_trough2[0]] > indicator.iloc[ind_trough1[0]]) or \
                   (hidden and indicator.iloc[ind_trough2[0]] < indicator.iloc[ind_trough1[0]]):
                    # For RSI bullish, more significant if troughs are in oversold territory
                    if not is_rsi or indicator.iloc[ind_trough1[0]] < lb:
                        bullish_divs.append((int(trough2_idx), int(ind_trough2[0])))

    return bearish_divs, bullish_divs


def divergence_signals(df: pd.Series, bearish_divs: list[tuple[int, int]], 
                      bullish_divs: list[tuple[int, int]]) -> pd.Series:
    """Convert divergence pattern indices to trading signals.

    Creates a signal series with -1 at bearish divergence points
    and 1 at bullish divergence points.

    Args:
        df (pd.Series): Original series for index alignment
        bearish_divs (list[tuple[int, int]]): List of bearish divergence points
        bullish_divs (list[tuple[int, int]]): List of bullish divergence points

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    signal = pd.Series(np.nan, index=df.index)

    for price_idx, _ in bearish_divs:
        signal.iloc[price_idx] = -1

    for price_idx, _ in bullish_divs:
        signal.iloc[price_idx] = 1

    return fill(signal)


def find_double_patterns(hist: pd.Series, distance_min: int = 7, 
                        distance_max: int = 25, prominence: float = 0.05) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """Find double tops and bottoms in indicator values.

    Uses peak detection to identify:
    - Double tops: Two positive peaks, first higher than second
    - Double bottoms: Two negative troughs, first lower than second
    
    Validates patterns by checking for significant valley/peak between points.

    Args:
        hist (pd.Series): Series to analyze for patterns
        distance_min (int, optional): Minimum distance between peaks. Defaults to 7.
        distance_max (int, optional): Maximum distance between peaks. Defaults to 25.
        prominence (float, optional): Required peak prominence. Defaults to 0.05.

    Returns:
        tuple[list[tuple[int, int]], list[tuple[int, int]]]: Lists of (first_idx, second_idx)
            for tops and bottoms
    """
    prominence *= (hist.max() - hist.min())

    # Find all peaks first
    peaks, _ = find_peaks(hist, 
                          distance=distance_min,
                          prominence=prominence)

    # Filter for positive peaks only
    pos_peaks = peaks[hist.iloc[peaks] > 0]

    # Find all troughs
    troughs, _ = find_peaks(-hist,
                            distance=distance_min,
                            prominence=prominence)

    # Filter for negative troughs only
    neg_troughs = troughs[hist.iloc[troughs] < 0]

    hist = hist.values

    return _find_double_pattern_numba(hist, pos_peaks, neg_troughs, distance_max)


@nb.jit
def _find_double_pattern_numba(hist: np.array, pos_peaks: np.array, neg_troughs: np.array, 
                               distance_max: int) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """Numba compiled helper function for find_double_pattern

        Args:
            hist (np.array): Array of historical values
            pos_peaks (np.array): Array of positive peak indices
            neg_troughs (np.array): Array of negative trough indices
            distance_max (int): Maximum distance between patterns

        Returns:
            tuple[list[tuple[int, int]], list[tuple[int, int]]]: Lists of double tops and bottoms
    """
    double_tops = []
    double_bottoms = []

    # Find double tops (first higher than second)
    for i in range(len(pos_peaks) - 1):
        peak1_idx = pos_peaks[i]
        peak1_val = hist[peak1_idx]

        for j in range(i + 1, len(pos_peaks)):
            peak2_idx = pos_peaks[j]
            peak2_val = hist[peak2_idx]

            if peak2_idx - peak1_idx > distance_max:
                break

            if peak1_val > peak2_val:
                valley = hist[peak1_idx:peak2_idx].min()
                if valley < peak2_val:
                    double_tops.append((int(peak1_idx), int(peak2_idx)))
                    break

    # Find double bottoms (first lower than second)
    for i in range(len(neg_troughs) - 1):
        trough1_idx = neg_troughs[i]
        trough1_val = hist[trough1_idx]

        for j in range(i + 1, len(neg_troughs)):
            trough2_idx = neg_troughs[j]
            trough2_val = hist[trough2_idx]

            if trough2_idx - trough1_idx > distance_max:
                break

            if trough1_val < trough2_val:
                peak = hist[trough1_idx:trough2_idx].max()
                if peak > trough2_val:
                    double_bottoms.append((int(trough1_idx), int(trough2_idx)))
                    break

    return double_tops, double_bottoms


def double_pattern_signals(df: pd.Series, double_tops: list[tuple[int, int]],
                         double_bottoms: list[tuple[int, int]]) -> pd.Series:
    """Convert double pattern indices to trading signals.

    Creates signals at the confirmation points of patterns:
    - Sell (-1) after second peak of double top
    - Buy (1) after second trough of double bottom

    Args:
        df (pd.Series): Original series for index alignment
        double_tops (list[tuple[int, int]]): List of double top pattern indices
        double_bottoms (list[tuple[int, int]]): List of double bottom pattern indices

    Returns:
        pd.Series: Trading signals (-1 or 1)
    """
    signal = pd.Series(np.nan, index=df.index)

    for _, top2 in double_tops:
        signal.iloc[top2] = -1  # Bearish signal after second peak

    for _, bottom2 in double_bottoms:
        signal.iloc[bottom2] = 1  # Bullish signal after second trough

    return fill(signal)


def vote(signals: pd.DataFrame, threshold: float, weights: list[float]) -> pd.Series:
    """Combine multiple trading signals using weighted voting.

    Central function for signal combination used by all indicator types.
    Computes weighted average of signals and applies threshold.

    Args:
        signals (pd.DataFrame): DataFrame where each column is a signal series
        threshold (float): Required threshold for generating signal [-1 to 1]
        weights (list[float]): Weight for each signal (must sum to 1)

    Returns:
        pd.Series: Combined signal series (-1 or 1)
    """
    weights = np.array(weights)
    combined = signals.dot(weights)
    signal = pd.Series(np.where(combined > threshold, 1, 
                    np.where(combined < -threshold, -1, np.nan)), index=signals.index)
    return fill(signal)


def fill(series: pd.Series, default: int = 1) -> pd.Series:
    """Forward-fill signal series to ensure continuous positions.

    Fills initial NaN with default value then forward-fills remaining NaNs
    to maintain constant position until next signal.

    Args:
        series (pd.Series): Signal series with potential NaN values
        default (int, optional): Initial position. Defaults to 1.

    Returns:
        pd.Series: Continuous signal series of -1 and 1 values
    """
    if np.isnan(series.iloc[0]):
        series.iloc[0] = default
    return series.ffill().astype(int)

# TODO:
# bb signals: bounce, double, walks, squeeze, breakout, pctB
# better divergence method
# more rsi signals
# ATR, ADX
