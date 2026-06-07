import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface WeightRecord {
  date: string;
  weight: number;
}

export interface SyncedData {
  customRoutines: any[];
  userSessions: any[];
  activeInjury: any | null;
  bodyWeight?: number;
  height?: number;
  gender?: 'Masculino' | 'Femenino';
  bodyFat?: number;
  weightHistory?: WeightRecord[];
  deletedRoutines?: string[];
  cardioGoalType?: 'daily' | 'weekly';
  cardioTargetMinutes?: number;
  cardioHistory?: { date: string; minutes: number; type: string; calories: number }[];
  profilePicture?: string;
  progressPhotos?: { id: string; date: string; weight?: number; photoUrl: string; note?: string }[];
  updatedAt: string;
}

/**
 * Downloads data for a given user from Firestore
 */
export async function downloadUserData(userId: string): Promise<SyncedData | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as SyncedData;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching data from Firestore:', error);
    // Propagate error if Firestore is not initialized or database is not created
    throw error;
  }
}

/**
 * Uploads data for a given user to Firestore
 */
export async function uploadUserData(userId: string, data: Partial<SyncedData>): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    
    // Fetch existing first to merge fields we are not updating
    const existing = await downloadUserData(userId).catch(() => null);
    
    const mergedData: SyncedData = {
      customRoutines: data.customRoutines ?? existing?.customRoutines ?? [],
      userSessions: data.userSessions ?? existing?.userSessions ?? [],
      activeInjury: data.activeInjury !== undefined ? data.activeInjury : (existing?.activeInjury ?? null),
      bodyWeight: data.bodyWeight !== undefined ? data.bodyWeight : (existing?.bodyWeight ?? 75),
      height: data.height !== undefined ? data.height : (existing?.height ?? 175),
      gender: data.gender !== undefined ? data.gender : (existing?.gender ?? 'Masculino'),
      bodyFat: data.bodyFat !== undefined ? data.bodyFat : (existing?.bodyFat ?? 15),
      weightHistory: data.weightHistory ?? existing?.weightHistory ?? [],
      deletedRoutines: data.deletedRoutines ?? existing?.deletedRoutines ?? [],
      cardioGoalType: data.cardioGoalType ?? existing?.cardioGoalType ?? 'daily',
      cardioTargetMinutes: data.cardioTargetMinutes !== undefined ? data.cardioTargetMinutes : (existing?.cardioTargetMinutes ?? 150),
      cardioHistory: data.cardioHistory ?? existing?.cardioHistory ?? [],
      profilePicture: data.profilePicture !== undefined ? data.profilePicture : (existing?.profilePicture ?? ''),
      progressPhotos: data.progressPhotos ?? existing?.progressPhotos ?? [],
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, mergedData);
  } catch (error: any) {
    console.error('Error saving data to Firestore:', error);
    throw error;
  }
}

/**
 * Merges local and Firestore data using smart collision resolution:
 * - customRoutines: Merged by unique title, prioritizing Firestore in case of duplicates.
 * - userSessions: Merged by unique parsedDate (ISO timestamp).
 * - activeInjury: Prefers Firestore if non-null, otherwise local.
 */
