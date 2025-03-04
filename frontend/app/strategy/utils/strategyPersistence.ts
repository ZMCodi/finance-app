// app/strategy/utils/strategyPersistence.ts

/**
 * Utilities for persisting strategy state during auth redirects
 */

// Save the current strategy state to localStorage before redirecting
export const saveStrategyState = (state: {
    selectedAsset: string | null;
    activeTab: string;
    combinedStrategyId: string | null;
    strategies: any[];
  }) => {
    try {
      // Store essential strategy information
      localStorage.setItem('strategy_state', JSON.stringify({
        selectedAsset: state.selectedAsset,
        activeTab: state.activeTab,
        combinedStrategyId: state.combinedStrategyId,
        strategies: state.strategies,
        timestamp: new Date().getTime() // Add timestamp for expiration
      }));
    } catch (error) {
      console.error('Error saving strategy state:', error);
    }
  };
  
  // Get the saved strategy state
  export const getSavedStrategyState = () => {
    try {
      const savedState = localStorage.getItem('strategy_state');
      if (!savedState) return null;
      
      const parsedState = JSON.parse(savedState);
      
      // Check if state is too old (expired after 30 minutes)
      const now = new Date().getTime();
      const expirationTime = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      if (now - parsedState.timestamp > expirationTime) {
        // State is too old, clear it
        localStorage.removeItem('strategy_state');
        return null;
      }
      
      return parsedState;
    } catch (error) {
      console.error('Error retrieving strategy state:', error);
      return null;
    }
  };
  
  // Clear the saved strategy state
  export const clearSavedStrategyState = () => {
    localStorage.removeItem('strategy_state');
  };