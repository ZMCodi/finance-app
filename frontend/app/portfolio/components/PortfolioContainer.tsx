'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import CreatePortfolioDialog from './CreatePortfolioDialog';
import { View, Folder, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { DefaultService } from '@/src/api/services/DefaultService';
import { PortfolioSave_Input } from '@/src/api/models/PortfolioSave_Input';

const PortfolioContainer = () => {
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { portfolios, isLoading: dataIsLoading } = useUserData();

  useEffect(() => {
    // Check if a portfolio ID exists in localStorage
    const storedPortfolioId = localStorage.getItem('currentPortfolioId');
    if (storedPortfolioId) {
      setPortfolioId(storedPortfolioId);
      setHasPortfolio(true);
    }
  }, []);

  const handlePortfolioCreated = (newPortfolioId: string) => {
    localStorage.setItem('currentPortfolioId', newPortfolioId);
    setPortfolioId(newPortfolioId);
    setHasPortfolio(true);
    
    // Redirect to the portfolio page
    router.push(`/portfolio/details?id=${encodeURIComponent(newPortfolioId)}`);
  };

  const handlePortfolioClick = async (portfolioName: string) => {
    try {
      setIsLoading(portfolioName);
      
      // First, fetch the portfolio data from Supabase
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('state, id')
        .eq('name', portfolioName)
        .eq('user_id', user?.id)
        .single();
      
      if (portfolioError) {
        throw new Error(`Error fetching portfolio: ${portfolioError.message}`);
      }
      
      if (!portfolioData) {
        throw new Error(`Portfolio not found: ${portfolioName}`);
      }
      
      // Then, fetch the transactions for this portfolio
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioData.id);
      
      if (transactionsError) {
        throw new Error(`Error fetching transactions: ${transactionsError.message}`);
      }
      
      // Prepare the data in the format expected by the API
      const payload: PortfolioSave_Input = {
        state: portfolioData.state,
        transactions: transactionsData.map(transaction => ({
          type: transaction.type,
          asset: transaction.asset,
          shares: transaction.shares,
          value: transaction.value,
          profit: transaction.profit,
          date: transaction.date,
          id: parseInt(transaction.id)
        }))
      };
      
      // Load the portfolio data into the backend
      await DefaultService.loadPortfolioApiPortfolioPortfolioIdLoadPost(
        payload,
        portfolioName
      );
      
      // Save the current portfolio ID to localStorage
      localStorage.setItem('currentPortfolioId', portfolioName);
      
      // After successful loading, navigate to the portfolio page
      router.push(`/portfolio/details?id=${portfolioName}`);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      // You might want to show an error notification here
    } finally {
      setIsLoading(null);
    }
  };

  const handleViewSamplePortfolio = async () => {
    // Use encodeURIComponent to ensure the URL is properly formatted
    try {
      setIsLoading('sample_portfolio');
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('state, id')
        .eq('name', 'sample_portfolio')
        .single();

      if (portfolioError) {
        throw new Error(`Error fetching sample portfolio: ${portfolioError.message}`);
      }

      if (!portfolioData) {
        throw new Error('Sample portfolio not found');
      }

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioData.id);

      if (transactionsError) {
        throw new Error(`Error fetching transactions: ${transactionsError.message}`);
      }

      const payload: PortfolioSave_Input = {
        state: portfolioData.state,
        transactions: transactionsData.map(transaction => ({
          type: transaction.type,
          asset: transaction.asset,
          shares: transaction.shares,
          value: transaction.value,
          profit: transaction.profit,
          date: transaction.date,
          id: parseInt(transaction.id)
        }))
      };

      await DefaultService.loadPortfolioApiPortfolioPortfolioIdLoadPost(
        payload,
        'sample_portfolio'
      );

      localStorage.setItem('currentPortfolioId', 'sample_portfolio');
      router.push(`/portfolio/details?id=sample_portfolio`);
    } catch (error) {
      console.error('Error loading sample portfolio:', error);
    } finally {
      setIsLoading(null);
    }
  };

  // First, create a reusable component for the sample portfolio button
const SamplePortfolioButton = ({ isLoading, onClick }) => (
  <Button 
    className='h-10'
    onClick={onClick}
    disabled={isLoading === 'sample_portfolio'}
  >
    {isLoading === 'sample_portfolio' ? (
      <div className="animate-spin mr-2">
        <View size={18} className="opacity-50" />
      </div>
    ) : (
      <View size={18} className="mr-2" />
    )}
    View Sample Portfolio
  </Button>
);

  return (
    <div className="flex flex-col min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Portfolio Builder</h1>

      {user ? (
        // User is logged in
        <div className="flex flex-col items-center justify-center flex-1">
          <Card className="shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Portfolios</h2>
            
            {dataIsLoading ? (
              <p className="text-center py-4">Loading your portfolios...</p>
            ) : portfolios.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {portfolios.map((portfolio) => (
                    <Button
                      key={portfolio}
                      variant="outline"
                      className="w-full h-14 flex justify-start items-center gap-3 px-4"
                      onClick={() => handlePortfolioClick(portfolio)}
                      disabled={isLoading === portfolio}
                    >
                      <Folder size={20} />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{portfolio}</span>
                        {portfolio === portfolioId && (
                          <span className="text-xs text-gray-400">Current</span>
                        )}
                      </div>
                      {isLoading === portfolio && (
                        <span className="ml-auto text-sm">Loading...</span>
                      )}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-4 justify-center">
                  <SamplePortfolioButton 
                    isLoading={isLoading} 
                    onClick={handleViewSamplePortfolio} 
                  />
                  <CreatePortfolioDialog onPortfolioCreated={handlePortfolioCreated}>
                    <Plus size={16} className="mr-2" /> 
                    Create New Portfolio
                  </CreatePortfolioDialog>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6">
                <p className="mb-6 text-center">
                  You don&apos;t have any portfolios yet. Create one to start tracking your investments.
                </p>
                <div className='flex gap-4'>
                  <SamplePortfolioButton 
                    isLoading={isLoading} 
                    onClick={handleViewSamplePortfolio} 
                  />
                  <CreatePortfolioDialog onPortfolioCreated={handlePortfolioCreated} />
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        // User is not logged in
        <div className="flex flex-col items-center justify-center flex-1">
          {!hasPortfolio ? (
            <Card className="w-full max-w-md p-6 flex flex-col items-center">
              <p className="mb-6 text-center">
                You don&apos;t have a portfolio yet. Create one to start tracking your investments.
              </p>
              <div className="flex gap-4">
                <SamplePortfolioButton 
                  isLoading={isLoading} 
                  onClick={handleViewSamplePortfolio} 
                />
                <CreatePortfolioDialog onPortfolioCreated={handlePortfolioCreated} />
              </div>
            </Card>
          ) : (
            <Card className="shadow-lg w-full max-w-md p-6 flex flex-col items-center">
              <div className="flex gap-4">
                <SamplePortfolioButton 
                  isLoading={isLoading} 
                  onClick={handleViewSamplePortfolio} 
                />
                <CreatePortfolioDialog onPortfolioCreated={handlePortfolioCreated} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioContainer;