
import React from 'react';
import { Button } from "@/components/ui/button";
import { UserRound, Upload, Download, Plus } from "lucide-react";

interface StudentsHeaderProps {
  onExportCSV: () => void;
  onImportCSV: () => void;
  onAddStudent: () => void;
}

const StudentsHeader = ({
  onExportCSV,
  onImportCSV,
  onAddStudent
}: StudentsHeaderProps) => {
  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserRound className="h-8 w-8 text-school-primary" />
          <h1 className="text-3xl font-bold">Manage Students</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExportCSV} variant="outline" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button 
            onClick={onImportCSV} 
            variant="outline" 
            className="flex-1 sm:flex-none bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
          >
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button 
            onClick={onAddStudent} 
            className="bg-school-primary flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StudentsHeader;
