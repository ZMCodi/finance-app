'use client';
import TickerPageClient from '@/app/assets/details/components/TickerPageClient';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function TickerPage() {
    const searchParams = useSearchParams();
    const ticker = searchParams.get('ticker');
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TickerPageClient ticker={ticker} />
        </Suspense>
    )
}