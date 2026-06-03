import { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  Lock, 
  Mail, 
  LogOut, 
  RefreshCw, 
  UserPlus, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { auth } from '../utils/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  downloadUserData, 
  uploadUserData, 
  mergeLocalAndCloudData 
} from '../utils/firebaseSync';

interface SyncPanelProps {
  customRoutines: any[];
  setCustomRoutines: (routines: any[]) => void;
  setLocalHistory: (history: any[]) => void;
  activeInjury: any | null;
  setActiveInjury: (injury: any) => void;
  bodyWeight: number;
  setBodyWeight: (weight: number, skipCloudUpload?: boolean) => void;
  height: number;
  setHeight: (height: number, skipCloudUpload?: boolean) => void;
  gender: 'Masculino' | 'Femenino';
  setGender: (gender: 'Masculino' | 'Femenino', skipCloudUpload?: boolean) => void;
  bodyFat: number;
  setBodyFat: (fat: number, skipCloudUpload?: boolean) => void;
  weightHistory: any[];
  setWeightHistory: (history: any[]) => void;
  deletedRoutines: string[];
  setDeletedRoutines: (routines: string[]) => void;
}

export default function SyncPanel({
  customRoutines,
  setCustomRoutines,
  setLocalHistory,
  activeInjury,
  setActiveInjury,
  bodyWeight,
  setBodyWeight,
  height,
  setHeight,
  gender,
  setGender,
  bodyFat,
  setBodyFat,
  weightHistory,
  setWeightHistory,
  deletedRoutines,
  setDeletedRoutines
}: SyncPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbNotEnabledError, setDbNotEnabledError] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Trigger auto-sync on login
        triggerSync(currentUser.uid);
      } else {
        setSyncSuccess(false);
        setDbNotEnabledError(false);
      }
    });
    return unsubscribe;
  }, []);

  // Trigger sync process
  const triggerSync = async (userId: string) => {
    setSyncing(true);
    setError(null);
    setDbNotEnabledError(false);
    setSyncSuccess(false);

    try {
      // 1. Get user custom sessions from localStorage
      const savedUserSessions = localStorage.getItem('milo_user_sessions');
      const localSessions = savedUserSessions ? JSON.parse(savedUserSessions) : [];
      
      const localData = {
        customRoutines,
        userSessions: localSessions,
        activeInjury,
        bodyWeight,
        height,
        gender,
        bodyFat,
        weightHistory,
        deletedRoutines
      };

      // 2. Download from Cloud Firestore
      let cloudData = null;
      try {
        cloudData = await downloadUserData(userId);
      } catch (err: any) {
        // Check for specific Firestore activation/billing errors
        const errMsg = err.message || '';
        if (
          errMsg.includes('billing') || 
          errMsg.includes('not enabled') || 
          errMsg.includes('API') ||
          errMsg.includes('permission-denied') ||
          err.code === 'permission-denied'
        ) {
          setDbNotEnabledError(true);
          throw new Error('Base de datos Firestore no habilitada en la consola.');
        }
        throw err;
      }

      if (cloudData) {
        // 3. Merge Local and Cloud
        const { merged, hasChanges } = mergeLocalAndCloudData(localData, cloudData);

        // Update local React states
        setCustomRoutines(merged.customRoutines);
        setActiveInjury(merged.activeInjury);
        setBodyWeight(merged.bodyWeight, true);
        setHeight(merged.height, true);
        setGender(merged.gender, true);
        setBodyFat(merged.bodyFat, true);
        setWeightHistory(merged.weightHistory);
        setDeletedRoutines(merged.deletedRoutines);
        
        // Update local user sessions in localStorage
        localStorage.setItem('milo_user_sessions', JSON.stringify(merged.userSessions));
        localStorage.setItem('plnexc_custom_routines', JSON.stringify(merged.customRoutines));
        localStorage.setItem('plnexc_body_weight', merged.bodyWeight.toString());
        localStorage.setItem('plnexc_height', merged.height.toString());
        localStorage.setItem('plnexc_gender', merged.gender);
        localStorage.setItem('plnexc_body_fat', merged.bodyFat.toString());
        localStorage.setItem('plnexc_weight_history', JSON.stringify(merged.weightHistory));
        localStorage.setItem('plnexc_deleted_routines', JSON.stringify(merged.deletedRoutines));
        if (merged.activeInjury) {
          localStorage.setItem('milo_active_injury', JSON.stringify(merged.activeInjury));
        } else {
          localStorage.removeItem('milo_active_injury');
        }

        // Update local history in App.tsx state
        const fullHistory = [...merged.userSessions];
        fullHistory.sort((a, b) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
        setLocalHistory(fullHistory);

        // 4. Upload merged back if there are changes
        if (hasChanges) {
          await uploadUserData(userId, {
            customRoutines: merged.customRoutines,
            userSessions: merged.userSessions,
            activeInjury: merged.activeInjury,
            bodyWeight: merged.bodyWeight,
            height: merged.height,
            gender: merged.gender,
            bodyFat: merged.bodyFat,
            weightHistory: merged.weightHistory,
            deletedRoutines: merged.deletedRoutines
          });
        }
      } else {
        // First time syncing, upload whatever local data exists
        await uploadUserData(userId, {
          customRoutines: localData.customRoutines,
          userSessions: localData.userSessions,
          activeInjury: localData.activeInjury,
          bodyWeight: localData.bodyWeight,
          height: localData.height,
          gender: localData.gender,
          bodyFat: localData.bodyFat,
          weightHistory: localData.weightHistory,
          deletedRoutines: localData.deletedRoutines
        });
      }

      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err: any) {
      console.error('Sync Error:', err);
      if (!dbNotEnabledError) {
        setError(err.message || 'Error desconocido al sincronizar.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDbNotEnabledError(false);

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setError('Por favor completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Auth error:', err);
      let localizedError = `Error de autenticación: ${err.code || err.message || 'Error desconocido'}`;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        localizedError = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        localizedError = 'El correo ya está registrado.';
      } else if (err.code === 'auth/weak-password') {
        localizedError = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        localizedError = 'Formato de correo no válido.';
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = 'El registro con Correo y Contraseña está desactivado en la consola. Ve a Firebase Console > Authentication > Sign-in method y actívalo.';
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setDbNotEnabledError(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      let localizedError = `Error al iniciar sesión con Google: ${err.code || err.message}`;
      if (err.code === 'auth/popup-blocked') {
        localizedError = 'El navegador bloqueó la ventana emergente de Google. Habilita las ventanas emergentes e inténtalo de nuevo.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        localizedError = 'La ventana de inicio de sesión de Google se cerró antes de completar el registro.';
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = 'El inicio de sesión con Google está desactivado en la consola de Firebase. Habilítalo en Firebase Console > Authentication > Sign-in method.';
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Error al cerrar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = () => {
    if (user) {
      triggerSync(user.uid);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header Button Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`nav-tab ${user ? 'active' : ''}`}
        style={{
          background: user ? 'hsla(var(--primary) / 0.1)' : 'rgba(255,255,255,0.03)',
          border: '1px solid ' + (user ? 'hsla(var(--primary) / 0.3)' : 'hsl(var(--border))'),
          color: user ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer'
        }}
        title="Sincronizar Cloud"
      >
        {syncing ? (
          <Loader2 size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
        ) : user ? (
          <Cloud size={16} />
        ) : (
          <CloudOff size={16} />
        )}
        <span style={{ fontSize: '0.85rem' }}>
          {syncing ? 'Sincronizando...' : user ? 'Nube Activa' : 'Sincronizar'}
        </span>
      </button>

      {/* Sync Dropdown Panel */}
      {isOpen && (
        <div 
          className="glass-panel fade-in"
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '320px',
            padding: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--shadow-md), 0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid hsla(var(--primary) / 0.25)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cloud size={18} color="hsl(var(--primary))" />
              Sincronización en la Nube
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted))', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ×
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', lineHeight: 1.4 }}>
            Sincroniza tus rutinas personalizadas, historial de entrenamientos y estado de rehabilitación PLNEXC entre todos tus dispositivos.
          </p>

          <hr style={{ border: 'none', borderBottom: '1px solid hsl(var(--border))' }} />

          {/* Database Not Created (Console Link) Alert */}
          {dbNotEnabledError && (
            <div style={{ 
              background: 'hsla(var(--warning) / 0.1)', 
              border: '1px solid hsla(var(--warning) / 0.3)', 
              padding: '10px 12px', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              color: 'hsl(var(--warning))',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              lineHeight: '1.3'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <AlertTriangle size={14} /> Base de datos inactiva
              </div>
              <span>
                La base de datos de Firestore en tu cuenta aún no está activa. Para habilitarla gratis en modo de prueba, visita:
              </span>
              <a 
                href="https://console.firebase.google.com/project/plnexc-coach/firestore" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', fontWeight: 'bold', wordBreak: 'break-all' }}
              >
                console.firebase.google.com/project/plnexc-coach/firestore
              </a>
              <span>Los datos seguirán guardados localmente hasta que la actives.</span>
            </div>
          )}

          {/* Success message */}
          {syncSuccess && (
            <div style={{ 
              background: 'hsla(var(--success) / 0.1)', 
              border: '1px solid hsla(var(--success) / 0.3)', 
              padding: '8px 12px', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              color: 'hsl(var(--success))',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={14} /> Sincronización exitosa
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ 
              background: 'hsla(var(--danger) / 0.1)', 
              border: '1px solid hsla(var(--danger) / 0.3)', 
              padding: '8px 12px', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              color: 'hsl(var(--danger))',
              wordBreak: 'break-word'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Authenticated State */}
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: '#ffffff', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid hsl(var(--border))' }}>
                <span style={{ color: 'hsl(var(--muted))', display: 'block', fontSize: '0.7rem' }}>Sesión iniciada como:</span>
                <strong style={{ wordBreak: 'break-all' }}>{user.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleManualSync}
                  disabled={syncing}
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <RefreshCw size={14} className={syncing ? 'spin' : ''} /> Sync
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleLogout}
                  disabled={loading}
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <LogOut size={14} /> Salir
                </button>
              </div>
            </div>
          ) : (
            /* Login/Register Form */
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  placeholder="Correo electrónico" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                  required
                />
                <Mail size={14} color="hsl(var(--muted))" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                  required
                />
                <Lock size={14} color="hsl(var(--muted))" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {loading ? (
                  <Loader2 size={16} className="spin" />
                ) : isRegistering ? (
                  <>
                    <UserPlus size={16} /> Crear Cuenta
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Iniciar Sesión
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <hr style={{ flex: 1, border: 'none', borderBottom: '1px solid hsl(var(--border))', opacity: 0.3 }} />
                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>o bien</span>
                <hr style={{ flex: 1, border: 'none', borderBottom: '1px solid hsl(var(--border))', opacity: 0.3 }} />
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '0.85rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'hsl(var(--border))',
                  color: '#ffffff'
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </button>

              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--primary))',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  textAlign: 'center',
                  marginTop: '4px'
                }}
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </button>
            </form>
          )}
        </div>
      )}
      
      {/* Styles for spinners */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
