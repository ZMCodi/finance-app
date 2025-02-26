// app/strategy/utils/strategyOperations.ts
import { IndicatorType, strategyNameMap } from '../components/IndicatorPanel';
import { StrategyParams, StrategyOptimize, StrategyPlot, PlotJSON } from '@/src/api/index';

export interface StrategyOperationsConfig {
  baseUrl: string;
}

export class StrategyOperations {
  private baseUrl: string;

  constructor(config: StrategyOperationsConfig) {
    this.baseUrl = config.baseUrl;
  }

  /**
   * Configure strategy parameters
   */
  async configureStrategy(
    strategyId: string,
    params: Record<string, any>
  ): Promise<StrategyParams> {
    try {
      console.log("Sending params to API using utils:", JSON.stringify(params, null, 2));
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/params`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to configure strategy: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error configuring strategy:', error);
      throw error;
    }
  }

  /**
   * Optimize strategy parameters
   */
  async optimizeStrategy(
    strategyId: string,
    timeframe: string = '1d',
    startDate?: string,
    endDate?: string
  ): Promise<StrategyOptimize> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      
      if (endDate) {
        params.append('end_date', endDate);
      }
      console.log("Optimizing strategy using utils:", strategyId, params.toString());
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/optimize/params?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to optimize strategy: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error optimizing strategy:', error);
      throw error;
    }
  }

  /**
 * Optimize weights for a strategy
 */
  async optimizeWeights(
    strategyId: string,
    timeframe: string = '1d',
    startDate?: string,
    endDate?: string,
    runs: number = 20
  ): Promise<StrategyOptimize> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      params.append('runs', runs.toString());
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      
      if (endDate) {
        params.append('end_date', endDate);
      }
      console.log("Optimizing weights using utils:", strategyId, params.toString());  // make sure this is printed
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/optimize/weights?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to optimize weights: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error optimizing weights:', error);
      throw error;
    }
  }

  /**
   * Generate signals for a strategy
   */
  async generateSignals(
    strategyId: string,
    timeframe: string = '1d',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      
      if (endDate) {
        params.append('end_date', endDate);
      }
      
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/signals?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to generate signals: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating signals:', error);
      throw error;
    }
  }

  /**
   * Create a combined strategy
   */
  async createCombinedStrategy(strategyId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/strategies/combined/create/${strategyId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create combined strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.strategy_id;
    } catch (error) {
      console.error('Error creating combined strategy:', error);
      throw error;
    }
  }

  /**
   * Add strategy to combined strategy
   */
  async addToCombinedStrategy(
    combinedStrategyId: string,
    strategyId: string,
    weight: number = 1.0
  ): Promise<StrategyParams> {
    try {
      const params = new URLSearchParams();
      params.append('weight', weight.toString());
      console.log("Adding to combined strategy using utils:", combinedStrategyId, strategyId, params.toString());
      const response = await fetch(
        `${this.baseUrl}/api/strategies/combined/${combinedStrategyId}/${strategyId}/add_strategy?${params.toString()}`, 
        {
          method: 'PATCH',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to add strategy to combined: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding to combined strategy:', error);
      throw error;
    }
  }

  /**
   * Remove strategy from combined strategy
   */
  async removeFromCombinedStrategy(
    combinedStrategyId: string,
    strategyId: string,
  ): Promise<StrategyParams> {
    try {
      console.log("Removing from combined strategy using utils:", combinedStrategyId, strategyId);
      const response = await fetch(
        `${this.baseUrl}/api/strategies/combined/${combinedStrategyId}/${strategyId}/remove_strategy`,
        {
          method: 'PATCH',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to remove strategy from combined: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing from combined strategy:', error);
      throw error;
    }
  }

  /**
   * Backtest a strategy
   */
  async backtestStrategy(
    strategyId: string,
    timeframe: string = '1d',
    startDate?: string,
    endDate?: string
  ): Promise<StrategyPlot> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      
      if (endDate) {
        params.append('end_date', endDate);
      }
      
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/backtest?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to backtest strategy: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error backtesting strategy:', error);
      throw error;
    }
  }


  // Utility function to create a new strategy
  async createStrategy(ticker: string, strategyName: string): Promise<string> {
    try {
      console.log("Creating strategy using utils:", ticker, strategyName);
      const response = await fetch(`${this.baseUrl}/api/strategies/${ticker}/${strategyName}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.strategy_id;
    } catch (error) {
      console.error("Error creating strategy:", error);
      throw error;
    }
  }

  // Utility function to delete strategy
  async deleteStrategy(strategyId: string): Promise<void> {
    try {
      console.log("Deleting strategy using utils:", strategyId);
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/delete`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete strategy: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting strategy:", error);
      throw error;
    }
  }

  // Utility function to get indicator plot data
  async getIndicatorPlot(strategyId: string, queryParams: string): Promise<PlotJSON[]> {
    try {
      console.log("Fetching indicator plot using utils:", strategyId, queryParams);
      const response = await fetch(`${this.baseUrl}/api/strategies/${strategyId}/indicator?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch indicator plot: ${response.statusText}`);
      }
      
      const data: StrategyPlot = await response.json();
      return data.json_data;
    } catch (error) {
      console.error("Error fetching indicator plot:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance with default configuration
export const strategyOperations = new StrategyOperations({
  baseUrl: 'http://localhost:8000'
});