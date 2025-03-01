'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HoldingsTab from './tabs/HoldingsTab';
import ReturnsTab from './tabs/ReturnsTab';
import RiskTab from './tabs/RiskTab';
import OptimizeTab from './tabs/OptimizeTab';
import { DefaultService, PortfolioPlots } from '@/src/api';
import { HoldingsStats, PortfolioStats } from '@/src/api/index';

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

  useEffect(() => {
    const fetchPortfolioData = async () => {
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
    };
    
    fetchPortfolioData();
  }, [portfolioId]);

  return (
    <div className="flex flex-col min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Portfolio: {portfolioId}</h1>

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
                      <OptimizeTab portfolioId={portfolioId} />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPageClient;