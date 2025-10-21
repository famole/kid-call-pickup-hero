import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuthorizedParentsByDate } from '@/hooks/useAuthorizedParentsByDate';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthorizedParentsViewProps {
  selectedClass?: string;
}

export const AuthorizedParentsView: React.FC<AuthorizedParentsViewProps> = ({ selectedClass = 'all' }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const { authorizedParents, loading } = useAuthorizedParentsByDate(selectedDate, selectedClass, searchTerm);
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Padres Autorizados por Fecha
              </CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de padre o estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : authorizedParents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">
                {searchTerm ? 'No se encontraron resultados' : 'No hay padres autorizados para esta fecha'}
              </p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Selecciona otra fecha para ver las autorizaciones activas'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {isMobile ? (
                <div className="space-y-4">
                  {authorizedParents.map((parent) => (
                    <Card key={parent.parentId} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-lg">{parent.parentName}</p>
                            <p className="text-sm text-muted-foreground">{parent.parentEmail}</p>
                            {parent.parentRole && (
                              <Badge variant="secondary" className="mt-1">
                                {parent.parentRole}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Estudiantes autorizados ({parent.students.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {parent.students.map((student) => (
                                <Badge key={student.id} variant="outline">
                                  {student.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Padre/Tutor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estudiantes Autorizados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizedParents.map((parent) => (
                      <TableRow key={parent.parentId}>
                        <TableCell className="font-medium text-left">{parent.parentName}</TableCell>
                        <TableCell className="text-muted-foreground text-left">{parent.parentEmail}</TableCell>
                        <TableCell className="text-left">
                          {parent.parentRole && (
                            <Badge variant="secondary">{parent.parentRole}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex flex-wrap gap-1">
                            {parent.students.map((student) => (
                              <Badge key={student.id} variant="outline" className="text-xs">
                                {student.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="text-sm text-muted-foreground text-center pt-4 border-t">
                Total: {authorizedParents.length} {authorizedParents.length === 1 ? 'padre autorizado' : 'padres autorizados'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
