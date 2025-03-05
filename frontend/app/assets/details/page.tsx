'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import the client component dynamically to ensure it only loads on the client
const TickerPageClient = dynamic(
  () => import('@/app/assets/details/components/TickerPageClient'),
  { ssr: false, loading: () => <div>Loading ticker data...</div> }
);

function TickerPageContent() {
  const searchParams = useSearchParams();
  const ticker = searchParams.get('ticker');
  
  if (!ticker) {
    return <div>No ticker specified</div>;
  }
  
  return <TickerPageClient ticker={ticker} />;
}

export default function TickerPage() {
  return (
    <Suspense fallback={<div>Loading page...</div>}>
      <TickerPageContent />
    </Suspense>
  );
}