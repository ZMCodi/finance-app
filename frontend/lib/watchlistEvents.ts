// lib/watchlistEvents.ts

// Simple event system for watchlist changes
class WatchlistEvents {
    private listeners: (() => void)[] = [];
  
    // Subscribe to watchlist changes
    subscribe(callback: () => void): () => void {
      this.listeners.push(callback);
      
      // Return unsubscribe function
      return () => {
        this.listeners = this.listeners.filter(listener => listener !== callback);
      };
    }
  
    // Notify all listeners of a change
    notify(): void {
      this.listeners.forEach(listener => listener());
    }
  }
  
  // Create a singleton instance
  export const watchlistEvents = new WatchlistEvents();