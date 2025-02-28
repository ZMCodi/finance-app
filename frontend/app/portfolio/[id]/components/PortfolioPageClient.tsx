'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HoldingsTab from './tabs/HoldingsTab';
import ReturnsTab from './tabs/ReturnsTab';
import RiskTab from './tabs/RiskTab';
import OptimizeTab from './tabs/OptimizeTab';
import { DefaultService } from '@/src/api';

interface PortfolioPageClientProps {
  portfolioId: string;
}

const PortfolioPageClient = ({ portfolioId }: PortfolioPageClientProps) => {
  const [activeTab, setActiveTab] = useState('holdings');
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<any>(null);
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
        
        // Fetch portfolio stats
        const stats = await DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(portfolioId);
        setPortfolioData(stats);
        
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
                      <HoldingsTab portfolioId={portfolioId} currency={currency} />
                    </TabsContent>
                    
                    <TabsContent value="returns">
                      <ReturnsTab portfolioId={portfolioId} currency={currency} portfolioData={portfolioData} />
                    </TabsContent>
                    
                    <TabsContent value="risk">
                      <RiskTab portfolioId={portfolioId} currency={currency} portfolioData={portfolioData} />
                    </TabsContent>
                    
                    <TabsContent value="optimize">
                      <OptimizeTab portfolioId={portfolioId} currency={currency} />
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