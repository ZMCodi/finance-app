import AssetHome from "@/components/AssetHome";
import PortfolioHome from "@/components/PortfolioHome";
import StrategyHome from "@/components/StrategyHome";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <h1 className="font-extrabold tracking-tight lg:text-4xl text-center py-6">FLApp</h1>
      <div className="flex-1 flex flex-col px-6 gap-6">
        <div className="flex gap-6 flex-1">
          <AssetHome />
          <StrategyHome />
        </div>
        <div className="flex-1">
          <PortfolioHome />
        </div>
      </div>
    </div>
  );
}