export function mergeLocalAndCloudData(local: {
  customRoutines: any[];
  userSessions: any[];
  activeInjury: any | null;
  bodyWeight: number;
  height: number;
  gender: 'Masculino' | 'Femenino';
  bodyFat: number;
  weightHistory: WeightRecord[];
  deletedRoutines: string[];
  cardioGoalType: 'daily' | 'weekly';
  cardioTargetMinutes: number;
  cardioHistory: any[];
  profilePicture: string;
  progressPhotos: any[];
}, cloud: SyncedData): {
  merged: {
    customRoutines: any[];
    userSessions: any[];
    activeInjury: any | null;
    bodyWeight: number;
    height: number;
    gender: 'Masculino' | 'Femenino';
    bodyFat: number;
    weightHistory: WeightRecord[];
    deletedRoutines: string[];
    cardioGoalType: 'daily' | 'weekly';
    cardioTargetMinutes: number;
    cardioHistory: any[];
    profilePicture: string;
    progressPhotos: any[];
  };
  hasChanges: boolean;
} {
  let hasChanges = false;

  // 1. Merge Custom Routines by title
  const mergedRoutines = [...local.customRoutines];
  cloud.customRoutines.forEach((cloudRoutine) => {
    const localIdx = mergedRoutines.findIndex(r => r.title === cloudRoutine.title);
    if (localIdx === -1) {
      mergedRoutines.push(cloudRoutine);
      hasChanges = true;
    } else {
      // If exercises list differs, update to cloud version
      const localR = mergedRoutines[localIdx];
      const match = JSON.stringify(localR.exercises) === JSON.stringify(cloudRoutine.exercises);
      if (!match) {
        mergedRoutines[localIdx] = cloudRoutine;
        hasChanges = true;
      }
    }
  });
  // Check if there are local routines not in cloud
  local.customRoutines.forEach((localRoutine) => {
    const cloudExists = cloud.customRoutines.some(r => r.title === localRoutine.title);
    if (!cloudExists) {
      hasChanges = true; // Local has something cloud doesn't, so cloud will need an upload
    }
  });

  // 2. Merge User Sessions by parsedDate
  const mergedSessions = [...local.userSessions];
  cloud.userSessions.forEach((cloudSession) => {
    const exists = mergedSessions.some(s => s.parsedDate === cloudSession.parsedDate);
    if (!exists) {
      mergedSessions.push(cloudSession);
      hasChanges = true;
    }
  });
  local.userSessions.forEach((localSession) => {
    const exists = cloud.userSessions.some(s => s.parsedDate === localSession.parsedDate);
    if (!exists) {
      hasChanges = true; // Local session not in cloud, needs upload
    }
  });
  // Sort descending by date
  mergedSessions.sort((a, b) => new Date(b.parsedDate).getTime() - new Date(a.parsedDate).getTime());

  // 3. Merge Active Injury
  let mergedInjury = local.activeInjury;
  const injuryMatch = JSON.stringify(local.activeInjury) === JSON.stringify(cloud.activeInjury);
  if (!injuryMatch) {
    hasChanges = true;
    // Prefer cloud if it exists, otherwise keep local
    mergedInjury = cloud.activeInjury !== null ? cloud.activeInjury : local.activeInjury;
  }

  // 4. Merge Body Weight
  let mergedWeight = local.bodyWeight;
  if (cloud.bodyWeight !== undefined && cloud.bodyWeight !== local.bodyWeight) {
    mergedWeight = cloud.bodyWeight;
    hasChanges = true;
  } else if (cloud.bodyWeight === undefined) {
    hasChanges = true;
  }

  // 5. Merge Height
  let mergedHeight = local.height;
  if (cloud.height !== undefined && cloud.height !== local.height) {
    mergedHeight = cloud.height;
    hasChanges = true;
  } else if (cloud.height === undefined) {
    hasChanges = true;
  }

  // 6. Merge Gender
  let mergedGender = local.gender;
  if (cloud.gender !== undefined && cloud.gender !== local.gender) {
    mergedGender = cloud.gender;
    hasChanges = true;
  } else if (cloud.gender === undefined) {
    hasChanges = true;
  }

  // 7. Merge Body Fat
  let mergedFat = local.bodyFat;
  if (cloud.bodyFat !== undefined && cloud.bodyFat !== local.bodyFat) {
    mergedFat = cloud.bodyFat;
    hasChanges = true;
  } else if (cloud.bodyFat === undefined) {
    hasChanges = true;
  }

  // 8. Merge Weight History
  const mergedWeightHistory = [...local.weightHistory];
  const cloudWeightHistory = cloud.weightHistory ?? [];

  cloudWeightHistory.forEach((cloudRec) => {
    // Normalise dates (matching by date string YYYY-MM-DD)
    const cloudDateStr = new Date(cloudRec.date).toISOString().split('T')[0];
    const localIdx = mergedWeightHistory.findIndex(localRec => {
      const localDateStr = new Date(localRec.date).toISOString().split('T')[0];
      return localDateStr === cloudDateStr;
    });

    if (localIdx === -1) {
      mergedWeightHistory.push(cloudRec);
      hasChanges = true;
    } else {
      if (mergedWeightHistory[localIdx].weight !== cloudRec.weight) {
        mergedWeightHistory[localIdx] = cloudRec;
        hasChanges = true;
      }
    }
  });

  local.weightHistory.forEach((localRec) => {
    const localDateStr = new Date(localRec.date).toISOString().split('T')[0];
    const cloudExists = cloudWeightHistory.some(cloudRec => {
      const cloudDateStr = new Date(cloudRec.date).toISOString().split('T')[0];
      return cloudDateStr === localDateStr;
    });
    if (!cloudExists) {
      hasChanges = true;
    }
  });

  // Sort weight history chronologically (oldest to newest)
  mergedWeightHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 9. Merge Deleted Routines
  const localDeleted = local.deletedRoutines ?? [];
  const cloudDeleted = cloud.deletedRoutines ?? [];
  const mergedDeleted = Array.from(new Set([...localDeleted, ...cloudDeleted]));
  if (mergedDeleted.length !== localDeleted.length || mergedDeleted.length !== cloudDeleted.length) {
    hasChanges = true;
  }

  // 10. Merge Cardio Goal Type
  let mergedCardioGoalType = local.cardioGoalType;
  if (cloud.cardioGoalType !== undefined && cloud.cardioGoalType !== local.cardioGoalType) {
    mergedCardioGoalType = cloud.cardioGoalType;
    hasChanges = true;
  } else if (cloud.cardioGoalType === undefined) {
    hasChanges = true;
  }

  // 11. Merge Cardio Target Minutes
  let mergedCardioTargetMinutes = local.cardioTargetMinutes;
  if (cloud.cardioTargetMinutes !== undefined && cloud.cardioTargetMinutes !== local.cardioTargetMinutes) {
    mergedCardioTargetMinutes = cloud.cardioTargetMinutes;
    hasChanges = true;
  } else if (cloud.cardioTargetMinutes === undefined) {
    hasChanges = true;
  }

  // 12. Merge Cardio History
  const mergedCardioHistory = [...(local.cardioHistory || [])];
  const cloudCardioHistory = cloud.cardioHistory ?? [];
  cloudCardioHistory.forEach((cloudRec) => {
    const exists = mergedCardioHistory.some(localRec => localRec.date === cloudRec.date);
    if (!exists) {
      mergedCardioHistory.push(cloudRec);
      hasChanges = true;
    }
  });
  const localHistoryArr = local.cardioHistory || [];
  localHistoryArr.forEach((localRec) => {
    const exists = cloudCardioHistory.some(cloudRec => cloudRec.date === localRec.date);
    if (!exists) {
      hasChanges = true;
    }
  });
  mergedCardioHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 13. Merge Profile Picture
  let mergedProfilePic = local.profilePicture || '';
  if (cloud.profilePicture !== undefined && cloud.profilePicture !== local.profilePicture) {
    mergedProfilePic = cloud.profilePicture;
    hasChanges = true;
  }

  // 14. Merge Progress Photos
  const mergedProgressPhotos = [...(local.progressPhotos || [])];
  const cloudProgressPhotos = cloud.progressPhotos ?? [];
  cloudProgressPhotos.forEach((cloudPhoto) => {
    const exists = mergedProgressPhotos.some(localPhoto => localPhoto.id === cloudPhoto.id);
    if (!exists) {
      mergedProgressPhotos.push(cloudPhoto);
      hasChanges = true;
    }
  });
  const localPhotosArr = local.progressPhotos || [];
  localPhotosArr.forEach((localPhoto) => {
    const exists = cloudProgressPhotos.some(cloudPhoto => cloudPhoto.id === localPhoto.id);
    if (!exists) {
      hasChanges = true;
    }
  });
  mergedProgressPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    merged: {
      customRoutines: mergedRoutines,
      userSessions: mergedSessions,
      activeInjury: mergedInjury,
      bodyWeight: mergedWeight,
      height: mergedHeight,
      gender: mergedGender,
      bodyFat: mergedFat,
      weightHistory: mergedWeightHistory,
      deletedRoutines: mergedDeleted,
      cardioGoalType: mergedCardioGoalType,
      cardioTargetMinutes: mergedCardioTargetMinutes,
      cardioHistory: mergedCardioHistory,
      profilePicture: mergedProfilePic,
      progressPhotos: mergedProgressPhotos
    },
    hasChanges
  };
}
