import {
  TrendingUp,
  Dumbbell,
  HeartPulse,
  Zap,
  User,
  Flame,
  Users
} from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import WorkoutTab from './components/WorkoutTab';
import RehabTab from './components/RehabTab';
import CardioTab from './components/CardioTab';
import ProfileTab from './components/ProfileTab';
import SyncPanel from './components/SyncPanel';
import CommunityTab from './components/CommunityTab';
import { uploadUserData } from './utils/firebaseSync';
import { auth } from './utils/firebase';

import { useState, useRef, useEffect } from 'react';
import { TRANSLATIONS } from './utils/translations';
import type { ProgressionSystem } from './utils/ProgressionEngine';
import type { Exercise } from './data/exercises_db';

const TABS_ORDER = ['dashboard', 'workout', 'cardio', 'rehab', 'profile', 'community'] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'rehab' | 'cardio' | 'profile' | 'community'>('dashboard');
  const [prevTab, setPrevTab] = useState<'dashboard' | 'workout' | 'rehab' | 'cardio' | 'profile' | 'community'>('dashboard');
  const scrollPositions = useRef<Record<string, number>>({});

  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll listener to hide/show mobile navigation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      // Only hide if we have scrolled past 150px from the top
      if (currentScrollY > 150) {
        // Only hide if scrolling down by more than a small delta (e.g., 10px)
        if (diff > 10) {
          setIsNavbarVisible(false);
        } else if (diff < -15) {
          // Show when scrolling up by more than 15px
          setIsNavbarVisible(true);
        }
      } else {
        // Always show near the top of the page
        setIsNavbarVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleTabChange = (newTab: 'dashboard' | 'workout' | 'rehab' | 'cardio' | 'profile' | 'community') => {
    scrollPositions.current[activeTab] = window.scrollY;
    setPrevTab(activeTab);
    setActiveTab(newTab);
    setIsNavbarVisible(true); // Force show navbar on tab change
    setTimeout(() => {
      window.scrollTo(0, scrollPositions.current[newTab] || 0);
    }, 0);
  };

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

  const [customExercises, setCustomExercises] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('plnexc_custom_exercises');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom exercises:', e);
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
    return [];
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

  // Social profile states
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('plnexc_username') || '';
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('plnexc_display_name') || '';
  });
  const [bio, setBio] = useState<string>(() => {
    return localStorage.getItem('plnexc_bio') || '';
  });
  const [followers, setFollowers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('plnexc_followers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [following, setFollowing] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('plnexc_following');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSetUsername = (val: string) => {
    setUsername(val);
    localStorage.setItem('plnexc_username', val);
  };
  const handleSetDisplayName = (val: string) => {
    setDisplayName(val);
    localStorage.setItem('plnexc_display_name', val);
  };
  const handleSetBio = (val: string) => {
    setBio(val);
    localStorage.setItem('plnexc_bio', val);
  };
  const handleSetFollowers = (val: string[]) => {
    setFollowers(val);
    localStorage.setItem('plnexc_followers', JSON.stringify(val));
  };
  const handleSetFollowing = (val: string[]) => {
    setFollowing(val);
    localStorage.setItem('plnexc_following', JSON.stringify(val));
  };

  const [pendingRoutineToStart, setPendingRoutineToStart] = useState<any | null>(null);

  const handleClearPendingRoutine = () => {
    setPendingRoutineToStart(null);
  };

  // 8. Progression System
  const [progressionSystem, setProgressionSystem] = useState<ProgressionSystem>(() => {
    const saved = localStorage.getItem('plnexc_progression_system');
    return (saved === 'double_progression' || saved === 'linear_periodization' || saved === 'dup')
      ? (saved as ProgressionSystem)
      : 'double_progression';
  });

  const handleSetProgressionSystem = (system: ProgressionSystem, skipCloudUpload = false) => {
    setProgressionSystem(system);
    localStorage.setItem('plnexc_progression_system', system);
    if (!skipCloudUpload) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { progressionSystem: system }).catch(err => {
          console.error('Error auto-syncing progression system:', err);
        });
      }
    }
  };

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

  const handleLogoutClear = () => {
    // Clear localStorage
    localStorage.removeItem('milo_user_sessions');
    localStorage.removeItem('milo_active_injury');
    localStorage.removeItem('plnexc_custom_routines');
    localStorage.setItem('plnexc_body_weight', '75');
    localStorage.setItem('plnexc_height', '175');
    localStorage.setItem('plnexc_gender', 'Masculino');
    localStorage.setItem('plnexc_body_fat', '15');
    localStorage.removeItem('plnexc_weight_history');
    localStorage.removeItem('plnexc_deleted_routines');
    localStorage.setItem('plnexc_cardio_goal_type', 'daily');
    localStorage.setItem('plnexc_cardio_target_minutes', '150');
    localStorage.removeItem('plnexc_cardio_history');
    localStorage.removeItem('plnexc_profile_picture');
    localStorage.removeItem('plnexc_progress_photos');
    localStorage.removeItem('plnexc_username');
    localStorage.removeItem('plnexc_display_name');
    localStorage.removeItem('plnexc_bio');
    localStorage.removeItem('plnexc_followers');
    localStorage.removeItem('plnexc_following');
    localStorage.removeItem('plnexc_custom_exercises');
    localStorage.setItem('plnexc_progression_system', 'double_progression');

    // Reset React state values to guest defaults
    setLocalHistory([]);
    setActiveInjury(null);
    setCustomRoutines([]);
    setCustomExercises([]);
    setBodyWeight(75);
    setHeight(175);
    setGender('Masculino');
    setBodyFat(15);
    setWeightHistory([]);
    setDeletedRoutines([]);
    setCardioGoalType('daily');
    setCardioTargetMinutes(150);
    setCardioHistory([]);
    setProfilePicture('');
    setProgressPhotos([]);
    setUsername('');
    setDisplayName('');
    setBio('');
    setFollowers([]);
    setFollowing([]);
    setProgressionSystem('double_progression');
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
    handleTabChange('dashboard');

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

  const handleUpdateWorkout = (updatedSession: any) => {
    const savedUserSessions = localStorage.getItem('milo_user_sessions');
    const parsedUserSessions = savedUserSessions ? JSON.parse(savedUserSessions) : [];

    const updatedUserSessions = parsedUserSessions.map((session: any) =>
      session.parsedDate === updatedSession.parsedDate ? updatedSession : session
    );
    localStorage.setItem('milo_user_sessions', JSON.stringify(updatedUserSessions));

    const fullMergedHistory = localHistory.map((session: any) =>
      session.parsedDate === updatedSession.parsedDate ? updatedSession : session
    );
    fullMergedHistory.sort((a: any, b: any) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());
    setLocalHistory(fullMergedHistory);

    const currentUser = auth.currentUser;
    if (currentUser) {
      uploadUserData(currentUser.uid, { userSessions: updatedUserSessions }).catch(err => {
        console.error('Error auto-syncing workout session update:', err);
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
  const handleSaveCustomRoutine = (name: string, exercises: (string | { title: string; restTime?: number })[], originalName?: string) => {
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

  const handleSaveCustomExercise = (exercise: Omit<Exercise, 'id'> & { id?: string }) => {
    setCustomExercises(prev => {
      let updated: Exercise[];
      if (exercise.id) {
        // Update existing
        updated = prev.map(ex => ex.id === exercise.id ? (exercise as Exercise) : ex);
      } else {
        // Create new
        const newId = `custom_${exercise.title.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now()}`;
        const newEx: Exercise = {
          ...exercise,
          id: newId
        };
        updated = [...prev, newEx];
      }
      localStorage.setItem('plnexc_custom_exercises', JSON.stringify(updated));
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { customExercises: updated }).catch(err => {
          console.error('Error auto-syncing custom exercises:', err);
        });
      }
      return updated;
    });
  };

  const handleDeleteCustomExercise = (id: string) => {
    setCustomExercises(prev => {
      const updated = prev.filter(ex => ex.id !== id);
      localStorage.setItem('plnexc_custom_exercises', JSON.stringify(updated));
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        uploadUserData(currentUser.uid, { customExercises: updated }).catch(err => {
          console.error('Error auto-syncing custom exercises deletion:', err);
        });
      }
      return updated;
    });
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

  const prevIndex = TABS_ORDER.indexOf(prevTab);
  const activeIndex = TABS_ORDER.indexOf(activeTab);
  const direction = activeIndex > prevIndex ? 'right' : activeIndex < prevIndex ? 'left' : 'none';

  return (
    <div className="app-container">
      {/* Floating Ambient Blobs */}
      <div className="ambient-blob blob-1" />
      <div className="ambient-blob blob-2" />
      <div className="ambient-blob blob-3" />

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
              onClick={() => handleTabChange('dashboard')}
            >
              <TrendingUp size={18} />
              {t.progreso}
            </button>

            <button
              className={`nav-tab ${activeTab === 'workout' ? 'active' : ''}`}
              onClick={() => handleTabChange('workout')}
            >
              <Dumbbell size={18} />
              {t.entrenar}
            </button>

            <button
              className={`nav-tab ${activeTab === 'cardio' ? 'active' : ''}`}
              onClick={() => handleTabChange('cardio')}
            >
              <Flame size={18} />
              {t.cardio}
            </button>

            <button
              className={`nav-tab ${activeTab === 'rehab' ? 'active' : ''}`}
              onClick={() => handleTabChange('rehab')}
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
              onClick={() => handleTabChange('profile')}
            >
              <User size={18} />
              {t.perfil}
            </button>

            <button
              className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => handleTabChange('community')}
            >
              <Users size={18} />
              {language === 'es' ? 'Comunidad' : 'Community'}
            </button>
          </nav>

          {/* Cloud Synchronization Panel */}
          <SyncPanel
            customRoutines={customRoutines}
            setCustomRoutines={setCustomRoutines}
            customExercises={customExercises}
            setCustomExercises={setCustomExercises}
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
            progressionSystem={progressionSystem}
            setProgressionSystem={handleSetProgressionSystem}
            username={username}
            setUsername={handleSetUsername}
            displayName={displayName}
            setDisplayName={handleSetDisplayName}
            bio={bio}
            setBio={handleSetBio}
            followers={followers}
            setFollowers={handleSetFollowers}
            following={following}
            setFollowing={handleSetFollowing}
            onLogout={handleLogoutClear}
          />
        </div>
      </header>

      {/* Main Tab Render Slots */}
      <main style={{ minHeight: 'calc(100vh - 180px)', position: 'relative' }}>
        <div
          className="tab-transition"
          style={activeTab === 'dashboard' ? { width: '100%' } : { display: 'none' }}
        >
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
            progressionSystem={progressionSystem}
            onTabChange={handleTabChange}
            customExercises={customExercises}
          />
        </div>

        <div
          className="tab-transition"
          style={activeTab === 'workout' ? { width: '100%' } : { display: 'none' }}
        >
          <WorkoutTab
            activeInjury={activeInjury}
            onSaveWorkout={handleSaveWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            onUpdateWorkout={handleUpdateWorkout}
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
            progressionSystem={progressionSystem}
            progressPhotos={progressPhotos}
            profilePicture={profilePicture}
            username={username}
            displayName={displayName}
            onAddProgressPhoto={handleAddProgressPhoto}
            pendingRoutineToStart={pendingRoutineToStart}
            onClearPendingRoutine={handleClearPendingRoutine}
            customExercises={customExercises}
            onSaveCustomExercise={handleSaveCustomExercise}
            onDeleteCustomExercise={handleDeleteCustomExercise}
          />
        </div>

        <div
          className="tab-transition"
          style={activeTab === 'rehab' ? { width: '100%' } : { display: 'none' }}
        >
          <RehabTab
            activeInjury={activeInjury}
            setActiveInjury={handleSetInjury}
            language={language}
          />
        </div>

        <div
          className="tab-transition"
          style={activeTab === 'profile' ? { width: '100%' } : { display: 'none' }}
        >
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
            progressionSystem={progressionSystem}
            onSetProgressionSystem={handleSetProgressionSystem}
            username={username}
            setUsername={handleSetUsername}
            displayName={displayName}
            setDisplayName={handleSetDisplayName}
            bio={bio}
            setBio={handleSetBio}
            followers={followers}
            following={following}
          />
        </div>

        <div
          className="tab-transition"
          style={activeTab === 'cardio' ? { width: '100%' } : { display: 'none' }}
        >
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

        <div
          className="tab-transition"
          style={activeTab === 'community' ? { width: '100%' } : { display: 'none' }}
        >
          <CommunityTab
            customRoutines={customRoutines}
            setCustomRoutines={setCustomRoutines}
            onStartTraining={(workoutData) => {
              const title = workoutData.routineTitle || 'Entrenamiento Copiado';
              const exists = customRoutines.some(cr => cr.title === title);
              const exercisesList = workoutData.workoutData.exercises.map((e: any) => {
                if (e.restTime !== undefined && e.restTime !== null && e.restTime > 0) {
                  return { title: e.title, restTime: e.restTime };
                }
                return e.title;
              });
              if (!exists) {
                handleSaveCustomRoutine(title, exercisesList);
              }
              setPendingRoutineToStart({
                title,
                exercises: exercisesList
              });
              handleTabChange('workout');
            }}
            following={following}
            setFollowing={handleSetFollowing}
            language={language}
          />
        </div>
      </main>

      {/* Mobile Bottom Tabbar Navigation */}
      <nav className={`mobile-nav ${!isNavbarVisible ? 'nav-hidden' : ''}`}>
        {/* Sliding liquid glass indicator wrapper */}
        <div
          className="mobile-nav-indicator-wrapper"
          style={{
            transform: `translateX(${activeTab === 'dashboard' ? 0 :
                activeTab === 'workout' ? 100 :
                  activeTab === 'cardio' ? 200 :
                    activeTab === 'rehab' ? 300 :
                      activeTab === 'profile' ? 400 : 500
              }%)`
          }}
        >
          <div className={`mobile-nav-indicator direction-${direction}`} key={activeTab} />
        </div>

        <button
          className={`mobile-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabChange('dashboard')}
        >
          <TrendingUp size={22} />
          <span>{t.progreso}</span>
        </button>

        <button
          className={`mobile-tab ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => handleTabChange('workout')}
        >
          <Dumbbell size={22} />
          <span>{t.entrenar}</span>
        </button>

        <button
          className={`mobile-tab ${activeTab === 'cardio' ? 'active' : ''}`}
          onClick={() => handleTabChange('cardio')}
        >
          <Flame size={22} />
          <span>{t.cardio}</span>
        </button>

        <button
          className={`mobile-tab ${activeTab === 'rehab' ? 'active' : ''}`}
          onClick={() => handleTabChange('rehab')}
          style={{
            color: activeInjury && activeTab !== 'rehab' ? 'hsl(var(--warning))' : undefined
          }}
        >
          <HeartPulse size={22} />
          <span>{activeInjury ? 'Rehab' : t.rehab}</span>
        </button>

        <button
          className={`mobile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <User size={22} />
          <span>{t.perfil}</span>
        </button>

        <button
          className={`mobile-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => handleTabChange('community')}
        >
          <Users size={22} />
          <span>{language === 'es' ? 'Comunidad' : 'Community'}</span>
        </button>
      </nav>

    </div>
  );
}
