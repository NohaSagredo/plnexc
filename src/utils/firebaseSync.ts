import { 
  arrayUnion, 
  arrayRemove, 
  increment 
} from 'firebase/firestore';
import { FirestoreModel } from './FirestoreORM';

export interface WeightRecord {
  date: string;
  weight: number;
}

export interface FeedPost {
  id?: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userProfilePicture?: string;
  routineTitle: string;
  durationMinutes: number;
  totalVolumeKg: number;
  recordsBroken: string[];
  comment: string;
  photoUrl?: string;
  workoutData: any;
  likes: string[];
  commentsCount: number;
  createdAt: string;
}

export interface PostComment {
  id?: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userProfilePicture?: string;
  text: string;
  createdAt: string;
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
  language?: 'es' | 'en';
  progressionSystem?: 'double_progression' | 'linear_periodization' | 'dup';
  username?: string;
  displayName?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
  updatedAt: string;
}

/**
 * Downloads data for a given user from Firestore
 */
// Model instances representing DB Collections (ORM)
export const UserModel = new FirestoreModel<SyncedData>('users');
export const UsernameModel = new FirestoreModel<{ userId: string }>('usernames');
export const PublicWorkoutModel = new FirestoreModel<FeedPost>('public_workouts');
export const CommentModel = new FirestoreModel<PostComment>('public_workouts/:postId/comments');

/**
 * Downloads data for a given user from Firestore
 */
export async function downloadUserData(userId: string): Promise<SyncedData | null> {
  try {
    return await UserModel.findById(userId);
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
    const updatePayload: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await UserModel.set(userId, updatePayload, { merge: true });
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
  language: 'es' | 'en';
  progressionSystem: 'double_progression' | 'linear_periodization' | 'dup';
  username?: string;
  displayName?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
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
    language: 'es' | 'en';
    progressionSystem: 'double_progression' | 'linear_periodization' | 'dup';
    username: string;
    displayName: string;
    bio: string;
    followers: string[];
    following: string[];
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

  // 15. Merge Language
  let mergedLanguage = local.language;
  if (cloud.language !== undefined && cloud.language !== local.language) {
    mergedLanguage = cloud.language;
    hasChanges = true;
  } else if (cloud.language === undefined) {
    hasChanges = true;
  }

  // 16. Merge Progression System
  let mergedProgression = local.progressionSystem;
  if (cloud.progressionSystem !== undefined && cloud.progressionSystem !== local.progressionSystem) {
    mergedProgression = cloud.progressionSystem;
    hasChanges = true;
  } else if (cloud.progressionSystem === undefined) {
    hasChanges = true;
  }

  // 17. Merge Username
  let mergedUsername = local.username || '';
  if (cloud.username !== undefined && cloud.username !== local.username) {
    mergedUsername = cloud.username;
    hasChanges = true;
  }

  // 18. Merge Display Name
  let mergedDisplayName = local.displayName || '';
  if (cloud.displayName !== undefined && cloud.displayName !== local.displayName) {
    mergedDisplayName = cloud.displayName;
    hasChanges = true;
  }

  // 19. Merge Bio
  let mergedBio = local.bio || '';
  if (cloud.bio !== undefined && cloud.bio !== local.bio) {
    mergedBio = cloud.bio;
    hasChanges = true;
  }

  // 20. Merge Followers
  const mergedFollowers = Array.from(new Set([...(local.followers || []), ...(cloud.followers || [])]));
  if (mergedFollowers.length !== (local.followers || []).length || mergedFollowers.length !== (cloud.followers || []).length) {
    hasChanges = true;
  }

  // 21. Merge Following
  const mergedFollowing = Array.from(new Set([...(local.following || []), ...(cloud.following || [])]));
  if (mergedFollowing.length !== (local.following || []).length || mergedFollowing.length !== (cloud.following || []).length) {
    hasChanges = true;
  }

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
      progressPhotos: mergedProgressPhotos,
      language: mergedLanguage,
      progressionSystem: mergedProgression,
      username: mergedUsername,
      displayName: mergedDisplayName,
      bio: mergedBio,
      followers: mergedFollowers,
      following: mergedFollowing
    },
    hasChanges
  };
}

/**
 * Checks if username is already taken. Returns true if available.
 */
export async function isUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleaned || cleaned.length < 3) return false;
  
  const data = await UsernameModel.findById(cleaned);
  if (!data) {
    return true;
  }
  return data.userId === currentUserId;
}

/**
 * Verifies if user has a username, autogenerating one from email prefix if missing
 */
