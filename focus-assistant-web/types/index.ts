// types/index.ts
export type ProductiveTime = 'morning' | 'afternoon' | 'evening' | 'night';

export interface UserSettings {
  dailyHours: number;
  productiveTime: ProductiveTime;
  pomodoroLength: number; // minutes
  breakLength: number; // minutes
  isOnboarded: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlockedAt?: string;
}

export interface UserStats {
  totalSessions: number;
  totalFocusTime: number; // minutes
  currentStreak: number;
  longestStreak: number;
  level: number;
  xp: number;
  achievements: Achievement[];
  lastActiveDate?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedPomodoros: number;
  completedPomodoros: number;
  day?: number;
}

export interface Task {
  id: string;
  title: string;
  deadline?: string;
  createdAt: string;
  subTasks: SubTask[];
  totalPomodoros: number;
  completedPomodoros: number;
}