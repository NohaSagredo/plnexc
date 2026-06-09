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

import { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'rehab' | 'cardio' | 'profile'>('dashboard');
  
  // 1. Manage state of historical workouts
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // 2. Manage active rehabilitation protocols (Milo)
  const [activeInjury, setActiveInjury] = useState<{
    joint: string;
    phase: number;
    weakness: string;
    painScale: number;
  } | null>(null);

  // 3. Manage custom routines created by the user
  const [customRoutines, setCustomRoutines] = useState<any[]>([]);

  // 4. Anthropometric Profile parameters
  const [bodyWeight, setBodyWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);
  const [gender, setGender] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [bodyFat, setBodyFat] = useState<number>(15);
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([]);

  // 5. Manage deleted/hidden routines
  const [deletedRoutines, setDeletedRoutines] = useState<string[]>([]);

  // 6. Manage cardio goals and history
  const [cardioGoalType, setCardioGoalType] = useState<'daily' | 'weekly'>('daily');
  const [cardioTargetMinutes, setCardioTargetMinutes] = useState<number>(150);
  const [cardioHistory, setCardioHistory] = useState<any[]>([]);

  // 7. Manage profile picture and progress photos
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [progressPhotos, setProgressPhotos] = useState<any[]>([]);

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

  // Load and merge history and custom routines on mount
  useEffect(() => {
    // Check if custom user sessions exist in localStorage
    const savedUserSessions = localStorage.getItem('milo_user_sessions');
    const parsedUserSessions = savedUserSessions ? JSON.parse(savedUserSessions) : [];

    // Sort chronologically descending
    parsedUserSessions.sort((a: any, b: any) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
    
    setLocalHistory(parsedUserSessions);

    // Load active injury state
    const savedInjury = localStorage.getItem('milo_active_injury');
    if (savedInjury) {
      setActiveInjury(JSON.parse(savedInjury));
    }

    // Load custom routines state
    const savedCustomRoutines = localStorage.getItem('plnexc_custom_routines');
    if (savedCustomRoutines) {
      setCustomRoutines(JSON.parse(savedCustomRoutines));
    }

    // Load deleted routines state
    const savedDeletedRoutines = localStorage.getItem('plnexc_deleted_routines');
    if (savedDeletedRoutines) {
      setDeletedRoutines(JSON.parse(savedDeletedRoutines));
    }

    // Load cardio goal type
    const savedCardioGoalType = localStorage.getItem('plnexc_cardio_goal_type');
    if (savedCardioGoalType === 'daily' || savedCardioGoalType === 'weekly') {
      setCardioGoalType(savedCardioGoalType);
    }

    // Load cardio target minutes
    const savedCardioTargetMinutes = localStorage.getItem('plnexc_cardio_target_minutes');
    if (savedCardioTargetMinutes) {
      setCardioTargetMinutes(parseInt(savedCardioTargetMinutes, 10));
    }

    // Load cardio history
    const savedCardioHistory = localStorage.getItem('plnexc_cardio_history');
    if (savedCardioHistory) {
      setCardioHistory(JSON.parse(savedCardioHistory));
    }

    // Load bodyWeight state
    const savedWeight = localStorage.getItem('plnexc_body_weight');
    const currentW = savedWeight ? parseFloat(savedWeight) : 75;
    if (savedWeight) {
      setBodyWeight(currentW);
    }
    
    // Load height state
    const savedHeight = localStorage.getItem('plnexc_height');
    if (savedHeight) {
      setHeight(parseFloat(savedHeight));
    }

    // Load gender state
    const savedGender = localStorage.getItem('plnexc_gender');
    if (savedGender === 'Masculino' || savedGender === 'Femenino') {
      setGender(savedGender);
    }

    // Load bodyFat state
    const savedFat = localStorage.getItem('plnexc_body_fat');
    if (savedFat) {
      setBodyFat(parseFloat(savedFat));
    }

    // Load weightHistory state
    const savedWeightHistory = localStorage.getItem('plnexc_weight_history');
    if (savedWeightHistory) {
      setWeightHistory(JSON.parse(savedWeightHistory));
    } else {
      const sampleHistory = [
        { date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 1.5 },
        { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 1.0 },
        { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 0.5 },
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: currentW + 0.2 },
        { date: new Date().toISOString().split('T')[0], weight: currentW }
      ];
      setWeightHistory(sampleHistory);
      localStorage.setItem('plnexc_weight_history', JSON.stringify(sampleHistory));
    }

    // Load profile picture
    const savedProfilePic = localStorage.getItem('plnexc_profile_picture');
    if (savedProfilePic) {
      setProfilePicture(savedProfilePic);
    }

    // Load progress photos
    const savedProgressPhotos = localStorage.getItem('plnexc_progress_photos');
    if (savedProgressPhotos) {
      setProgressPhotos(JSON.parse(savedProgressPhotos));
    }
  }, []);

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
              Progreso
            </button>
            
            <button 
              className={`nav-tab ${activeTab === 'workout' ? 'active' : ''}`}
              onClick={() => setActiveTab('workout')}
            >
              <Dumbbell size={18} />
              Entrenar
            </button>

            <button 
              className={`nav-tab ${activeTab === 'cardio' ? 'active' : ''}`}
              onClick={() => setActiveTab('cardio')}
            >
              <Flame size={18} />
              Cardio
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
              {activeInjury ? 'PLNEXC Rehab (Activo)' : 'Rehab PLNEXC'}
            </button>

            <button 
              className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} />
              Perfil
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
            />
          </div>
        )}
        
        {activeTab === 'rehab' && (
          <div className="tab-transition">
            <RehabTab 
              activeInjury={activeInjury} 
              setActiveInjury={handleSetInjury} 
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
          <span>Progreso</span>
        </button>
        
        <button 
          className={`mobile-tab ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => setActiveTab('workout')}
        >
          <Dumbbell size={22} />
          <span>Entrenar</span>
        </button>

        <button 
          className={`mobile-tab ${activeTab === 'cardio' ? 'active' : ''}`}
          onClick={() => setActiveTab('cardio')}
        >
          <Flame size={22} />
          <span>Cardio</span>
        </button>
        
        <button 
          className={`mobile-tab ${activeTab === 'rehab' ? 'active' : ''}`}
          onClick={() => setActiveTab('rehab')}
          style={{ 
            color: activeInjury && activeTab !== 'rehab' ? 'hsl(var(--warning))' : undefined 
          }}
        >
          <HeartPulse size={22} />
          <span>{activeInjury ? 'PLNEXC Rehab' : 'Rehab'}</span>
        </button>

        <button 
          className={`mobile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={22} />
          <span>Perfil</span>
        </button>
      </nav>

    </div>
  );
}
