import React from 'react';
import PortfolioPageClient from './components/PortfolioPageClient';

interface PortfolioPageProps {
  params: {
    id: string;
  };
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  // Decode the URL parameter to match the exact key in the backend
  const { id } = await params;
  const portfolioId = await decodeURIComponent(id);
  
  return <PortfolioPageClient portfolioId={portfolioId} />;
};