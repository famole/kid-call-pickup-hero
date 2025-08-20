
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { getAllClasses } from "@/services/classService";
import { parseFullImportFile } from "@/utils/fullImportParser";
import { buildFullImportPreview, applyFullImport, FullImportPreview } from "@/services/import/fullImport";
import type { FullImportInputRow } from "@/services/import/fullImport";
import { useTranslation } from '@/hooks/useTranslation';

const FullImportDialog: React.FC<{ onCompleted?: () => void } > = ({ onCompleted }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [classes, setClasses] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState<string | undefined>();
  const [preview, setPreview] = React.useState<FullImportPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [rowEnabled, setRowEnabled] = React.useState<Record<number, boolean>>({});
  const [editableRows, setEditableRows] = React.useState<FullImportInputRow[] | null>(null);

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
    setEditableRows(null);
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
      toast({ title: t('common.error'), description: t('fullImportDialog.noFileSelected'), variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const rows = await parseFullImportFile(file);
      if (!rows.length) {
        toast({ title: t('common.warning'), description: t('fullImportDialog.noDataFound'), variant: 'destructive' });
        setLoading(false);
        return;
      }
      setEditableRows(rows as FullImportInputRow[]);
      const p = await buildFullImportPreview(rows, selectedClassId || null);
      setPreview(p);
      const initialEnabled = Object.fromEntries(
        p.rows.map(r => [r.rowIndex, !r.errors.some(e => e.toLowerCase().includes('email'))])
      );
      setRowEnabled(initialEnabled);
      toast({ title: t('common.success'), description: t('fullImportDialog.rowsToProcess', { count: p.rows.length }) });
    } catch (e: any) {
      toast({ title: t('common.error'), description: t('fullImportDialog.fileParsingError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const revalidate = async () => {
    if (!editableRows) return;
    try {
      setLoading(true);
      const p = await buildFullImportPreview(editableRows, selectedClassId || null);
      setPreview(p);
      setRowEnabled(prev => {
        const map: Record<number, boolean> = {};
        p.rows.forEach(r => {
          const hasEmail = r.errors.some(e => e.toLowerCase().includes('email'));
          map[r.rowIndex] = hasEmail ? false : (prev[r.rowIndex] !== false);
        });
        return map;
      });
    } catch (e) {
      // ignore
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
        toast({ title: t('common.warning'), description: t('fullImportDialog.someRowsHaveErrors'), variant: 'destructive' });
        setApplying(false);
        return;
      }
      const res = await applyFullImport({ ...preview, rows: selectedRows });
      if (res.errors.length) {
        toast({ title: t('fullImportDialog.importCompleted'), description: t('fullImportDialog.studentsCreated', { count: res.successes }), variant: 'destructive' });
      } else {
        toast({ title: t('common.success'), description: t('fullImportDialog.studentsCreated', { count: res.successes }) });
      }
      setOpen(false);
      onCompleted?.();
    } catch (e: any) {
      toast({ title: t('common.error'), description: t('fullImportDialog.importFailed'), variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> {t('fullImportDialog.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-7xl">
        <DialogHeader>
          <DialogTitle>{t('fullImportDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('fullImportDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} placeholder={t('fullImportDialog.selectFile')} />
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="min-w-[220px]">
                <SelectValue placeholder={t('fullImportDialog.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleBuildPreview} disabled={loading} className="bg-school-primary">
              {loading ? t('fullImportDialog.buildingPreview') : t('fullImportDialog.buildPreview')}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {t('fullImportDialog.classFilter')}: {selectedClassId ? (classes.find(c => c.id === selectedClassId)?.name || t('admin.selectClass')) : t('fullImportDialog.columnHeaders.className')}
          </div>

          {preview && (
            <Card className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                {t('fullImportDialog.importSummary')}: {preview.stats.students} {t('common.rows')} • {preview.stats.createParents} {t('fullImportDialog.parentsToCreate')} • {preview.stats.updateParents} {t('fullImportDialog.parentsToUpdate')} • {preview.stats.linkParents} {t('fullImportDialog.parentActions.linkExisting')} • {preview.stats.skippedParents} {t('fullImportDialog.parentActions.skip')} • {preview.stats.errors} {t('fullImportDialog.columnHeaders.errors')}
              </div>
              <div className="max-h-[70vh] overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left">{t('fullImportDialog.columnHeaders.include')}</th>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">{t('fullImportDialog.columnHeaders.studentName')}</th>
                      <th className="p-2 text-left">{t('fullImportDialog.columnHeaders.className')}</th>
                      <th className="p-2 text-left">{t('fullImportDialog.columnHeaders.motherName')}</th>
                      <th className="p-2 text-left">{t('fullImportDialog.columnHeaders.fatherName')}</th>
                      <th className="p-2 text-left">{t('studentDetails.primary')}</th>
                      <th className="p-2 text-left">{t('fullImportDialog.columnHeaders.errors')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map(r => (
                      <tr key={r.rowIndex} className={`border-t ${r.errors.length ? 'bg-destructive/5' : ''}`}>
                        <td className="p-2">
                          <Checkbox
                            checked={!r.errors.some(e => e.toLowerCase().includes('email')) && rowEnabled[r.rowIndex] !== false}
                            disabled={r.errors.some(e => e.toLowerCase().includes('email'))}
                            onCheckedChange={(checked) =>
                              setRowEnabled(prev => ({ ...prev, [r.rowIndex]: Boolean(checked) }))
                            }
                            aria-label={`${t('fullImportDialog.columnHeaders.include')} ${t('common.row')} ${r.rowIndex}`}
                          />
                        </td>
                        <td className="p-2">{r.rowIndex}</td>
                        <td className="p-2">{r.studentName}</td>
                        <td className="p-2">{r.classNameResolved || '—'}</td>
                        <td className="p-2">
                          <div className="space-y-1">
                            <Input
                              value={(editableRows?.[r.rowIndex - 1]?.motherEmail as string) || ''}
                              onChange={(e) =>
                                setEditableRows(prev => {
                                  if (!prev) return prev;
                                  const copy = [...prev];
                                  copy[r.rowIndex - 1] = { ...copy[r.rowIndex - 1], motherEmail: e.target.value };
                                  return copy;
                                })
                              }
                              placeholder={t('fullImportDialog.columnHeaders.motherEmail')}
                              className="h-8"
                            />
                            {r.mother.type === 'skip' && (
                              <span className="text-muted-foreground">{t('fullImportDialog.parentActions.skip')} ({r.mother.reason})</span>
                            )}
                            {r.mother.type === 'link-existing' && (
                              <div>
                                <div>{t('fullImportDialog.parentActions.linkExisting')}</div>
                                <div className="text-xs text-muted-foreground">{r.mother.email}</div>
                              </div>
                            )}
                            {r.mother.type === 'create-new' && (
                              <div>
                                <div>{t('fullImportDialog.parentActions.createNew')}</div>
                                <div className="text-xs text-muted-foreground">{r.mother.payload.name} • {r.mother.payload.email}</div>
                              </div>
                            )}
                            {r.mother.type === 'update-existing' && (
                              <div>
                                <div>{t('fullImportDialog.parentActions.updateExisting')}</div>
                                <div className="text-xs text-muted-foreground">{t('admin.name')} → {r.mother.updates?.name} • {r.mother.email}</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="space-y-1">
                            <Input
                              value={(editableRows?.[r.rowIndex - 1]?.fatherEmail as string) || ''}
                              onChange={(e) =>
                                setEditableRows(prev => {
                                  if (!prev) return prev;
                                  const copy = [...prev];
                                  copy[r.rowIndex - 1] = { ...copy[r.rowIndex - 1], fatherEmail: e.target.value };
                                  return copy;
                                })
                              }
                              placeholder={t('fullImportDialog.columnHeaders.fatherEmail')}
                              className="h-8"
                            />
                            {r.father.type === 'skip' && (
                              <span className="text-muted-foreground">{t('fullImportDialog.parentActions.skip')} ({r.father.reason})</span>
                            )}
                            {r.father.type === 'link-existing' && (
                              <div>
                                <div>{t('fullImportDialog.parentActions.linkExisting')}</div>
                                <div className="text-xs text-muted-foreground">{r.father.email}</div>
                              </div>
                            )}
                            {r.father.type === 'create-new' && (
                              <div>
                                <div>{t('fullImportDialog.parentActions.createNew')}</div>
                                <div className="text-xs text-muted-foreground">{r.father.payload.name} • {r.father.payload.email}</div>
                              </div>
                            )}
                            {r.father.type === 'update-existing' && (
                              <div>
                                <div>{t('fullImportDialog.parentActions.updateExisting')}</div>
                                <div className="text-xs text-muted-foreground">{t('admin.name')} → {r.father.updates?.name} • {r.father.email}</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{r.primaryParent || '—'}</td>
                        <td className="p-2">
                          {r.errors.length ? (
                            <div className="space-y-2">
                              <div>{r.errors.join('; ')}</div>
                              {r.errors.some(e => e.toLowerCase().includes('email')) && (
                                <Button size="sm" variant="secondary" onClick={revalidate} disabled={loading}>
                                  {t('common.confirm')}
                                </Button>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('fullImportDialog.cancel')}</Button>
          <Button onClick={handleApply} disabled={!preview || applying} className="bg-school-primary">
            {applying ? t('fullImportDialog.applying') : t('fullImportDialog.applyImport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FullImportDialog;
