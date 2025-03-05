'use client';
import TickerPageClient from '@/app/assets/details/components/TickerPageClient';
import { useSearchParams } from 'next/navigation';

export default function TickerPage() {
    const searchParams = useSearchParams();
    const ticker = searchParams.get('ticker');
    return <TickerPageClient ticker={ticker} />;
}