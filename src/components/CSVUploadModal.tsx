
import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, AlertCircle, FileCheck } from "lucide-react";
import { parseCSV } from '@/utils/csvUtils';
import { Child, Class } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Partial<Child>[]) => void;
  classList: Class[];
}

const CSVUploadModal: React.FC<CSVUploadModalProps> = ({
  isOpen,
  onClose,
  onImport,
  classList
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive"
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setFile(selectedFile);
      setParseErrors([]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data, errors } = await parseCSV<Partial<Child>>(file, classList);
      
      if (errors.length > 0) {
        setParseErrors(errors);
        if (data.length === 0) {
          toast({
            title: "Import Failed",
            description: "No valid data found in CSV file",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }
      }
      
      onImport(data);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred while importing",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Students from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with student data. The file should have columns for name and classId, and may include an optional parentIds column.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="csvFile">CSV File</Label>
            <Input 
              ref={fileInputRef}
              id="csvFile" 
              type="file" 
              accept=".csv,text/csv" 
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm flex items-center gap-1 text-green-600">
                <FileCheck className="h-4 w-4" /> {file.name} selected
              </p>
            )}
          </div>

          {parseErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center gap-2 text-amber-600 font-medium mb-2">
                <AlertCircle className="h-4 w-4" /> Warning
              </div>
              <ul className="text-sm text-amber-600 list-disc pl-5 space-y-1">
                {parseErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-700 mb-2">CSV Format</h4>
            <p className="text-xs text-blue-600">
              Your CSV file should include these columns:
            </p>
            <ul className="text-xs text-blue-600 list-disc pl-5 mt-1">
              <li>name (required): Student's full name</li>
              <li>classId (required): ID of the class (must match existing class IDs)</li>
              <li>parentIds (optional): Comma-separated list of parent IDs</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={resetModal}>Cancel</Button>
          <Button 
            onClick={handleImport}
            disabled={!file || isUploading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUploading ? 'Importing...' : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVUploadModal;
