import React from 'react';
import PortfolioPageClient from './components/PortfolioPageClient';

interface PortfolioPageProps {
  params: {
    id: string;
  };
}

const PortfolioPage = ({ params }: PortfolioPageProps) => {
  const { id } = params;
  
  return <PortfolioPageClient portfolioId={id} />;
};

export default PortfolioPage;