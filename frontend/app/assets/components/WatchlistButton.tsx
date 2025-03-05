'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { AuthRequiredDialog } from '@/components/AuthRequiredDialog';
import { usePathname } from 'next/navigation';
import { watchlistEvents } from '@/lib/watchlistEvents';

interface WatchlistButtonProps {
  ticker: string;
  onAddToWatchlist?: (ticker: string) => void;
  onRemoveFromWatchlist?: (ticker: string) => void;
}

export default function WatchlistButton({ 
  ticker, 
  onAddToWatchlist, 
  onRemoveFromWatchlist 
}: WatchlistButtonProps) {
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const currentPath = usePathname();

  // Check if the ticker is already in the user's watchlist
  useEffect(() => {
    async function checkWatchlist() {
      if (!user) {
        setIsInWatchlist(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('watchlist')
          .select('ticker')
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .maybeSingle();

        setIsInWatchlist(!!data);
      } catch (error) {
        console.error('Error checking watchlist:', error);
      }
    }

    checkWatchlist();
  }, [user, ticker]);

  const handleWatchlistToggle = async () => {
    if (!user) {
      setIsDialogOpen(true);
      return;
    }

    setIsLoading(true);

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('ticker', ticker);

        if (error) throw error;
        
        // Call the callback immediately
        if (onRemoveFromWatchlist) {
          onRemoveFromWatchlist(ticker);
        }
        
        // Notify all subscribers of the watchlist change
        watchlistEvents.notify();
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('watchlist')
          .insert({ user_id: user.id, ticker });

        if (error) throw error;
        
        // Call the callback immediately
        if (onAddToWatchlist) {
          onAddToWatchlist(ticker);
        }
        
        // Notify all subscribers of the watchlist change
        watchlistEvents.notify();
      }

      // Update local state
      setIsInWatchlist(!isInWatchlist);
    } catch (error) {
      console.error('Error updating watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={isInWatchlist ? "default" : "outline"}
        size="sm"
        onClick={handleWatchlistToggle}
        disabled={isLoading}
        className={isInWatchlist ? "bg-white" : ""}
      >
        <Star className={`h-4 w-4 mr-1 ${isInWatchlist ? "" : ""}`} />
        {isLoading ? "Loading..." : (isInWatchlist ? "Saved" : "Add to Watchlist")}
      </Button>

      <AuthRequiredDialog 
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        currentPath={currentPath}
        action="add items to your watchlist"
      />
    </>
  );
}