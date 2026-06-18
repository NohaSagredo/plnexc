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
  signInWithRedirect,
  getRedirectResult,
  signInWithPopup
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  downloadUserData, 
  uploadUserData, 
  mergeLocalAndCloudData,
  checkAndGenerateUsername
} from '../utils/firebaseSync';
import { TRANSLATIONS } from '../utils/translations';

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
  cardioGoalType: 'daily' | 'weekly';
  setCardioGoalType: (type: 'daily' | 'weekly') => void;
  cardioTargetMinutes: number;
  setCardioTargetMinutes: (mins: number) => void;
  cardioHistory: any[];
  setCardioHistory: (history: any[]) => void;
  profilePicture: string;
  setProfilePicture: (pic: string) => void;
  progressPhotos: any[];
  setProgressPhotos: (photos: any[]) => void;
  language: 'es' | 'en';
  setLanguage: (lang: 'es' | 'en') => void;
  progressionSystem: 'double_progression' | 'linear_periodization' | 'dup';
  setProgressionSystem: (system: 'double_progression' | 'linear_periodization' | 'dup', skipCloudUpload?: boolean) => void;
  username: string;
  setUsername: (username: string) => void;
  displayName: string;
  setDisplayName: (displayName: string) => void;
  bio: string;
  setBio: (bio: string) => void;
  followers: string[];
  setFollowers: (followers: string[]) => void;
  following: string[];
  setFollowing: (following: string[]) => void;
  onLogout?: () => void;
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
  setDeletedRoutines,
  cardioGoalType,
  setCardioGoalType,
  cardioTargetMinutes,
  setCardioTargetMinutes,
  cardioHistory,
  setCardioHistory,
  profilePicture,
  setProfilePicture,
  progressPhotos,
  setProgressPhotos,
  language,
  setLanguage,
  progressionSystem,
  setProgressionSystem,
  username,
  setUsername,
  displayName,
  setDisplayName,
  bio,
  setBio,
  followers,
  setFollowers,
  following,
  setFollowing,
  onLogout
}: SyncPanelProps) {
  const t = TRANSLATIONS[language];
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
    // Check if user is returning from Google Redirect
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('Google redirect sign-in successful');
        }
      })
      .catch((err: any) => {
        console.error('Error in Google redirect result:', err);
        let localizedError = `${t.syncErrorGoogleRedirect} ${err.code || err.message}`;
        if (err.code === 'auth/operation-not-allowed') {
          localizedError = t.syncErrorGoogleDisabled;
        }
        setError(localizedError);
      });

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
        deletedRoutines,
        cardioGoalType,
        cardioTargetMinutes,
        cardioHistory,
        profilePicture,
        progressPhotos,
        language,
        progressionSystem,
        username,
        displayName,
        bio,
        followers,
        following
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
          throw new Error(t.syncErrorDbNotEnabled);
        }
        throw err;
      }

      // Check and generate username if missing from cloud data
      let currentUsername = cloudData?.username;
      const currentUserObj = auth.currentUser;
      if (!currentUsername && currentUserObj?.email) {
        try {
          currentUsername = await checkAndGenerateUsername(userId, currentUserObj.email);
          cloudData = await downloadUserData(userId);
        } catch (usernameErr) {
          console.error('Error generating username:', usernameErr);
        }
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
        setCardioGoalType(merged.cardioGoalType);
        setCardioTargetMinutes(merged.cardioTargetMinutes);
        setCardioHistory(merged.cardioHistory);
        setProfilePicture(merged.profilePicture);
        setProgressPhotos(merged.progressPhotos);
        if (merged.language) {
          setLanguage(merged.language);
          localStorage.setItem('plnexc_language', merged.language);
        }
        if (merged.progressionSystem) {
          setProgressionSystem(merged.progressionSystem, true);
        }
        setUsername(merged.username);
        setDisplayName(merged.displayName);
        setBio(merged.bio);
        setFollowers(merged.followers);
        setFollowing(merged.following);
        
        // Update local user sessions in localStorage
        localStorage.setItem('milo_user_sessions', JSON.stringify(merged.userSessions));
        localStorage.setItem('plnexc_custom_routines', JSON.stringify(merged.customRoutines));
        localStorage.setItem('plnexc_body_weight', merged.bodyWeight.toString());
        localStorage.setItem('plnexc_height', merged.height.toString());
        localStorage.setItem('plnexc_gender', merged.gender);
        localStorage.setItem('plnexc_body_fat', merged.bodyFat.toString());
        localStorage.setItem('plnexc_weight_history', JSON.stringify(merged.weightHistory));
        localStorage.setItem('plnexc_deleted_routines', JSON.stringify(merged.deletedRoutines));
        localStorage.setItem('plnexc_cardio_goal_type', merged.cardioGoalType);
        localStorage.setItem('plnexc_cardio_target_minutes', merged.cardioTargetMinutes.toString());
        localStorage.setItem('plnexc_cardio_history', JSON.stringify(merged.cardioHistory));
        localStorage.setItem('plnexc_profile_picture', merged.profilePicture);
        localStorage.setItem('plnexc_progress_photos', JSON.stringify(merged.progressPhotos));
        localStorage.setItem('plnexc_username', merged.username);
        localStorage.setItem('plnexc_display_name', merged.displayName);
        localStorage.setItem('plnexc_bio', merged.bio);
        localStorage.setItem('plnexc_followers', JSON.stringify(merged.followers));
        localStorage.setItem('plnexc_following', JSON.stringify(merged.following));
        if (merged.progressionSystem) {
          localStorage.setItem('plnexc_progression_system', merged.progressionSystem);
        }
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
            deletedRoutines: merged.deletedRoutines,
            cardioGoalType: merged.cardioGoalType,
            cardioTargetMinutes: merged.cardioTargetMinutes,
            cardioHistory: merged.cardioHistory,
            profilePicture: merged.profilePicture,
            progressPhotos: merged.progressPhotos,
            language: merged.language,
            progressionSystem: merged.progressionSystem,
            username: merged.username,
            displayName: merged.displayName,
            bio: merged.bio,
            followers: merged.followers,
            following: merged.following
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
          deletedRoutines: localData.deletedRoutines,
          cardioGoalType: localData.cardioGoalType,
          cardioTargetMinutes: localData.cardioTargetMinutes,
          cardioHistory: localData.cardioHistory,
          profilePicture: localData.profilePicture,
          progressPhotos: localData.progressPhotos,
          language: localData.language,
          progressionSystem: localData.progressionSystem,
          username: localData.username,
          displayName: localData.displayName,
          bio: localData.bio,
          followers: localData.followers,
          following: localData.following
        });
      }

      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err: any) {
      console.error('Sync Error:', err);
      if (!dbNotEnabledError) {
        setError(err.message || t.syncErrorUnknown);
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
      setError(t.syncErrorFillFields);
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
      let localizedError = `${t.syncErrorAuth} ${err.code || err.message || t.syncErrorUnknown}`;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        localizedError = t.syncErrorIncorrectCreds;
      } else if (err.code === 'auth/email-already-in-use') {
        localizedError = t.syncErrorEmailInUse;
      } else if (err.code === 'auth/weak-password') {
        localizedError = t.syncErrorWeakPassword;
      } else if (err.code === 'auth/invalid-email') {
        localizedError = t.syncErrorInvalidEmail;
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = t.syncErrorEmailPasswordDisabled;
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
      
      // Flujo híbrido para compatibilidad completa en todos los dominios:
      // 1. En el dominio oficial de autenticación (firebaseapp.com), usamos la redirección nativa.
      // 2. En cualquier otro dominio (como web.app o localhost), usamos popup para evitar fallos de redirect_uri_mismatch y cookies de terceros.
      if (window.location.hostname === 'plnexc-coach.firebaseapp.com') {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        console.log('Google popup sign-in successful:', result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      let localizedError = `${t.syncErrorGoogleRedirect} ${err.code || err.message}`;
      if (err.code === 'auth/operation-not-allowed') {
        localizedError = t.syncErrorGoogleDisabled;
      }
      setError(localizedError);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      if (onLogout) {
        onLogout();
      }
    } catch (err: any) {
      setError(err.message || t.syncErrorLogout);
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
        title={t.syncTooltip}
      >
        {syncing ? (
          <Loader2 size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
        ) : user ? (
          <Cloud size={16} />
        ) : (
          <CloudOff size={16} />
        )}
        <span style={{ fontSize: '0.85rem' }}>
          {syncing ? t.syncingText : user ? t.syncActive : t.syncBtn}
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
              {t.syncTitle}
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted))', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ×
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))', lineHeight: 1.4 }}>
            {t.syncDescFull}
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
                <AlertTriangle size={14} /> {t.syncDbInactiveTitle}
              </div>
              <span>
                {t.syncDbInactiveDesc}
              </span>
              <a 
                href="https://console.firebase.google.com/project/plnexc-coach/firestore" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', fontWeight: 'bold', wordBreak: 'break-all' }}
              >
                console.firebase.google.com/project/plnexc-coach/firestore
              </a>
              <span>{t.syncDbInactiveLocalOnly}</span>
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
              <CheckCircle2 size={14} /> {t.syncSuccess}
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
                <span style={{ color: 'hsl(var(--muted))', display: 'block', fontSize: '0.7rem' }}>{t.syncLoggedInAs}</span>
                <strong style={{ wordBreak: 'break-all' }}>{user.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleManualSync}
                  disabled={syncing}
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <RefreshCw size={14} className={syncing ? 'spin' : ''} /> {t.syncBtn}
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleLogout}
                  disabled={loading}
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <LogOut size={14} /> {t.syncLogoutBtn}
                </button>
              </div>
            </div>
          ) : (
            /* Login/Register Form */
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  placeholder={t.syncEmailPlaceholder} 
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
                  placeholder={t.syncPasswordPlaceholder} 
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
                    <UserPlus size={16} /> {t.syncRegisterBtn}
                  </>
                ) : (
                  <>
                    <Lock size={16} /> {t.syncLoginSubmitBtn}
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <hr style={{ flex: 1, border: 'none', borderBottom: '1px solid hsl(var(--border))', opacity: 0.3 }} />
                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>{t.syncOrDivider}</span>
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
                {t.syncGoogleBtn}
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
                {isRegistering ? t.syncHasAccountLink : t.syncNoAccountLink}
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
