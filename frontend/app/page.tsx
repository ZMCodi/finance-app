import AssetHome from "@/components/AssetHome";
import PortfolioHome from "@/components/PortfolioHome";
import StrategyHome from "@/components/StrategyHome";

export default function Home() {

  return (
    <>
      <h1 className="font-extrabold tracking-tight lg:text-4xl text-center pt-3">Finance App</h1>
      <div className="dark flex w-full">
       <AssetHome />
       <StrategyHome />
      </div>
       <PortfolioHome />
    </>
  );
}