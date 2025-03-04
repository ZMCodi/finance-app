// app/strategy/components/SaveStrategyDialog.tsx
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
import { Save } from 'lucide-react';
import { DefaultService } from '@/src/api';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { AuthRequiredDialog } from '@/components/AuthRequiredDialog';
import { usePathname } from 'next/navigation';

interface SaveStrategyDialogProps {
  combinedStrategyId: string | null;
  asset: string | null;
  isDisabled?: boolean;
  onStrategySaved?: (strategyId: string, strategyName: string) => void;
}

const SaveStrategyDialog: React.FC<SaveStrategyDialogProps> = ({ 
  combinedStrategyId, 
  asset,
  isDisabled = false,
  onStrategySaved 
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Auth related states
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const pathname = usePathname();

  const handleSaveStrategy = async () => {
    // Check for authentication first
    if (!user) {
      setOpen(false); // Close the current dialog
      setAuthDialogOpen(true); // Open auth required dialog
      return;
    }

    if (!combinedStrategyId || !asset || !strategyName.trim()) {
      setErrorMessage('Please provide a name for your strategy');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      // 1. Get strategy data from the API
      const saveData = await DefaultService.saveCombinedStrategyApiStrategiesCombinedCombinedKeySavePost(
        combinedStrategyId
      );
      
      // 2. Save the main strategy to Supabase
      const { data, error } = await supabase
        .from('strategies')
        .upsert({
          name: strategyName,
          user_id: user.id,
          parameters: saveData.params,
          updated_at: new Date().toISOString()
        }, { onConflict: 'name,user_id' })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // 3. Get the strategy_id for saving indicators
      const strategy_id = data.id;
      
      // 4. Save each indicator
      if (saveData.indicators && Array.isArray(saveData.indicators)) {
        // First, clean up any existing indicators for this strategy
        const { error: deleteError } = await supabase
          .from('strategy_indicators')
          .delete()
          .eq('strategy_id', strategy_id);
          
        if (deleteError) throw deleteError;
        
        // Then insert new indicators
        for (const indicator of saveData.indicators) {
          const { error: indicatorError } = await supabase
            .from('strategy_indicators')
            .insert({
              type: indicator.type,
              strategy_id: strategy_id,
              parameters: indicator.params,
              created_at: new Date().toISOString()
            });
            
          if (indicatorError) throw indicatorError;
        }
      }
      
      // Show success message and call the callback
      setSuccessMessage('Strategy saved successfully!');
      
      if (onStrategySaved) {
        onStrategySaved(strategy_id, strategyName);
      }
      
      // Close the dialog after a short delay
      setTimeout(() => {
        setOpen(false);
        setSuccessMessage(null);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save strategy:', error);
      setErrorMessage('Failed to save strategy. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            className="flex items-center gap-2"
            disabled={isDisabled || !combinedStrategyId || !asset}
            onClick={() => {
              // If not authenticated, show auth dialog instead of opening the save dialog
              if (!user) {
                setAuthDialogOpen(true);
                return;
              }
            }}
          >
            <Save size={18} />
            Save Strategy
          </Button>
        </DialogTrigger>
        {user && ( // Only render dialog content if user is authenticated
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl font-semibold">Save Strategy</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4">
              {successMessage && (
                <div className="bg-green-900/30 border border-green-500 text-green-200 px-3 py-2 rounded text-sm">
                  {successMessage}
                </div>
              )}
              
              {errorMessage && (
                <div className="bg-red-900/30 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="strategyName" className="text-right text-slate-300">
                  Strategy Name
                </Label>
                <Input
                  id="strategyName"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="col-span-3"
                  placeholder="My Strategy"
                />
              </div>
              
              <p className="text-sm text-gray-400 mt-2">
                This will save your current strategy configuration including all indicators and parameters.
              </p>
            </div>
            
            <DialogFooter className="pt-4 border-t border-slate-700">
              <Button
                onClick={handleSaveStrategy}
                className="bg-white hover:bg-gray-200 text-slate-900 font-medium"
                disabled={isSaving || !strategyName.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Strategy'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Authentication required dialog */}
      <AuthRequiredDialog 
        isOpen={authDialogOpen} 
        setIsOpen={setAuthDialogOpen} 
        currentPath={pathname}
        action="save this strategy" 
      />
    </>
  );
};

export default SaveStrategyDialog;