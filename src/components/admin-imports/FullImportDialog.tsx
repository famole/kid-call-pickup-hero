
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload } from "lucide-react";
import { getAllClasses } from "@/services/classService";
import { parseFullImportFile } from "@/utils/fullImportParser";
import { buildFullImportPreview, applyFullImport, FullImportPreview } from "@/services/import/fullImport";

const FullImportDialog: React.FC<{ onCompleted?: () => void } > = ({ onCompleted }) => {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [classes, setClasses] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState<string | undefined>();
  const [preview, setPreview] = React.useState<FullImportPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [rowEnabled, setRowEnabled] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (!open) return;
    getAllClasses()
      .then((cls) => setClasses(cls))
      .catch(() => setClasses([]));
  }, [open]);

  const resetState = () => {
    setFile(null);
    setSelectedClassId(undefined);
    setPreview(null);
    setLoading(false);
    setApplying(false);
    setRowEnabled({});
  };
  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) resetState();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleBuildPreview = async () => {
    if (!file) {
      toast({ title: 'File required', description: 'Please select a CSV or Excel file', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const rows = await parseFullImportFile(file);
      if (!rows.length) {
        toast({ title: 'No data', description: 'The file appears to be empty', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const p = await buildFullImportPreview(rows, selectedClassId || null);
      setPreview(p);
      setRowEnabled(Object.fromEntries(p.rows.map(r => [r.rowIndex, true])));
      toast({ title: 'Preview ready', description: `Found ${p.rows.length} rows` });
    } catch (e: any) {
      toast({ title: 'Failed to parse', description: e.message || 'Invalid file', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    try {
      setApplying(true);
      const selectedRows = preview.rows.filter(r => rowEnabled[r.rowIndex] !== false);
      if (selectedRows.length === 0) {
        toast({ title: 'No rows selected', description: 'Please enable at least one row to import', variant: 'destructive' });
        setApplying(false);
        return;
      }
      const res = await applyFullImport({ ...preview, rows: selectedRows });
      if (res.errors.length) {
        toast({ title: 'Import completed with errors', description: `${res.successes} succeeded, ${res.errors.length} failed`, variant: 'destructive' });
      } else {
        toast({ title: 'Import successful', description: `${res.successes} rows imported` });
      }
      setOpen(false);
      onCompleted?.();
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Full Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Full Import: Students and Parents</DialogTitle>
          <DialogDescription>
            Upload a CSV/XLSX with columns: Class, Student (Lastname, firstname), Father name, Father email, Mother name, Mother email.
            If you select a class below, the Class column will be ignored.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="min-w-[220px]">
                <SelectValue placeholder="Select class (optional)" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleBuildPreview} disabled={loading} className="bg-school-primary">
              {loading ? 'Building preview...' : 'Preview'}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Import for class: {selectedClassId ? (classes.find(c => c.id === selectedClassId)?.name || 'Selected class') : 'Using Class column in file (column 1)'}
          </div>

          {preview && (
            <Card className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Summary: {preview.stats.students} rows • {preview.stats.createParents} new parents • {preview.stats.updateParents} updates • {preview.stats.linkParents} links • {preview.stats.skippedParents} skipped • {preview.stats.errors} issues
              </div>
              <div className="max-h-80 overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left">Include</th>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">Class</th>
                      <th className="p-2 text-left">Mother</th>
                      <th className="p-2 text-left">Father</th>
                      <th className="p-2 text-left">Primary</th>
                      <th className="p-2 text-left">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(r => (
                      <tr key={r.rowIndex} className="border-t">
                        <td className="p-2">{r.rowIndex}</td>
                        <td className="p-2">{r.studentName}</td>
                        <td className="p-2">{r.classNameResolved || '—'}</td>
                        <td className="p-2">
                          {r.mother.type === 'skip' && <span className="text-muted-foreground">Skip</span>}
                          {r.mother.type === 'link-existing' && <span>Link</span>}
                          {r.mother.type === 'create-new' && <span>Create</span>}
                          {r.mother.type === 'update-existing' && <span>Update</span>}
                        </td>
                        <td className="p-2">
                          {r.father.type === 'skip' && <span className="text-muted-foreground">Skip</span>}
                          {r.father.type === 'link-existing' && <span>Link</span>}
                          {r.father.type === 'create-new' && <span>Create</span>}
                          {r.father.type === 'update-existing' && <span>Update</span>}
                        </td>
                        <td className="p-2">{r.primaryParent || '—'}</td>
                        <td className="p-2">{r.errors.length ? r.errors.join('; ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={!preview || applying} className="bg-school-primary">
            {applying ? 'Importing...' : 'Apply Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FullImportDialog;
