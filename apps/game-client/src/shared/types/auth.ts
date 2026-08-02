export interface PlayerProfile {
  displayName: string;
  bio: string | null;
  level: number;
  xp: number;
  coins: number;
  rank: string;
  currentWorld: string;
  codingStreak: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  authProvider: string;
  role: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
  profile: PlayerProfile | null;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
