'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssetChart from "@/components/AssetChart";
import { useRouter } from "next/navigation";

export default function AssetHome() {
  const router = useRouter();
  const handleTitleClick = () => {
    router.push('/assets');
  };

  return (
    <div className="flex-1">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            <button onClick={handleTitleClick} className="hover:text-blue-500 transition-colors">
              <span className="underline">Look up assets</span>
            </button>
          </CardTitle>
          <CardDescription>do some analysis and shit</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full">
            <AssetChart ticker='AAPL' plot_type="price_history"/>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
