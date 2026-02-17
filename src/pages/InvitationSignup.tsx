import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getInvitationByToken } from '@/services/pickupInvitationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

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

const InvitationSignup = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      navigate(`/accept-invitation/${token}`);
    }
  }, [isAuthenticated, navigate, token]);

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

        // Check if invitation is already processed
        if (invitationData.invitationStatus !== 'pending') {
          toast.info('Esta invitación ya fue procesada');
          navigate('/login');
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

        // Pre-fill email and name from invitation
        if (!emailParam) {
          setEmail(invitationData.invitedEmail);
        }
        setName(invitationData.invitedName);
      } catch (error) {
        logger.error('Error loading invitation:', error);
        setError('Error al cargar la invitación');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, emailParam, navigate]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!invitation) {
      toast.error('Error: no se pudo cargar la invitación');
      return;
    }

    // Verify email matches invitation
    if (email !== invitation.invitedEmail) {
      toast.error('El email debe coincidir con el de la invitación');
      return;
    }

    setIsCreating(true);

    try {
      // Create the Supabase auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/accept-invitation/${token}`,
          data: {
            name: name
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Link auth_uid to existing parent record (matched by email)
        try {
          await supabase
            .from('parents')
            .update({ auth_uid: data.user.id })
            .eq('email', email)
            .is('auth_uid', null);
        } catch (linkErr) {
          logger.warn('auth_uid link on invitation signup failed:', linkErr);
        }

        toast.success('Cuenta creada exitosamente. Redirigiendo...');
        setTimeout(() => {
          navigate(`/accept-invitation/${token}`);
        }, 1000);
      }
    } catch (error: any) {
      logger.error('Error creating account:', error);
      toast.error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsCreating(false);
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
              Volver al inicio de sesión
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
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="mb-4">
            <img
              src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-16 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Has sido invitado/a para autorizar la recogida de estudiantes
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Invitation Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Detalles de la invitación:</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Invitado por:</strong> {invitation.invitingParentName}</p>
              <p><strong>Para:</strong> {invitation.invitedName}</p>
              <p><strong>Estudiantes:</strong> {invitation.studentNames.join(', ')}</p>
              <p><strong>Período:</strong> {new Date(invitation.startDate).toLocaleDateString('es-ES')} - {new Date(invitation.endDate).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!emailParam}
              />
              {email !== invitation.invitedEmail && (
                <p className="text-xs text-destructive">
                  El email debe coincidir con el de la invitación: {invitation.invitedEmail}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-school-primary hover:bg-school-primary/90"
              disabled={isCreating || email !== invitation.invitedEmail}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta y aceptar invitación'
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Al crear tu cuenta, podrás recoger a los estudiantes mencionados en las fechas indicadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationSignup;