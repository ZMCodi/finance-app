'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import the client component dynamically
const PortfolioPageClient = dynamic(
  () => import('./components/PortfolioPageClient'),
  { ssr: false, loading: () => <div>Loading portfolio data...</div> }
);

function PortfolioPageContent() {
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get('id') || '';
  
  if (!portfolioId) {
    return <div>No portfolio ID specified</div>;
  }
  
  return <PortfolioPageClient portfolioId={portfolioId} />;
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div>Loading portfolio page...</div>}>
      <PortfolioPageContent />
    </Suspense>
  );
}