import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getInvitationByToken, updatePickupInvitation } from '@/services/pickupInvitationService';

interface InvitationDetails {
  id: string;
  invitedName: string;
  invitedEmail: string;
  invitedRole: string;
  startDate: string;
  endDate: string;
  invitingParentName: string;
  studentNames: string[];
}

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Token de invitación no válido');
        setLoading(false);
        return;
      }

      try {
        const invitationData = await getInvitationByToken(token);
        
        if (!invitationData) {
          setError('Invitación no encontrada o expirada');
          setLoading(false);
          return;
        }

        setInvitation({
          id: invitationData.id,
          invitedName: invitationData.invitedName,
          invitedEmail: invitationData.invitedEmail,
          invitedRole: invitationData.invitedRole,
          startDate: invitationData.startDate,
          endDate: invitationData.endDate,
          invitingParentName: invitationData.invitingParent?.name || 'Un padre del colegio',
          studentNames: invitationData.students?.map(s => s.name) || []
        });
      } catch (error) {
        console.error('Error loading invitation:', error);
        setError('Error al cargar la invitación');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      await updatePickupInvitation(invitation.id, { invitationStatus: 'accepted' });
      toast.success('Invitación aceptada correctamente');
      navigate('/login');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Error al aceptar la invitación');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      await updatePickupInvitation(invitation.id, { invitationStatus: 'declined' });
      toast.success('Invitación rechazada');
      navigate('/login');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Error al rechazar la invitación');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando invitación...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitación de Autorización de Recogida</CardTitle>
          <CardDescription>
            Has sido invitado/a para autorizar la recogida de estudiantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Detalles de la invitación:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Invitado por:</strong> {invitation.invitingParentName}</p>
              <p><strong>Para:</strong> {invitation.invitedName}</p>
              <p><strong>Email:</strong> {invitation.invitedEmail}</p>
              <p><strong>Rol:</strong> {invitation.invitedRole === 'family' ? 'Familiar' : 'Otro'}</p>
              <p><strong>Estudiantes:</strong> {invitation.studentNames.join(', ')}</p>
              <p><strong>Fecha de inicio:</strong> {new Date(invitation.startDate).toLocaleDateString('es-ES')}</p>
              <p><strong>Fecha de fin:</strong> {new Date(invitation.endDate).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleAccept} 
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                'Aceptar'
              )}
            </Button>
            <Button 
              onClick={handleDecline} 
              variant="outline" 
              disabled={processing}
              className="flex-1"
            >
              Rechazar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Al aceptar esta invitación, podrás recoger a los estudiantes mencionados en las fechas indicadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;