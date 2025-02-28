import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, X, Plus } from 'lucide-react';
import { DefaultService } from '@/src/api';

interface CreatePortfolioDialogProps {
  onPortfolioCreated: (portfolioId: string) => void;
}

interface AssetHolding {
  asset: string;
  shares: number;
  avg_price: number;
}

const CreatePortfolioDialog: React.FC<CreatePortfolioDialogProps> = ({ onPortfolioCreated }) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [initialCash, setInitialCash] = useState(0);
  const [riskFreeRate, setRiskFreeRate] = useState(0.02);
  const [name, setName] = useState('My Portfolio');
  const [holdings, setHoldings] = useState<AssetHolding[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const handleAddHolding = () => {
    if (newTicker && newShares && newPrice) {
      setHoldings([
        ...holdings,
        {
          asset: newTicker.toUpperCase(),
          shares: parseFloat(newShares),
          avg_price: parseFloat(newPrice),
        },
      ]);
      setNewTicker('');
      setNewShares('');
      setNewPrice('');
    }
  };

  const handleRemoveHolding = (index: number) => {
    const updatedHoldings = [...holdings];
    updatedHoldings.splice(index, 1);
    setHoldings(updatedHoldings);
  };

  const handleCreatePortfolio = async () => {
    try {
      setIsCreating(true);
      
      // Create the request body according to PortfolioCreatePost model
      const createRequest = {
        assets: holdings.length > 0 ? holdings : undefined,
        cash: initialCash,
        currency: currency,
        r: riskFreeRate,
        name: name,
      };

      // Call the API endpoint with the correct request structure
      const portfolio = await DefaultService.createPortfolioApiPortfolioCreatePost(createRequest);

      if (portfolio.portfolio_id) {
        // Store currency in localStorage for future reference
        localStorage.setItem(`portfolio_${portfolio.portfolio_id}_currency`, currency);
        
        onPortfolioCreated(portfolio.portfolio_id);
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to create portfolio:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 h-10">
          <PlusCircle size={18} />
          Create New Portfolio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold">Create New Portfolio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <h3 className="text-lg font-medium mb-1">Portfolio Parameters</h3>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-slate-300">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="My Portfolio"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">
              Currency
            </Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="col-span-3"
              placeholder="USD"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cash" className="text-right text-slate-300">
              Initial Cash
            </Label>
            <div className="col-span-3 relative">
              <Input
                id="cash"
                type="number"
                step='100'
                value={initialCash}
                onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)}
                className="w-full"
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rate" className="text-right text-slate-300">
              Risk-Free Rate
            </Label>
            <div className="col-span-3 relative">
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                className="w-full"
                placeholder="0.02"
              />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-lg font-medium mb-3">Initial Holdings</h3>
            
            {holdings.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 px-1">
                  <div className="col-span-4">Ticker</div>
                  <div className="col-span-3">Shares</div>
                  <div className="col-span-4">Avg. Price</div>
                  <div className="col-span-1"></div>
                </div>
                {holdings.map((holding, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">{holding.asset}</div>
                    <div className="col-span-3">{holding.shares}</div>
                    <div className="col-span-4">${holding.avg_price.toFixed(2)}</div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveHolding(index)}
                        className="h-7 w-7 text-slate-400 hover:text-white"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-4"
                placeholder="Ticker"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              />
              <Input
                className="col-span-3"
                placeholder="Shares"
                type="number"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
              />
              <Input
                className="col-span-4"
                placeholder="Avg. Price"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
              <Button
                className="col-span-1 p-0 h-full w-full"
                onClick={handleAddHolding}
                disabled={!newTicker || !newShares || !newPrice}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-slate-700">
          <Button
            onClick={handleCreatePortfolio}
            className="bg-white hover:bg-gray-200 text-slate-900 font-medium"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePortfolioDialog;