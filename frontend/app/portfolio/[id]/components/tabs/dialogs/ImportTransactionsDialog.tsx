import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from 'lucide-react';
import { DefaultService } from '@/src/api';

interface ImportTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onSuccess?: () => void;
}

type ImportSource = 'trading212' | 'vanguard';

const ImportTransactionsDialog = ({ 
  open, 
  onOpenChange, 
  portfolioId, 
  onSuccess 
}: ImportTransactionsDialogProps) => {
  const [source, setSource] = useState<ImportSource>('trading212');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileTypeExtension = source === 'trading212' ? '.csv' : '.xlsx';
  const fileTypeDescription = source === 'trading212' ? 'CSV' : 'Excel';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', source);
      
      // Create the expected request object that matches Body_upload_portfolio_api_portfolio__portfolio_id__load_patch
      const requestData = {
        file: selectedFile,
        source: source
      };
      
      // Call the API to upload transactions
      await DefaultService.uploadPortfolioApiPortfolioPortfolioIdUploadPatch(
        portfolioId,
        requestData
      );

      // Success handling
      if (onSuccess) {
        onSuccess();
      }

      // Close dialog and reset form
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload your transaction history from supported brokers
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Source Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="import-source" className="text-right">
              Source
            </Label>
            <Select 
              value={source} 
              onValueChange={(value: ImportSource) => {
                setSource(value);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              <SelectTrigger className="col-span-3" id="import-source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trading212">Trading 212</SelectItem>
                <SelectItem value="vanguard">Vanguard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* File Upload */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file-upload" className="text-right">
              File
            </Label>
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept={fileTypeExtension}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleButtonClick}
                  className="flex-grow"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select {fileTypeDescription} File
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm mt-2 text-slate-600 truncate">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          
          {/* File format information */}
          <div className="mt-2 text-sm  p-3 rounded-md">
            {source === 'trading212' ? (
              <div>
                <p className="font-medium mb-1">Trading 212 Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Export your transaction history as CSV from Trading 212</li>
                  <li>Make sure the file includes all transaction types (buys, sells, dividends)</li>
                  <li>The system will parse and add all valid transactions to your portfolio</li>
                </ul>
              </div>
            ) : (
              <div>
                <p className="font-medium mb-1">Vanguard Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Export your account statement as Excel (.xlsx) file from Vanguard</li>
                  <li>The system will automatically extract transactions from the statement</li>
                  <li>Ensure the statement includes transaction details and dates</li>
                </ul>
              </div>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="text-sm text-red-500 mt-2 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedFile}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTransactionsDialog;