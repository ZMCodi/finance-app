import TickerPageClient from '@/app/assets/[ticker]/components/TickerPageClient';

interface TickerPageProps {
  params: Promise<{
    ticker: string;
  }>;
}

export default async function TickerPage({ params }: TickerPageProps) {
    const { ticker } = await params;
    return <TickerPageClient ticker={ticker} />;
}