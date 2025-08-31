import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getInvitationByToken, updatePickupInvitation } from '@/services/pickupInvitationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/AuthProvider';
import { Separator } from '@/components/ui/separator';

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
  const { user, loading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User status and form states
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

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

        // Check if invitation is already accepted or declined
        if (invitationData.invitationStatus !== 'pending') {
          if (invitationData.invitationStatus === 'accepted') {
            toast.success('Esta invitación ya fue aceptada');
          } else {
            toast.info('Esta invitación ya fue procesada');
          }
          navigate('/');
          return;
        }

        const invitationDetails = {
          id: invitationData.id,
          invitedName: invitationData.invitedName,
          invitedEmail: invitationData.invitedEmail,
          invitedRole: invitationData.invitedRole,
          startDate: invitationData.startDate,
          endDate: invitationData.endDate,
          invitingParentName: invitationData.invitingParent?.name || 'Un padre del colegio',
          studentNames: invitationData.students?.map(s => s.name) || []
        };

        setInvitation(invitationDetails);
        setEmail(invitationDetails.invitedEmail);
        setName(invitationDetails.invitedName);

        // If user is authenticated, check if they match the invitation
        if (user) {
          // Check if logged-in user matches invitation recipient
          if (user.email !== invitationDetails.invitedEmail) {
            setError('user_mismatch');
            setLoading(false);
            return;
          }
          setLoading(false);
          return;
        }

        // User is not authenticated, check if they exist in the system
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('email, password_set, is_preloaded')
          .eq('email', invitationDetails.invitedEmail)
          .single();

        if (parentError || !parentData) {
          // User doesn't exist, show signup form
          setUserExists(false);
          setShowSignupForm(true);
        } else {
          // User exists, show login form
          setUserExists(true);
          setShowLoginForm(true);
        }
      } catch (error) {
        console.error('Error loading invitation:', error);
        setError('Error al cargar la invitación');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, user, authLoading, navigate]);

  const handleAccept = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      await updatePickupInvitation(invitation.id, { invitationStatus: 'accepted' });
      toast.success('Invitación aceptada exitosamente');
      navigate('/');
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
      navigate('/');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Error al rechazar la invitación');
    } finally {
      setProcessing(false);
    }
  };

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setIsSubmitting(true);
    try {
      // Login first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Accept invitation after successful login
        await updatePickupInvitation(invitation.id, { invitationStatus: 'accepted' });
        toast.success('Has iniciado sesión y aceptado la invitación exitosamente');
        // Force page reload to update auth state
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Error logging in and accepting invitation:', error);
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (email !== invitation.invitedEmail) {
      toast.error('El email debe coincidir con el de la invitación');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the account first
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Accept invitation after successful signup
        await updatePickupInvitation(invitation.id, { invitationStatus: 'accepted' });
        toast.success('Cuenta creada e invitación aceptada exitosamente');
        // Force page reload to update auth state
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Error creating account and accepting invitation:', error);
      toast.error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/accept-invitation/${token}`
        }
      });
      
      if (error) throw error;
      
      toast.info('Redirigiendo a Google...');
    } catch (error: any) {
      console.error('Google authentication error:', error);
      toast.error(error.message || 'Error al autenticar con Google');
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-school-background via-background to-school-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-school-primary/10">
          <CardHeader className="flex flex-col items-center space-y-4">
            <div className="mb-4">
              <img
                src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                alt="Upsy"
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="text-center">
              <CardTitle className="text-school-primary">Upsy</CardTitle>
              <CardDescription>Gestión escolar simplificada</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-school-primary" />
            <span className="ml-2">Cargando invitación...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-school-background via-background to-school-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-school-primary/10">
          <CardHeader className="flex flex-col items-center space-y-4">
            <div className="mb-4">
              <img
                src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                alt="Upsy"
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <CardTitle className="text-xl text-destructive">
                {error === 'user_mismatch' ? 'Usuario incorrecto' : '¡Ups! Algo salió mal'}
              </CardTitle>
              <CardDescription className="text-muted-foreground leading-relaxed">
                {error === 'user_mismatch' && (
                  <>
                    Esta invitación es para <strong>{invitation?.invitedEmail}</strong>, pero tienes la sesión iniciada como <strong>{user?.email}</strong>.
                  </>
                )}
                {error === 'Token de invitación no válido' && 'El enlace de invitación no es válido o ha sido modificado.'}
                {error === 'Invitación no encontrada o expirada' && 'Esta invitación no existe o ha expirado. Por favor, solicita una nueva invitación.'}
                {!error.includes('Token') && !error.includes('Invitación') && error !== 'user_mismatch' && 'No pudimos cargar los detalles de la invitación en este momento.'}
              </CardDescription>
              <p className="text-xs text-school-primary/70 font-medium">Upsy - Gestión escolar simplificada</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 border border-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">¿Qué puedes hacer?</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {error === 'user_mismatch' ? (
                  <>
                    <li>• Cierra sesión y accede con la cuenta correcta</li>
                    <li>• Solicita una nueva invitación para tu email actual</li>
                    <li>• Verifica que estés usando el enlace correcto</li>
                  </>
                ) : (
                  <>
                    <li>• Verifica que el enlace esté completo</li>
                    <li>• Solicita una nueva invitación al remitente</li>
                    <li>• Contacta al administrador si el problema persiste</li>
                  </>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              {error === 'user_mismatch' ? (
                <>
                  <Button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate('/login');
                    }} 
                    className="w-full bg-school-primary hover:bg-school-primary/90 text-white"
                  >
                    Cerrar sesión e ir al login
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => navigate('/login')} 
                  className="w-full bg-school-primary hover:bg-school-primary/90 text-white"
                >
                  Ir al inicio de sesión
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => window.location.reload()} 
                className="w-full border-school-primary/20 text-school-primary hover:bg-school-primary/5"
              >
                Intentar nuevamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  // Show login form for existing users
  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-school-background via-background to-school-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-school-primary/10">
          <CardHeader className="space-y-4 flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                alt="Upsy"
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl text-school-primary">Iniciar Sesión</CardTitle>
              <CardDescription className="text-muted-foreground">
                Inicia sesión para aceptar la invitación
              </CardDescription>
              <p className="text-xs text-school-primary/70 font-medium">Upsy - Gestión escolar simplificada</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Invitation Details */}
            <div className="bg-school-primary/5 border border-school-primary/20 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-school-primary">Detalles de la invitación:</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Invitado por:</strong> {invitation.invitingParentName}</p>
                <p><strong>Para:</strong> {invitation.invitedName}</p>
                <p><strong>Estudiantes:</strong> {invitation.studentNames.join(', ')}</p>
                <p><strong>Período:</strong> {new Date(invitation.startDate).toLocaleDateString('es-ES')} - {new Date(invitation.endDate).toLocaleDateString('es-ES')}</p>
              </div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isSubmitting ? 'Iniciando sesión...' : 'Continuar con Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  o continuar con
                </span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginAndAccept} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled
                />
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
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-school-primary hover:bg-school-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Iniciando sesión y aceptando...
                  </>
                ) : (
                  'Iniciar sesión y aceptar invitación'
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show signup form for new users
  if (showSignupForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-school-background via-background to-school-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-school-primary/10">
          <CardHeader className="space-y-4 flex flex-col items-center">
            <div className="mb-4">
              <img
                src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                alt="Upsy"
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl text-school-primary">Crear Cuenta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Crea tu cuenta para aceptar la invitación
              </CardDescription>
              <p className="text-xs text-school-primary/70 font-medium">Upsy - Gestión escolar simplificada</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Invitation Details */}
            <div className="bg-school-primary/5 border border-school-primary/20 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-school-primary">Detalles de la invitación:</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Invitado por:</strong> {invitation.invitingParentName}</p>
                <p><strong>Para:</strong> {invitation.invitedName}</p>
                <p><strong>Estudiantes:</strong> {invitation.studentNames.join(', ')}</p>
                <p><strong>Período:</strong> {new Date(invitation.startDate).toLocaleDateString('es-ES')} - {new Date(invitation.endDate).toLocaleDateString('es-ES')}</p>
              </div>
            </div>

            {/* Google Signup */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isSubmitting ? 'Creando cuenta...' : 'Continuar con Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  o continuar con
                </span>
              </div>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignupAndAccept} className="space-y-4">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled
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
                disabled={isSubmitting || email !== invitation.invitedEmail}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando cuenta y aceptando...
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show accept/decline screen for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-school-background via-background to-school-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-school-primary/10">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <div className="mb-4">
            <img
              src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-24 w-auto object-contain"
            />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-xl text-school-primary">Invitación de Autorización de Recogida</CardTitle>
            <CardDescription className="text-muted-foreground">
              Has sido invitado/a para autorizar la recogida de estudiantes
            </CardDescription>
            <p className="text-xs text-school-primary/70 font-medium">Upsy - Gestión escolar simplificada</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-school-primary/5 border border-school-primary/20 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-2 text-school-primary">Detalles de la invitación:</h3>
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
              className="flex-1 bg-school-primary hover:bg-school-primary/90 text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aceptando...
                </>
              ) : (
                'Aceptar'
              )}
            </Button>
            <Button 
              onClick={handleDecline} 
              variant="outline" 
              disabled={processing}
              className="flex-1 border-school-primary text-school-primary hover:bg-school-primary/10"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rechazando...
                </>
              ) : (
                'Rechazar'
              )}
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