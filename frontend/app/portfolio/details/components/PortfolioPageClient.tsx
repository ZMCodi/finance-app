// Update PortfolioPageClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HoldingsTab from './tabs/HoldingsTab';
import ReturnsTab from './tabs/ReturnsTab';
import RiskTab from './tabs/RiskTab';
import OptimizeTab from './tabs/OptimizeTab';
import { DefaultService, PortfolioPlots } from '@/src/api';
import { HoldingsStats, PortfolioStats } from '@/src/api/index';
import { Bookmark, BookmarkCheck } from 'lucide-react'; // Import icons
import { useAuth } from '@/context/AuthContext';
import { AuthRequiredDialog } from '@/components/AuthRequiredDialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { usePathname } from 'next/navigation';

interface PortfolioPageClientProps {
  portfolioId: string;
}

const PortfolioPageClient = ({ portfolioId }: PortfolioPageClientProps) => {
  const [activeTab, setActiveTab] = useState('holdings');
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<PortfolioStats | null>(null);
  const [holdingsData, setHoldingsData] = useState<HoldingsStats | null>(null);
  const [plotData, setPlotData] = useState<PortfolioPlots | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // State for save functionality
  const [isSaved, setIsSaved] = useState(false);
  const [isCheckingSaveStatus, setIsCheckingSaveStatus] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  // Function to check if portfolio is saved by this user
  const checkSaveStatus = useCallback(async () => {
    if (!user) {
      setIsCheckingSaveStatus(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id')
        .eq('name', portfolioId)
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setIsSaved(true);
      } else {
        setIsSaved(false);
      }
    } catch (error) {
      console.error('Error checking save status:', error);
    } finally {
      setIsCheckingSaveStatus(false);
    }
  }, [portfolioId, user]);

  // Define the fetchPortfolioData function with useCallback to avoid recreating it on every render
  const fetchPortfolioData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to get currency from localStorage first (set during portfolio creation)
      const storedCurrency = localStorage.getItem(`portfolio_${portfolioId}_currency`);
      if (storedCurrency) {
        setCurrency(storedCurrency);
      }
      
      // Fetch portfolio stats and holdings data in parallel
      const [stats, holdings, plots] = await Promise.all([
        DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(portfolioId),
        DefaultService.holdingsStatsApiPortfolioPortfolioIdHoldingsStatsGet(portfolioId),
        DefaultService.portfolioPlotsApiPortfolioPortfolioIdPlotsGet(portfolioId),
      ]);
      
      setPortfolioData(stats);
      setHoldingsData(holdings);
      setPlotData(plots);
      
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId]);

  // Function to save portfolio
  const handleSavePortfolio = async () => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    
    try {
      // Get portfolio state and transactions from backend
      const saveData = await DefaultService.savePortfolioApiPortfolioPortfolioIdSavePost(portfolioId);
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('portfolios')
        .upsert({
          name: portfolioId,
          user_id: user.id,
          state: saveData.state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'name,user_id' })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Save transactions with portfolio_id
      const portfolio_id = data.id;
      
      // Prepare transactions with portfolio_id
      const transactionsWithId = saveData.transactions.map(t => ({
        ...t,
        portfolio_id
      }));
      
      // Insert transactions
      const { error: transactionError } = await supabase
        .from('portfolio_transactions')
        .upsert(transactionsWithId, { 
          onConflict: 'id,portfolio_id',
          ignoreDuplicates: true
        });
      
      if (transactionError) throw transactionError;
      
      // Update UI to show saved state
      setIsSaved(true);
      
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  // Function to refresh data - can be called after transactions or rebalancing
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData, refreshTrigger]);
  
  useEffect(() => {
    checkSaveStatus();
  }, [checkSaveStatus, user]);

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-left">{portfolioId}</h1>
        
        {/* Save button - only show if not sample portfolio */}
        {portfolioId !== 'sample_portfolio' && (
          <Button 
        variant="ghost" 
        size="icon"
        disabled={isCheckingSaveStatus}
        onClick={handleSavePortfolio}
        className="ml-2"
        aria-label={isSaved ? "Portfolio saved" : "Save portfolio"}
          >
        {isSaved ? 
          <BookmarkCheck className="h-20 w-20 text-primary" /> : 
          <Bookmark className="h-6 w-6" />
        }
          </Button>
        )}
      </div>

      <div className="flex flex-1 gap-6">
        {/* Full width tabs */}
        <div className="w-full">
          <Card className="p-4 h-full">
            <Tabs defaultValue="holdings" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="holdings">Holdings</TabsTrigger>
                <TabsTrigger value="returns">Returns</TabsTrigger>
                <TabsTrigger value="risk">Risk</TabsTrigger>
                <TabsTrigger value="optimize">Optimize</TabsTrigger>
              </TabsList>
              
              <div className="p-4 border rounded-md min-h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading portfolio data...</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="holdings">
                      <HoldingsTab 
                        portfolioId={portfolioId} 
                        currency={currency} 
                        portfolioData={portfolioData}
                        holdingsData={holdingsData}
                        plotData={plotData?.holdings}
                        onDataChange={refreshData}
                      />
                    </TabsContent>
                    
                    <TabsContent value="returns">
                      <ReturnsTab 
                        portfolioId={portfolioId} 
                        portfolioData={portfolioData}
                        plotData={plotData?.returns}
                      />
                    </TabsContent>
                    
                    <TabsContent value="risk">
                      <RiskTab 
                        portfolioId={portfolioId} 
                        currency={currency} 
                        portfolioData={portfolioData}
                        plotData={plotData?.risk}
                      />
                    </TabsContent>
                    
                    <TabsContent value="optimize">
                      <OptimizeTab 
                        portfolioId={portfolioId}
                        currency={currency}
                        numOfAssets={portfolioData?.position.number_of_positions}
                        onDataChange={refreshData}
                      />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
      
      {/* Authentication required dialog */}
      <AuthRequiredDialog 
        isOpen={authDialogOpen} 
        setIsOpen={setAuthDialogOpen} 
        currentPath={pathname}
        action="save this portfolio" 
      />
    </div>
  );
};

export default PortfolioPageClient;