export async function checkAndGenerateUsername(userId: string, email: string): Promise<string> {
  const userData = await UserModel.findById(userId);
  if (userData && userData.username) {
    return userData.username;
  }

  let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!baseUsername) {
    baseUsername = 'atleta';
  }
  
  let username = baseUsername;
  let isAvailable = false;
  let attempts = 0;
  
  while (!isAvailable && attempts < 15) {
    if (attempts > 0) {
      username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
    }
    const usernameSnap = await UsernameModel.findById(username);
    if (!usernameSnap) {
      isAvailable = true;
    }
    attempts++;
  }
  
  // Reserve the username
  await UsernameModel.create({ userId }, username);
  
  // Save to user profile
  await UserModel.set(userId, { username, displayName: username }, { merge: true });
  return username;
}

/**
 * Updates user profile details, ensuring username uniqueness if changed
 */
export async function updateUserProfile(
  userId: string,
  data: { username?: string; displayName?: string; bio?: string; profilePicture?: string }
): Promise<void> {
  const currentProfile = await UserModel.findById(userId);
  const oldUsername = currentProfile?.username;
  
  const updatePayload: any = { ...data };

  if (data.username && data.username !== oldUsername) {
    const cleanedNew = data.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const available = await isUsernameAvailable(cleanedNew, userId);
    if (!available) {
      throw new Error('El nombre de usuario no está disponible');
    }
    
    // Register new username mapping
    await UsernameModel.create({ userId }, cleanedNew);
    
    // Delete old username mapping
    if (oldUsername) {
      await UsernameModel.delete(oldUsername.toLowerCase());
    }
    
    updatePayload.username = cleanedNew;
  }
  
  await UserModel.set(userId, updatePayload, { merge: true });
}

/**
 * Follow/unfollow another user
 */
export async function toggleFollowUser(
  currentUserId: string,
  targetUserId: string,
  isFollowing: boolean
): Promise<void> {
  if (isFollowing) {
    await UserModel.update(currentUserId, {
      following: arrayRemove(targetUserId)
    });
    await UserModel.update(targetUserId, {
      followers: arrayRemove(currentUserId)
    });
  } else {
    await UserModel.update(currentUserId, {
      following: arrayUnion(targetUserId)
    });
    await UserModel.update(targetUserId, {
      followers: arrayUnion(currentUserId)
    });
  }
}

/**
 * Publishes a completed workout to the public community feed
 */
export async function publishWorkoutToFeed(
  postPayload: Omit<FeedPost, 'id' | 'likes' | 'commentsCount' | 'createdAt'>
): Promise<string> {
  const newPostId = await PublicWorkoutModel.create({
    ...postPayload,
    likes: [],
    commentsCount: 0,
    createdAt: new Date().toISOString()
  });
  return newPostId;
}

/**
 * Toggles a like on a post, returning true if liked, false if unliked
 */
export async function toggleLikePost(postId: string, userId: string): Promise<boolean> {
  const postData = await PublicWorkoutModel.findById(postId);
  if (!postData) return false;
  
  const likes: string[] = postData.likes || [];
  const hasLiked = likes.includes(userId);
  
  if (hasLiked) {
    await PublicWorkoutModel.update(postId, {
      likes: arrayRemove(userId)
    });
    return false;
  } else {
    await PublicWorkoutModel.update(postId, {
      likes: arrayUnion(userId)
    });
    return true;
  }
}

/**
 * Adds a comment to a public workout post
 */
export async function addCommentToPost(
  postId: string,
  commentPayload: Omit<PostComment, 'id' | 'createdAt'>
): Promise<void> {
  await CommentModel.create({
    ...commentPayload,
    createdAt: new Date().toISOString()
  }, undefined, { postId });
  
  await PublicWorkoutModel.update(postId, {
    commentsCount: increment(1)
  });
}

/**
 * Fetches comments for a public workout post
 */
export async function getPostComments(postId: string): Promise<PostComment[]> {
  return await CommentModel.find({
    orderBy: [['createdAt', 'asc']]
  }, { postId });
}

/**
 * Retrieves public workouts feed: either global "Discover" or "Following"
 */
export async function getPublicWorkoutsFeed(followingUserIds?: string[]): Promise<FeedPost[]> {
  if (followingUserIds && followingUserIds.length > 0) {
    const limitedFollows = followingUserIds.slice(0, 30);
    return await PublicWorkoutModel.find({
      where: [['userId', 'in', limitedFollows]],
      orderBy: [['createdAt', 'desc']],
      limit: 50
    });
  } else if (followingUserIds) {
    return [];
  } else {
    return await PublicWorkoutModel.find({
      orderBy: [['createdAt', 'desc']],
      limit: 50
    });
  }
}

/**
 * Retrieves an athlete's public profile and public stats
 */
export async function getAthleteProfile(userId: string): Promise<any | null> {
  const data = await UserModel.findById(userId);
  if (data) {
    return {
      userId,
      username: data.username || '',
      displayName: data.displayName || '',
      profilePicture: data.profilePicture || '',
      bio: data.bio || '',
      followers: data.followers || [],
      following: data.following || [],
      userSessions: data.userSessions || []
    };
  }
  return null;
}
