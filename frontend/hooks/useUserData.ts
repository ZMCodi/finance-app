// hooks/useUserData.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface UserData {
  watchlist: string[];
  strategies: string[];
  portfolios: string[];
  isLoading: boolean;
}

export function useUserData(): UserData {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    watchlist: [],
    strategies: [],
    portfolios: [],
    isLoading: true,
  });

  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        setData({
          watchlist: [],
          strategies: [],
          portfolios: [],
          isLoading: false,
        });
        return;
      }

      try {
        // Fetch watchlist
        const { data: watchlistData } = await supabase
          .from('watchlist')
          .select('ticker')
          .eq('user_id', user.id);

        // Fetch strategies
        const { data: strategiesData } = await supabase
          .from('strategies')
          .select('name, id')
          .eq('user_id', user.id);

        // Fetch portfolios
        const { data: portfoliosData } = await supabase
          .from('portfolios')
          .select('name, id')
          .eq('user_id', user.id);

        setData({
          watchlist: watchlistData?.map(item => item.ticker) || [],
          strategies: strategiesData?.map(item => item.name) || [],
          portfolios: portfoliosData?.map(item => item.name) || [],
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchUserData();
  }, [user]);

  return data;
}