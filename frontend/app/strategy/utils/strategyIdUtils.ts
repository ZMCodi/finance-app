// app/strategy/utils/strategyIdUtils.ts
import { IndicatorType } from '../components/IndicatorPanel';

/**
 * Maps strategy id prefixes to indicator types
 */
export const STRATEGY_PREFIX_MAP: Record<string, IndicatorType> = {
  'ma_crossover': 'MA Crossover',
  'rsi': 'RSI',
  'macd': 'MACD',
  'bb': 'Bollinger Bands'
};

/**
 * Extracts indicator type from a strategy ID
 * @param strategyId The strategy ID to analyze
 * @returns The corresponding indicator type or null if no match
 */
export function getIndicatorTypeFromId(strategyId: string): IndicatorType | null {
  for (const [prefix, indicatorType] of Object.entries(STRATEGY_PREFIX_MAP)) {
    if (strategyId.startsWith(prefix)) {
      return indicatorType;
    }
  }
  return null;
}

/**
 * Extracts strategy type prefix from a strategy ID
 * @param strategyId The strategy ID to analyze
 * @returns The strategy type prefix or null if no match
 */
export function getStrategyTypeFromId(strategyId: string): string | null {
  for (const prefix of Object.keys(STRATEGY_PREFIX_MAP)) {
    if (strategyId.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

/**
 * Creates a mapping of all strategy IDs to their indicator types
 * @param strategyIds Array of strategy IDs
 * @returns Record mapping each ID to its indicator type
 */
export function mapStrategyIdsToIndicators(strategyIds: string[]): Record<string, IndicatorType | null> {
  return strategyIds.reduce((acc, id) => {
    acc[id] = getIndicatorTypeFromId(id);
    return acc;
  }, {} as Record<string, IndicatorType | null>);
}