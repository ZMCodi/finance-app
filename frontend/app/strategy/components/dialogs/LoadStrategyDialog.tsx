// app/strategy/components/dialogs/LoadStrategyDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, FolderOpen } from 'lucide-react';

interface LoadStrategyDialogProps {
  onStrategyLoaded: (strategyId: string, strategyName: string) => void;
}

export default function LoadStrategyDialog({ onStrategyLoaded }: LoadStrategyDialogProps) {
  const [open, setOpen] = useState(false);
  const [strategies, setStrategies] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch strategies when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchStrategies();
    }
  }, [open, user]);

  const fetchStrategies = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadStrategy = async (strategyId: string, strategyName: string) => {

    setLoadingStrategy(strategyId);
    
    try {
      // First, fetch the strategy parameters from Supabase
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .select('parameters')
        .eq('id', strategyId)
        .single();
      
      if (strategyError) {
        throw new Error(`Error fetching strategy: ${strategyError.message}`);
      }
      
      // Then, fetch all associated strategy indicators
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('strategy_indicators')
        .select('type, parameters')
        .eq('strategy_id', strategyId);
      
      if (indicatorsError) {
        throw new Error(`Error fetching strategy indicators: ${indicatorsError.message}`);
      }
      
      // Call the onStrategyLoaded callback with the selected strategy
      onStrategyLoaded(strategyId, strategyName);
      
      // Close the dialog
      setOpen(false);
    } catch (error) {
      console.error('Error loading strategy:', error);
    } finally {
      setLoadingStrategy(null);
    }
  };

  // Format the date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <FolderOpen size={16} />
          <span>Load Strategy</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Load Saved Strategy</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : strategies.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="flex flex-col p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                    onClick={() => handleLoadStrategy(strategy.id, strategy.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{strategy.name}</span>
                      {loadingStrategy === strategy.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadStrategy(strategy.id, strategy.name);
                          }}
                        >
                          <FolderOpen size={14} />
                          <span>Load</span>
                        </Button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Created: {formatDate(strategy.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No saved strategies found.</p>
              <p className="text-sm mt-2">Create and save a strategy to see it here.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}