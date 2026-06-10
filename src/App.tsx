import { 
  TrendingUp, 
  Dumbbell, 
  HeartPulse, 
  Zap,
  User,
  Flame
} from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import WorkoutTab from './components/WorkoutTab';
import RehabTab from './components/RehabTab';
import CardioTab from './components/CardioTab';
import ProfileTab from './components/ProfileTab';
import SyncPanel from './components/SyncPanel';
import { uploadUserData } from './utils/firebaseSync';
import { auth } from './utils/firebase';

import { useState } from 'react';
import { TRANSLATIONS } from './utils/translations';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'rehab' | 'cardio' | 'profile'>('dashboard');
  const [language, setLanguage] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('plnexc_language');
    return (saved === 'es' || saved === 'en') ? saved : 'es';
  });

  const t = TRANSLATIONS[language];

  const handleToggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('plnexc_language', newLang);
    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { language: newLang }).catch(err => {
        console.error('Error auto-syncing language:', err);
      });
    }
  };
  
  // 1. Manage state of historical workouts
  const [localHistory, setLocalHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('milo_user_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.sort((a: any, b: any) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
        return parsed;
      } catch (e) {
        console.error('Failed to parse local user sessions:', e);
      }
    }
    return [];
  });

  // 2. Manage active rehabilitation protocols (Milo)
  const [activeInjury, setActiveInjury] = useState<{
    joint: string;
    phase: number;
    weakness: string;
    painScale: number;
  } | null>(() => {
    const saved = localStorage.getItem('milo_active_injury');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse active injury:', e);
      }
    }
    return null;
  });

  // 3. Manage custom routines created by the user
  const [customRoutines, setCustomRoutines] = useState<any[]>(() => {
    const saved = localStorage.getItem('plnexc_custom_routines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom routines:', e);
      }
    }
    return [];
  });

  // 4. Anthropometric Profile parameters
  const [bodyWeight, setBodyWeight] = useState<number>(() => {
    const saved = localStorage.getItem('plnexc_body_weight');
    return saved ? parseFloat(saved) : 75;
  });
  const [height, setHeight] = useState<number>(() => {
    const saved = localStorage.getItem('plnexc_height');
    return saved ? parseFloat(saved) : 175;
  });
  const [gender, setGender] = useState<'Masculino' | 'Femenino'>(() => {
    const saved = localStorage.getItem('plnexc_gender');
    return (saved === 'Masculino' || saved === 'Femenino') ? saved : 'Masculino';
  });
  const [bodyFat, setBodyFat] = useState<number>(() => {
    const saved = localStorage.getItem('plnexc_body_fat');
    return saved ? parseFloat(saved) : 15;
  });
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>(() => {
    const saved = localStorage.getItem('plnexc_weight_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse weight history:', e);
      }
    }
    const currentW = localStorage.getItem('plnexc_body_weight') ? parseFloat(localStorage.getItem('plnexc_body_weight')!) : 75;
    const sampleHistory = [
      { date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 1.5 },
      { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 1.0 },
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 0.5 },
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 0.2 },
      { date: new Date().toISOString().split('T')[0], weight: currentW }
    ];
    localStorage.setItem('plnexc_weight_history', JSON.stringify(sampleHistory));
    return sampleHistory;
  });

  // 5. Manage deleted/hidden routines
  const [deletedRoutines, setDeletedRoutines] = useState<string[]>(() => {
    const saved = localStorage.getItem('plnexc_deleted_routines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse deleted routines:', e);
      }
    }
    return [];
  });

  // 6. Manage cardio goals and history
  const [cardioGoalType, setCardioGoalType] = useState<'daily' | 'weekly'>(() => {
    const saved = localStorage.getItem('plnexc_cardio_goal_type');
    return (saved === 'daily' || saved === 'weekly') ? saved : 'daily';
  });
  const [cardioTargetMinutes, setCardioTargetMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('plnexc_cardio_target_minutes');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [cardioHistory, setCardioHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('plnexc_cardio_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cardio history:', e);
      }
    }
    return [];
  });

  // 7. Manage profile picture and progress photos
  const [profilePicture, setProfilePicture] = useState<string>(() => {
    return localStorage.getItem('plnexc_profile_picture') || '';
  });
  const [progressPhotos, setProgressPhotos] = useState<any[]>(() => {
    const saved = localStorage.getItem('plnexc_progress_photos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse progress photos:', e);
      }
    }
    return [];
  });

  const handleSetCardioGoalType = (type: 'daily' | 'weekly', skipCloudUpload = false) => {
    setCardioGoalType(type);
    localStorage.setItem('plnexc_cardio_goal_type', type);
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { cardioGoalType: type }).catch(err => {
          console.error('Error auto-syncing cardio goal type:', err);
        });
      }
    }
  };

  const handleSetCardioTargetMinutes = (mins: number, skipCloudUpload = false) => {
    setCardioTargetMinutes(mins);
    localStorage.setItem('plnexc_cardio_target_minutes', mins.toString());
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { cardioTargetMinutes: mins }).catch(err => {
          console.error('Error auto-syncing cardio target minutes:', err);
        });
      }
    }
  };

  const handleAddCardioSession = (session: any, skipCloudUpload = false) => {
    setCardioHistory(prev => {
      const newHistory = [session, ...prev];
      localStorage.setItem('plnexc_cardio_history', JSON.stringify(newHistory));
      if (!skipCloudUpload) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          uploadUserData(currentUser.uid, { cardioHistory: newHistory }).catch(err => {
            console.error('Error auto-syncing cardio history:', err);
          });
        }
      }
      return newHistory;
    });
  };

  const handleDeleteCardioSession = (dateStr: string, skipCloudUpload = false) => {
    setCardioHistory(prev => {
      const newHistory = prev.filter(s => s.date !== dateStr);
      localStorage.setItem('plnexc_cardio_history', JSON.stringify(newHistory));
      if (!skipCloudUpload) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          uploadUserData(currentUser.uid, { cardioHistory: newHistory }).catch(err => {
            console.error('Error auto-syncing cardio history delete:', err);
          });
        }
      }
      return newHistory;
    });
  };

  const handleSetBodyWeight = (weight: number, skipCloudUpload = false) => {
    setBodyWeight(weight);
    localStorage.setItem('plnexc_body_weight', weight.toString());
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { bodyWeight: weight }).catch(err => {
          console.error('Error auto-syncing weight:', err);
        });
      }
    }
  };

  const handleSetHeight = (h: number, skipCloudUpload = false) => {
    setHeight(h);
    localStorage.setItem('plnexc_height', h.toString());
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { height: h }).catch(err => {
          console.error('Error auto-syncing height:', err);
        });
      }
    }
  };

  const handleSetGender = (g: 'Masculino' | 'Femenino', skipCloudUpload = false) => {
    setGender(g);
    localStorage.setItem('plnexc_gender', g);
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { gender: g }).catch(err => {
          console.error('Error auto-syncing gender:', err);
        });
      }
    }
  };

  const handleSetBodyFat = (fat: number, skipCloudUpload = false) => {
    setBodyFat(fat);
    localStorage.setItem('plnexc_body_fat', fat.toString());
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { bodyFat: fat }).catch(err => {
          console.error('Error auto-syncing bodyFat:', err);
        });
      }
    }
  };

  const handleAddWeightRecord = (weight: number, dateStr?: string) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    setWeightHistory(prev => {
      const newHistory = [...prev];
      const index = newHistory.findIndex(r => r.date.split('T')[0] === targetDate.split('T')[0]);
      if (index !== -1) {
        newHistory[index].weight = weight;
      } else {
        newHistory.push({ date: targetDate, weight });
      }
      newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('plnexc_weight_history', JSON.stringify(newHistory));
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { weightHistory: newHistory }).catch(err => {
          console.error('Error auto-syncing weight history:', err);
        });
      }
      return newHistory;
    });
  };

  const handleDeleteWeightRecord = (dateStr: string) => {
    setWeightHistory(prev => {
      const newHistory = prev.filter(r => r.date !== dateStr);
      localStorage.setItem('plnexc_weight_history', JSON.stringify(newHistory));
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { weightHistory: newHistory }).catch(err => {
          console.error('Error auto-syncing weight history delete:', err);
        });
      }
      return newHistory;
    });
  };



  // Save active injury to localStorage and sync
  const handleSetInjury = (injury: any) => {
    setActiveInjury(injury);
    if (injury) {
      localStorage.setItem('milo_active_injury', JSON.stringify(injury));
    } else {
      localStorage.removeItem('milo_active_injury');
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { activeInjury: injury }).catch(err => {
        console.error('Error auto-syncing injury state:', err);
      });
    }
  };

  // Add new workout session to history and sync
  const handleSaveWorkout = (newSession: any) => {
    const savedUserSessions = localStorage.getItem('milo_user_sessions');
    const parsedUserSessions = savedUserSessions ? JSON.parse(savedUserSessions) : [];
    
    const updatedUserSessions = [newSession, ...parsedUserSessions];
    localStorage.setItem('milo_user_sessions', JSON.stringify(updatedUserSessions));

    // Update state to include this workout immediately
    const fullMergedHistory = [newSession, ...localHistory];
    fullMergedHistory.sort((a, b) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
    setLocalHistory(fullMergedHistory);
    
    // Auto toggle to dashboard to see progression charts updated
    setActiveTab('dashboard');

    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { userSessions: updatedUserSessions }).catch(err => {
        console.error('Error auto-syncing workout session:', err);
      });
    }
  };

  const handleDeleteWorkout = (parsedDate: string) => {
    const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este entrenamiento de tu historial?");
    if (!confirmDelete) return;

    const savedUserSessions = localStorage.getItem('milo_user_sessions');
    const parsedUserSessions = savedUserSessions ? JSON.parse(savedUserSessions) : [];
    
    const updatedUserSessions = parsedUserSessions.filter((session: any) => session.parsedDate !== parsedDate);
    localStorage.setItem('milo_user_sessions', JSON.stringify(updatedUserSessions));

    setLocalHistory(updatedUserSessions);

    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { userSessions: updatedUserSessions }).catch(err => {
        console.error('Error auto-syncing workout deletion:', err);
      });
    }
  };

  const handleSaveProfilePicture = (pic: string) => {
    setProfilePicture(pic);
    localStorage.setItem('plnexc_profile_picture', pic);
    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { profilePicture: pic }).catch(err => {
        console.error('Error auto-syncing profile picture:', err);
      });
    }
  };

  const handleAddProgressPhoto = (photo: { id: string; date: string; weight?: number; photoUrl: string; note?: string }) => {
    setProgressPhotos(prev => {
      const newPhotos = [photo, ...prev];
      localStorage.setItem('plnexc_progress_photos', JSON.stringify(newPhotos));
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { progressPhotos: newPhotos }).catch(err => {
          console.error('Error auto-syncing progress photos:', err);
        });
      }
      return newPhotos;
    });
  };

  const handleDeleteProgressPhoto = (id: string) => {
    setProgressPhotos(prev => {
      const newPhotos = prev.filter(p => p.id !== id);
      localStorage.setItem('plnexc_progress_photos', JSON.stringify(newPhotos));
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { progressPhotos: newPhotos }).catch(err => {
          console.error('Error auto-syncing progress photo deletion:', err);
        });
      }
      return newPhotos;
    });
  };


  // Save new custom routine (or update existing)
  const handleSaveCustomRoutine = (name: string, exercises: string[], originalName?: string) => {
    let updated;
    if (originalName) {
      updated = customRoutines.map(r => r.title === originalName ? { title: name, exercises } : r);
    } else {
      const exists = customRoutines.some(r => r.title === name);
      if (exists) {
        updated = customRoutines.map(r => r.title === name ? { title: name, exercises } : r);
      } else {
        updated = [...customRoutines, { title: name, exercises }];
      }
    }
    setCustomRoutines(updated);
    localStorage.setItem('plnexc_custom_routines', JSON.stringify(updated));

    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { customRoutines: updated }).catch(err => {
        console.error('Error auto-syncing custom routine save:', err);
      });
    }
  };

  // Delete any routine (Preset, Custom or Historical)
  const handleDeleteRoutine = (name: string) => {
    // 1. If it's a custom routine, remove it from customRoutines state
    const updatedCustom = customRoutines.filter(r => r.title !== name);
    if (updatedCustom.length !== customRoutines.length) {
      setCustomRoutines(updatedCustom);
      localStorage.setItem('plnexc_custom_routines', JSON.stringify(updatedCustom));
    }

    // 2. Add to deletedRoutines list (exclusion list)
    setDeletedRoutines(prev => {
      if (prev.includes(name)) return prev;
      const updatedDeleted = [...prev, name];
      localStorage.setItem('plnexc_deleted_routines', JSON.stringify(updatedDeleted));

      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { 
          customRoutines: updatedCustom,
          deletedRoutines: updatedDeleted 
        }).catch(err => {
          console.error('Error auto-syncing routine delete:', err);
        });
      }
      return updatedDeleted;
    });
  };

  return (
    <div className="app-container">
      
      {/* Premium Header */}
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo">
          <Zap size={26} fill="hsl(var(--primary))" color="hsl(var(--primary))" />
          PLN<span>EXC</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Desktop Tab bar */}
          <nav className="nav-tabs desktop-nav">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <TrendingUp size={18} />
              {t.progreso}
            </button>
            
            <button 
              className={`nav-tab ${activeTab === 'workout' ? 'active' : ''}`}
              onClick={() => setActiveTab('workout')}
            >
              <Dumbbell size={18} />
              {t.entrenar}
            </button>

            <button 
              className={`nav-tab ${activeTab === 'cardio' ? 'active' : ''}`}
              onClick={() => setActiveTab('cardio')}
            >
              <Flame size={18} />
              {t.cardio}
            </button>
            
            <button 
              className={`nav-tab ${activeTab === 'rehab' ? 'active' : ''}`}
              onClick={() => setActiveTab('rehab')}
              style={{ 
                borderColor: activeInjury ? 'hsl(var(--warning))' : 'transparent',
                color: activeInjury ? 'hsl(var(--warning))' : undefined
              }}
            >
              <HeartPulse size={18} />
              {activeInjury ? (language === 'es' ? 'PLNEXC Rehab (Activo)' : 'PLNEXC Rehab (Active)') : (language === 'es' ? 'Rehab PLNEXC' : 'PLNEXC Rehab')}
            </button>

            <button 
              className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} />
              {t.perfil}
            </button>
          </nav>

          {/* Cloud Synchronization Panel */}
          <SyncPanel 
            customRoutines={customRoutines}
            setCustomRoutines={setCustomRoutines}
            setLocalHistory={setLocalHistory}
            activeInjury={activeInjury}
            setActiveInjury={handleSetInjury}
            bodyWeight={bodyWeight}
            setBodyWeight={handleSetBodyWeight}
            height={height}
            setHeight={handleSetHeight}
            gender={gender}
            setGender={handleSetGender}
            bodyFat={bodyFat}
            setBodyFat={handleSetBodyFat}
            weightHistory={weightHistory}
            setWeightHistory={setWeightHistory}
            deletedRoutines={deletedRoutines}
            setDeletedRoutines={setDeletedRoutines}
            cardioGoalType={cardioGoalType}
            setCardioGoalType={handleSetCardioGoalType}
            cardioTargetMinutes={cardioTargetMinutes}
            setCardioTargetMinutes={handleSetCardioTargetMinutes}
            cardioHistory={cardioHistory}
            setCardioHistory={setCardioHistory}
            profilePicture={profilePicture}
            setProfilePicture={setProfilePicture}
            progressPhotos={progressPhotos}
            setProgressPhotos={setProgressPhotos}
            language={language}
            setLanguage={setLanguage}
          />
        </div>
      </header>

      {/* Main Tab Render Slots */}
      <main style={{ minHeight: 'calc(100vh - 180px)' }}>
        {activeTab === 'dashboard' && (
          <div className="tab-transition">
            <DashboardTab 
              localHistory={localHistory}
              activeInjury={activeInjury}
              weightHistory={weightHistory}
              cardioHistory={cardioHistory}
              profilePicture={profilePicture}
              progressPhotos={progressPhotos}
              onAddProgressPhoto={handleAddProgressPhoto}
              onDeleteProgressPhoto={handleDeleteProgressPhoto}
              bodyWeight={bodyWeight}
              language={language}
            />
          </div>
        )}
        
        {activeTab === 'workout' && (
          <div className="tab-transition">
            <WorkoutTab 
              activeInjury={activeInjury} 
              onSaveWorkout={handleSaveWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              localHistory={localHistory}
              customRoutines={customRoutines}
              onSaveCustomRoutine={handleSaveCustomRoutine}
              onDeleteRoutine={handleDeleteRoutine}
              deletedRoutines={deletedRoutines}
              bodyWeight={bodyWeight}
              height={height}
              gender={gender}
              bodyFat={bodyFat}
              language={language}
            />
          </div>
        )}
        
        {activeTab === 'rehab' && (
          <div className="tab-transition">
            <RehabTab 
              activeInjury={activeInjury} 
              setActiveInjury={handleSetInjury} 
              language={language}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-transition">
            <ProfileTab 
              bodyWeight={bodyWeight}
              setBodyWeight={handleSetBodyWeight}
              height={height}
              setHeight={handleSetHeight}
              gender={gender}
              setGender={handleSetGender}
              bodyFat={bodyFat}
              setBodyFat={handleSetBodyFat}
              weightHistory={weightHistory}
              onAddWeightRecord={handleAddWeightRecord}
              onDeleteWeightRecord={handleDeleteWeightRecord}
              profilePicture={profilePicture}
              onSaveProfilePicture={handleSaveProfilePicture}
              progressPhotos={progressPhotos}
              onAddProgressPhoto={handleAddProgressPhoto}
              onDeleteProgressPhoto={handleDeleteProgressPhoto}
              localHistory={localHistory}
              cardioHistory={cardioHistory}
              language={language}
              onToggleLanguage={handleToggleLanguage}
            />
          </div>
        )}

        {activeTab === 'cardio' && (
          <div className="tab-transition">
            <CardioTab 
              cardioGoalType={cardioGoalType}
              setCardioGoalType={handleSetCardioGoalType}
              cardioTargetMinutes={cardioTargetMinutes}
              setCardioTargetMinutes={handleSetCardioTargetMinutes}
              cardioHistory={cardioHistory}
              onAddCardioSession={handleAddCardioSession}
              onDeleteCardioSession={handleDeleteCardioSession}
              bodyWeight={bodyWeight}
              bodyFat={bodyFat}
              language={language}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Tabbar Navigation */}
      <nav className="mobile-nav">
        <button 
          className={`mobile-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <TrendingUp size={22} />
          <span>{t.progreso}</span>
        </button>
        
        <button 
          className={`mobile-tab ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => setActiveTab('workout')}
        >
          <Dumbbell size={22} />
          <span>{t.entrenar}</span>
        </button>

        <button 
          className={`mobile-tab ${activeTab === 'cardio' ? 'active' : ''}`}
          onClick={() => setActiveTab('cardio')}
        >
          <Flame size={22} />
          <span>{t.cardio}</span>
        </button>
        
        <button 
          className={`mobile-tab ${activeTab === 'rehab' ? 'active' : ''}`}
          onClick={() => setActiveTab('rehab')}
          style={{ 
            color: activeInjury && activeTab !== 'rehab' ? 'hsl(var(--warning))' : undefined 
          }}
        >
          <HeartPulse size={22} />
          <span>{activeInjury ? 'PLNEXC Rehab' : t.rehab}</span>
        </button>

        <button 
          className={`mobile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={22} />
          <span>{t.perfil}</span>
        </button>
      </nav>

    </div>
  );
}
