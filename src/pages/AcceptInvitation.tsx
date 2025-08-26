import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { getInvitationByToken, updatePickupInvitation } from '@/services/pickupInvitationService';
import { supabase } from '@/integrations/supabase/client';

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
  const [authStep, setAuthStep] = useState<'invitation' | 'auth'>('invitation');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

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
    setEmail(invitation.invitedEmail);
    setAuthStep('auth');
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

  const handleGoogleSignIn = async () => {
    if (!invitation || !token) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/?invitation_token=${token}`,
          queryParams: {
            invitation_token: token,
            invitation_id: invitation.id
          }
        }
      });
      
      if (error) {
        toast.error('Error al iniciar sesión con Google');
        console.error('Google sign in error:', error);
      }
    } catch (error) {
      console.error('Error with Google sign in:', error);
      toast.error('Error al iniciar sesión con Google');
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !password || !email) return;

    setProcessing(true);
    try {
      let authResult;
      
      if (isSignUp) {
        // Sign up new user
        authResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: invitation.invitedName,
              invitation_token: token // Pass the token in user metadata
            }
          }
        });
      } else {
        // Sign in existing user
        authResult = await supabase.auth.signInWithPassword({
          email,
          password
        });
      }

      if (authResult.error) {
        if (authResult.error.message.includes('User already registered')) {
          setIsSignUp(false);
          toast.error('Ya tienes una cuenta. Usa tu contraseña para iniciar sesión.');
          return;
        }
        toast.error(authResult.error.message);
        return;
      }

      // Accept the invitation after successful authentication
      if (authResult.data.user) {
        try {
          await updatePickupInvitation(invitation.id, { invitationStatus: 'accepted' });
          toast.success(isSignUp ? 'Cuenta creada e invitación aceptada' : 'Sesión iniciada e invitación aceptada');
          
          // Add a small delay before redirect to ensure invitation is processed
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } catch (invitationError) {
          console.error('Error accepting invitation:', invitationError);
          toast.error('Usuario creado pero error al aceptar invitación. Contacta al administrador.');
          
          // Still redirect to dashboard even if invitation acceptance fails
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      }
      
    } catch (error) {
      console.error('Error with authentication:', error);
      toast.error('Error en la autenticación');
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

  if (authStep === 'invitation') {
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
                Aceptar
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
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta o iniciar sesión</CardTitle>
          <CardDescription>
            Para aceptar la invitación, necesitas una cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={processing}
            variant="outline"
            className="w-full"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continuar con Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O</span>
            </div>
          </div>

          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Crea una contraseña" : "Tu contraseña"}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={processing || !password} className="w-full">
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                isSignUp ? 'Crear cuenta y aceptar invitación' : 'Iniciar sesión y aceptar invitación'
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp 
                ? '¿Ya tienes cuenta? Inicia sesión' 
                : '¿No tienes cuenta? Crear una nueva'
              }
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setAuthStep('invitation')}
            className="w-full text-sm"
          >
            Volver a la invitación
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;