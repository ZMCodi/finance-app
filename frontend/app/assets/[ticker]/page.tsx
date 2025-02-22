import TickerPageClient from '@/components/TickerPageClient';

interface TickerPageProps {
  params: {
    ticker: string;
  };
}

export default async function TickerPage({ params }: TickerPageProps) {
    const { ticker } = await params;
    return <TickerPageClient ticker={ticker} />;
  }