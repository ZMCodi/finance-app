'use client';

import { useState, useEffect } from 'react';
import TickerInput from "@/app/assets/components/TickerInput";
import ChartList from "@/app/assets/components/ChartList";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function ChartContainer() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Load watchlist tickers on initial load
  useEffect(() => {
    async function loadWatchlist() {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('watchlist')
          .select('ticker')
          .eq('user_id', user.id);
        
        if (error) {
          console.error("Error fetching watchlist:", error);
          return;
        }
        
        if (data && data.length > 0) {
          const watchlistTickers = data.map(item => item.ticker);
          setTickers(prev => {
            // Only add tickers that aren't already in the list
            const newTickers = watchlistTickers.filter(ticker => !prev.includes(ticker));
            return [...prev, ...newTickers];
          });
        }
      } catch (error) {
        console.error("Error in watchlist loading:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadWatchlist();
  }, [user]);

  const handleAddTicker = (newTicker: string) => {
    if (!tickers.includes(newTicker)) {
      setTickers(prev => [...prev, newTicker]);
    }
  };

  const handleDeleteTicker = (tickerToDelete: string) => {
    setTickers(prev => prev.filter(ticker => ticker !== tickerToDelete));
  };

  // Handle watchlist button callbacks
  const handleAddToWatchlist = (ticker: string) => {
    // No need to do anything as the ticker is already in the list
    // or will be added if searched for
  };

  const handleRemoveFromWatchlist = (ticker: string) => {
    // Optional: You could remove the ticker from the display
    // if you want items to disappear when removed from watchlist
    // For now, we'll leave it visible since the user might still want to view it
  };

  // Loading state while fetching watchlist
  if (user && isLoading && tickers.length === 0) {
    return <div className="py-8 text-center">Loading your watchlist...</div>;
  }

  return (
    <>
      <TickerInput onAddTicker={handleAddTicker} />
      {user && (
        <div className="text-sm text-gray-500 mt-2 mb-4">
          {tickers.length > 0 
            ? "Your watchlist assets have been loaded."
            : "Add assets to your watchlist to see them here automatically."
          }
        </div>
      )}
      <ChartList 
        tickers={tickers} 
        onDeleteTicker={handleDeleteTicker}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />
    </>
  );
}