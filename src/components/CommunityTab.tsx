import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  Play, 
  Bookmark, 
  X, 
  Loader2, 
  Award, 
  Clock, 
  Dumbbell, 
  UserPlus, 
  UserMinus, 
  User as UserIcon,
  Zap
} from 'lucide-react';
import { 
  getPublicWorkoutsFeed, 
  toggleLikePost, 
  addCommentToPost, 
  getPostComments, 
  toggleFollowUser, 
  getAthleteProfile
} from '../utils/firebaseSync';
import type { FeedPost, PostComment } from '../utils/firebaseSync';
import { auth } from '../utils/firebase';

interface CommunityTabProps {
  customRoutines: any[];
  setCustomRoutines: (routines: any[]) => void;
  onStartTraining: (workoutData: any) => void;
  following: string[];
  setFollowing: (following: string[]) => void;
  language: 'es' | 'en';
}

export default function CommunityTab({
  customRoutines,
  setCustomRoutines,
  onStartTraining,
  following,
  setFollowing,
  language
}: CommunityTabProps) {
  const [feedMode, setFeedMode] = useState<'discover' | 'following'>('discover');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  
  // Comments management
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState('');

  // Athlete Public Profile Modal
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<any | null>(null);
  const [loadingAthlete, setLoadingAthlete] = useState(false);

  // Fetch Feed
  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const list = await getPublicWorkoutsFeed(
        feedMode === 'following' ? following : undefined
      );
      setPosts(list);
    } catch (err) {
      console.error('Error fetching public feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [feedMode, following.length]);

  // Handle Like
  const handleLike = async (postId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert(language === 'es' ? 'Inicia sesión para interactuar.' : 'Please login to interact.');
      return;
    }

    // Optimistic Update
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const hasLiked = post.likes.includes(currentUser.uid);
        const newLikes = hasLiked
          ? post.likes.filter(id => id !== currentUser.uid)
          : [...post.likes, currentUser.uid];
        return {
          ...post,
          likes: newLikes
        };
      }
      return post;
    }));

    try {
      await toggleLikePost(postId, currentUser.uid);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Toggle comments panel
  const handleToggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    
    setActiveCommentsPostId(postId);
    
    if (!comments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      try {
        const postComments = await getPostComments(postId);
        setComments(prev => ({ ...prev, [postId]: postComments }));
      } catch (err) {
        console.error('Error loading comments:', err);
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert(language === 'es' ? 'Inicia sesión para comentar.' : 'Please login to comment.');
      return;
    }
    if (!newCommentText.trim()) return;

    const text = newCommentText.trim();
    setNewCommentText('');

    const localUsername = localStorage.getItem('plnexc_username') || 'atleta';
    const localDisplayName = localStorage.getItem('plnexc_display_name') || localUsername;
    const localProfilePicture = localStorage.getItem('plnexc_profile_picture') || '';

    const tempComment: PostComment = {
      id: Date.now().toString(),
      userId: currentUser.uid,
      username: localUsername,
      userDisplayName: localDisplayName,
      userProfilePicture: localProfilePicture,
      text,
      createdAt: new Date().toISOString()
    };

    // Optimistic Update
    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), tempComment]
    }));
    
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));

    try {
      await addCommentToPost(postId, {
        userId: currentUser.uid,
        username: localUsername,
        userDisplayName: localDisplayName,
        userProfilePicture: localProfilePicture,
        text
      });
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Follow/Unfollow
  const handleToggleFollow = async (targetUserId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const isFollowing = following.includes(targetUserId);
    const updatedFollowing = isFollowing
      ? following.filter(id => id !== targetUserId)
      : [...following, targetUserId];

    setFollowing(updatedFollowing);

    try {
      await toggleFollowUser(currentUser.uid, targetUserId, isFollowing);
      // If modal is open, update follower count dynamically
      if (athleteProfile && athleteProfile.userId === targetUserId) {
        setAthleteProfile((prev: any) => {
          if (!prev) return null;
          const currentFollowers = prev.followers || [];
          return {
            ...prev,
            followers: isFollowing
              ? currentFollowers.filter((id: string) => id !== currentUser.uid)
              : [...currentFollowers, currentUser.uid]
          };
        });
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  // Open Athlete Profile Modal
  const handleOpenAthleteProfile = async (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setLoadingAthlete(true);
    setAthleteProfile(null);
    try {
      const profile = await getAthleteProfile(athleteId);
      setAthleteProfile(profile);
    } catch (err) {
      console.error('Error fetching athlete profile:', err);
    } finally {
      setLoadingAthlete(false);
    }
  };

  // Share Workout details
  const handleShareWorkout = async (post: FeedPost) => {
    const text = `¡Mira la rutina de @${post.username} en PLNEXC!
Rutina: ${post.routineTitle}
Volumen total: ${post.totalVolumeKg} kg | Duración: ${post.durationMinutes} min`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rutina de @${post.username} - PLNEXC`,
          text: text,
          url: window.location.origin
        });
      } catch (err) {
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(language === 'es' ? '¡Información de entrenamiento copiada al portapapeles!' : 'Workout info copied to clipboard!');
  };

  // Save routine to custom list
  const handleSaveRoutine = (post: FeedPost) => {
    const title = post.routineTitle || (language === 'es' ? 'Rutina de la Comunidad' : 'Community Routine');
    const exercisesList = post.workoutData.exercises.map((e: any) => e.title);
    
    const exists = customRoutines.some(cr => cr.title === title);
    if (exists) {
      alert(language === 'es' ? 'Esta rutina ya está guardada en tu perfil.' : 'This routine is already saved in your profile.');
      return;
    }
    
    setCustomRoutines([...customRoutines, { title, exercises: exercisesList }]);
    alert(language === 'es' ? '¡Rutina guardada en tu perfil con éxito!' : 'Routine successfully saved to your profile!');
  };

  // Calculate stats for athlete profile
  const athleteStats = useMemo(() => {
    if (!athleteProfile || !athleteProfile.userSessions) return { totalSessions: 0, totalVolume: 0 };
    const sessions = athleteProfile.userSessions || [];
    let totalVolume = 0;
    sessions.forEach((s: any) => {
      s.exercises?.forEach((ex: any) => {
        totalVolume += ex.totalVolume || 0;
      });
    });
    return {
      totalSessions: sessions.length,
      totalVolume
    };
  }, [athleteProfile]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* Sub-tabs switch */}
      <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', borderRadius: '12px' }}>
        <button
          onClick={() => setFeedMode('discover')}
          className={`btn ${feedMode === 'discover' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', border: 'none', background: feedMode === 'discover' ? undefined : 'transparent' }}
        >
          <Zap size={16} style={{ marginRight: '6px' }} />
          {language === 'es' ? 'Descubrir' : 'Discover'}
        </button>
        <button
          onClick={() => setFeedMode('following')}
          className={`btn ${feedMode === 'following' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px', fontSize: '0.9rem', border: 'none', background: feedMode === 'following' ? undefined : 'transparent' }}
        >
          <Users size={16} style={{ marginRight: '6px' }} />
          {language === 'es' ? 'Siguiendo' : 'Following'}
        </button>
      </div>

      {/* Feed list */}
      {loadingFeed ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
          <Loader2 className="spin" size={36} color="hsl(var(--primary))" />
          <span style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
            {language === 'es' ? 'Cargando feed de la comunidad...' : 'Loading community feed...'}
          </span>
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'hsl(var(--muted))' }}>
          <Users size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
            {feedMode === 'following' 
              ? (language === 'es' ? 'No sigues a nadie todavía' : 'You are not following anyone yet')
              : (language === 'es' ? 'No hay publicaciones públicas aún' : 'No public workouts posted yet')}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
            {feedMode === 'following'
              ? (language === 'es' ? '¡Explora la pestaña Descubrir para seguir a otros atletas!' : 'Explore the Discover feed to follow other athletes!')
              : (language === 'es' ? 'Sé el primero en compartir tu entrenamiento al completarlo.' : 'Be the first to share your workout upon completion.')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map((post) => {
            const currentUser = auth.currentUser;
            const isSelf = currentUser && post.userId === currentUser.uid;
            const isFollowingUser = following.includes(post.userId);
            const hasLiked = currentUser && post.likes.includes(currentUser.uid);

            return (
              <div key={post.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Header: Avatar, Name, Follow */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div 
                    onClick={() => handleOpenAthleteProfile(post.userId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {post.userProfilePicture ? (
                        <img src={post.userProfilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UserIcon size={20} color="hsl(var(--muted))" />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{post.userDisplayName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>@{post.username}</span>
                    </div>
                  </div>

                  {!isSelf && currentUser && (
                    <button
                      onClick={() => handleToggleFollow(post.userId)}
                      className={`btn ${isFollowingUser ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}
                    >
                      {isFollowingUser ? (
                        <>
                          <UserMinus size={12} />
                          {language === 'es' ? 'Dejar de seguir' : 'Unfollow'}
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} />
                          {language === 'es' ? 'Seguir' : 'Follow'}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Routine details */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--border-radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>
                      {post.routineTitle}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted))' }}>
                      {new Date(post.createdAt).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}>
                      <Clock size={14} color="hsl(var(--muted))" />
                      <span style={{ color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Duración:' : 'Duration:'}</span>
                      <strong style={{ color: '#fff' }}>{post.durationMinutes} min</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}>
                      <Dumbbell size={14} color="hsl(var(--muted))" />
                      <span style={{ color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Volumen:' : 'Volume:'}</span>
                      <strong style={{ color: '#fff' }}>{post.totalVolumeKg.toLocaleString()} kg</strong>
                    </div>
                  </div>

                  {/* PRs Broken List with diagonal Metallic Shimmer */}
                  {post.recordsBroken && post.recordsBroken.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '6px', padding: '10px', position: 'relative', overflow: 'hidden' }} className="shimmer-card">
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} /> {language === 'es' ? 'RÉCORDS PERSONALES SUPERADOS' : 'PERSONAL RECORDS BROKEN'}
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.775rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>
                        {post.recordsBroken.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Comment & Progress Photo */}
                {post.comment && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', textAlign: 'left', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid hsl(var(--primary))' }}>
                    "{post.comment}"
                  </p>
                )}

                {post.photoUrl && (
                  <div style={{ width: '100%', maxHeight: '360px', overflow: 'hidden', borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={post.photoUrl} alt="Progreso" style={{ width: '100%', height: 'auto', maxHeight: '360px', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Action Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid hsl(var(--border))', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Likes */}
                    <button
                      onClick={() => handleLike(post.id!)}
                      style={{ background: 'transparent', border: 'none', color: hasLiked ? 'hsl(var(--primary))' : 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px', fontSize: '0.85rem', transition: 'color 0.2s' }}
                    >
                      <Heart size={18} fill={hasLiked ? 'currentColor' : 'none'} />
                      <span>{post.likes.length}</span>
                    </button>

                    {/* Comments Toggle */}
                    <button
                      onClick={() => handleToggleComments(post.id!)}
                      style={{ background: 'transparent', border: 'none', color: activeCommentsPostId === post.id ? 'hsl(var(--primary))' : 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px', fontSize: '0.85rem' }}
                    >
                      <MessageCircle size={18} />
                      <span>{post.commentsCount}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Share */}
                    <button
                      onClick={() => handleShareWorkout(post)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={language === 'es' ? 'Compartir rutina' : 'Share routine'}
                    >
                      <Share2 size={14} />
                      {language === 'es' ? 'Compartir' : 'Share'}
                    </button>

                    {/* Save Routine */}
                    <button
                      onClick={() => handleSaveRoutine(post)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Bookmark size={14} />
                      {language === 'es' ? 'Guardar' : 'Save'}
                    </button>

                    {/* Startadapt Workout */}
                    <button
                      onClick={() => onStartTraining(post)}
                      className="btn btn-primary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Play size={12} fill="currentColor" />
                      {language === 'es' ? 'Entrenar' : 'Train'}
                    </button>
                  </div>
                </div>

                {/* Sliding comments panel */}
                {activeCommentsPostId === post.id && (
                  <div className="fade-in" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '10px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--muted))' }}>
                      {language === 'es' ? 'COMENTARIOS' : 'COMMENTS'}
                    </span>

                    {loadingComments[post.id!] ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                        <Loader2 className="spin" size={18} color="hsl(var(--primary))" />
                      </div>
                    ) : (comments[post.id!] || []).length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--muted))', fontStyle: 'italic' }}>
                        {language === 'es' ? 'No hay comentarios aún. ¡Escribe el primero!' : 'No comments yet. Write the first one!'}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {(comments[post.id!] || []).map((comm) => (
                          <div key={comm.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {comm.userProfilePicture ? (
                                <img src={comm.userProfilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <UserIcon size={14} color="hsl(var(--muted))" />
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px', flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{comm.userDisplayName}</span>
                                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted))' }}>
                                  {new Date(comm.createdAt).toLocaleDateString(language === 'es' ? 'es' : 'en', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.825rem', color: 'rgba(255,255,255,0.9)' }}>{comm.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment input */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder={language === 'es' ? 'Escribe un comentario...' : 'Write a comment...'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id!);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '20px',
                          color: '#fff',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post.id!)}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '20px' }}
                      >
                        {language === 'es' ? 'Enviar' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Athlete Profile Modal */}
      {selectedAthleteId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setSelectedAthleteId(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'hsl(var(--muted))',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {loadingAthlete ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Loader2 className="spin" size={30} color="hsl(var(--primary))" />
              </div>
            ) : athleteProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                
                {/* Avatar & Basic Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '2px solid hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {athleteProfile.profilePicture ? (
                      <img src={athleteProfile.profilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon size={36} color="hsl(var(--muted))" />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                      {athleteProfile.displayName}
                    </h3>
                    <span style={{ fontSize: '0.9rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>
                      @{athleteProfile.username}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {athleteProfile.bio && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--muted))', fontStyle: 'italic' }}>
                    "{athleteProfile.bio}"
                  </p>
                )}

                {/* Follow Stats */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.85rem', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', padding: '12px 0' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1rem', display: 'block' }}>{athleteProfile.followers?.length || 0}</strong>
                    <span style={{ color: 'hsl(var(--muted))' }}>{language === 'es' ? 'seguidores' : 'followers'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1rem', display: 'block' }}>{athleteProfile.following?.length || 0}</strong>
                    <span style={{ color: 'hsl(var(--muted))' }}>{language === 'es' ? 'seguidos' : 'following'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1rem', display: 'block' }}>{athleteStats.totalSessions}</strong>
                    <span style={{ color: 'hsl(var(--muted))' }}>{language === 'es' ? 'entrenamientos' : 'workouts'}</span>
                  </div>
                </div>

                {/* Historical stats */}
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 4px 0', color: 'hsl(var(--primary))' }}>
                    {language === 'es' ? 'ESTADÍSTICAS DE FUERZA' : 'STRENGTH STATISTICS'}
                  </h4>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(var(--muted))' }}>{language === 'es' ? 'Volumen levantado:' : 'Total volume lifted:'}</span>
                      <strong style={{ color: '#fff' }}>{athleteStats.totalVolume.toLocaleString()} kg</strong>
                    </div>
                  </div>
                </div>

                {/* Follow & Close Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  {auth.currentUser && athleteProfile.userId !== auth.currentUser.uid && (
                    <button
                      onClick={() => handleToggleFollow(athleteProfile.userId)}
                      className={`btn ${following.includes(athleteProfile.userId) ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ flex: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {following.includes(athleteProfile.userId) ? (
                        <>
                          <UserMinus size={14} />
                          {language === 'es' ? 'Dejar de seguir' : 'Unfollow'}
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} />
                          {language === 'es' ? 'Seguir' : 'Follow'}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAthleteId(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                  >
                    {language === 'es' ? 'Cerrar' : 'Close'}
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'hsl(var(--muted))' }}>
                {language === 'es' ? 'No se pudo cargar el perfil del atleta.' : 'Could not load athlete profile.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
