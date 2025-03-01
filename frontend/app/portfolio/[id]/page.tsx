import React from 'react';
import PortfolioPageClient from './components/PortfolioPageClient';

interface PortfolioPageProps {
  params: {
    id: string;
  };
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = await params;
  
  return <PortfolioPageClient portfolioId={id} />;
};
