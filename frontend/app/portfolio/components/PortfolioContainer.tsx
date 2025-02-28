'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import CreatePortfolioDialog from './CreatePortfolioDialog';
import { View } from 'lucide-react';

const PortfolioContainer = () => {
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const router = useRouter();

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
  };

  const handleViewPortfolio = () => {
    router.push(`/portfolio/${portfolioId}`);
  };

  return (
    <div className="flex flex-col min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Portfolio Builder</h1>

      
      {!hasPortfolio ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <Card className="w-full max-w-md p-6 flex flex-col items-center">
            <p className="mb-6 text-center">
              You don&apos;t have a portfolio yet. Create one to start tracking your investments.
            </p>
            <CreatePortfolioDialog onPortfolioCreated={handlePortfolioCreated} />
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1">
          <Card className="shadow-lg w-full max-w-md p-6 flex flex-col items-center">
            <p className="text-slate-300 mb-4 text-center">
              Portfolio: <span className="font-semibold">{portfolioId}</span>
            </p>
            <div className="flex gap-4">
              <Button className='h-10'
                onClick={handleViewPortfolio}
              >
                <View size={18} />
                View Portfolio
              </Button>
              <CreatePortfolioDialog onPortfolioCreated={handlePortfolioCreated} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PortfolioContainer;