// contexts/FocusContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Task, UserSettings, UserStats, SubTask, Achievement } from '@/types';
import { syncToServer } from '@/app/max-bridge';

const API_BASE = process.env.EXPO_PUBLIC_MAX_BACKEND || '';

const defaultSettings: UserSettings = {
  dailyHours: 4,
  productiveTime: 'morning',
  pomodoroLength: 25,
  breakLength: 5,
  isOnboarded: false,
};

const defaultStats: UserStats = {
  totalSessions: 0,
  totalFocusTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  level: 1,
  xp: 0,
  achievements: [],
};

const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_steps', title: 'Первые шаги', description: 'Завершите первую сессию', icon: '🎯', xp: 10 },
  { id: 'weekly_warrior', title: 'Ученик недели', description: 'Завершите 7 сессий', icon: '🎓', xp: 50 },
  { id: 'focus_master', title: 'Мастер фокуса', description: '10 дней подряд', icon: '🏆', xp: 100 },
  { id: 'century_club', title: 'Сотка', description: '100 завершенных сессий', icon: '💯', xp: 200 },
];

export const [FocusProvider, useFocus] = createContextHook(() => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<{ taskId: string; subTaskId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [settingsStr, statsStr, tasksStr] = await Promise.all([
        AsyncStorage.getItem('focus_settings'),
        AsyncStorage.getItem('focus_stats'),
        AsyncStorage.getItem('focus_tasks'),
      ]);
      if (settingsStr) setSettings(JSON.parse(settingsStr));
      if (statsStr) setStats(JSON.parse(statsStr));
      if (tasksStr) setTasks(JSON.parse(tasksStr));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      setSettings(newSettings);
      await AsyncStorage.setItem('focus_settings', JSON.stringify(newSettings));
      await syncToServer(API_BASE, { settings: newSettings });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  const saveStats = useCallback(async (newStats: UserStats) => {
    try {
      setStats(newStats);
      await AsyncStorage.setItem('focus_stats', JSON.stringify(newStats));
      await syncToServer(API_BASE, { stats: newStats });
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }, []);

  const saveTasks = useCallback(async (newTasks: Task[]) => {
    try {
      setTasks(newTasks);
      await AsyncStorage.setItem('focus_tasks', JSON.stringify(newTasks));
      await syncToServer(API_BASE, { tasks: newTasks });
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }, []);

  const completeOnboarding = useCallback(async (userSettings: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...userSettings, isOnboarded: true };
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  const addTask = useCallback(async (task: Task) => {
    const newTasks = [...tasks, task];
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const completeSubTask = useCallback(async (taskId: string, subTaskId: string) => {
    const newTasks = tasks.map(task => {
      if (task.id === taskId) {
        const newSubTasks = task.subTasks.map(st => st.id === subTaskId ? { ...st, completed: true } : st);
        const completedCount = newSubTasks.filter(st => st.completed).length;
        return { ...task, subTasks: newSubTasks, completedPomodoros: completedCount };
      }
      return task;
    });
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const completePomodoro = useCallback(async (taskId: string, subTaskId: string) => {
    const today = new Date().toDateString();
    const lastActiveDate = stats.lastActiveDate;
    const isConsecutiveDay = lastActiveDate &&
      new Date(lastActiveDate).toDateString() === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    const newStreak = lastActiveDate === today ? stats.currentStreak :
                      isConsecutiveDay ? stats.currentStreak + 1 : 1;

    const newTotalSessions = stats.totalSessions + 1;
    const newTotalFocusTime = stats.totalFocusTime + settings.pomodoroLength;
    const newXP = stats.xp + 10;
    const newLevel = Math.floor(newXP / 100) + 1;

    const newAchievements = [...stats.achievements];
    ACHIEVEMENTS_LIST.forEach(achievement => {
      const hasAchievement = newAchievements.some(a => a.id === achievement.id);
      if (!hasAchievement) {
        if (achievement.id === 'first_steps' && newTotalSessions >= 1) {
          newAchievements.push({ ...achievement, unlockedAt: new Date().toISOString() });
        } else if (achievement.id === 'weekly_warrior' && newTotalSessions >= 7) {
          newAchievements.push({ ...achievement, unlockedAt: new Date().toISOString() });
        } else if (achievement.id === 'focus_master' && newStreak >= 10) {
          newAchievements.push({ ...achievement, unlockedAt: new Date().toISOString() });
        } else if (achievement.id === 'century_club' && newTotalSessions >= 100) {
          newAchievements.push({ ...achievement, unlockedAt: new Date().toISOString() });
        }
      }
    });

    const newStats: UserStats = {
      ...stats,
      totalSessions: newTotalSessions,
      totalFocusTime: newTotalFocusTime,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      xp: newXP,
      level: newLevel,
      achievements: newAchievements,
      lastActiveDate: today,
    };

    await saveStats(newStats);

    const newTasks = tasks.map(task => {
      if (task.id === taskId) {
        const newSubTasks = task.subTasks.map(st =>
          st.id === subTaskId ? { ...st, completedPomodoros: st.completedPomodoros + 1 } : st
        );
        return { ...task, subTasks: newSubTasks, completedPomodoros: task.completedPomodoros + 1 };
      }
      return task;
    });
    await saveTasks(newTasks);

    return newAchievements.filter(a => !stats.achievements.some(sa => sa.id === a.id));
  }, [stats, tasks, settings, saveStats, saveTasks]);

  return useMemo(() => ({
    settings, stats, tasks, activeTask, isLoading,
    setActiveTask, saveSettings, completeOnboarding,
    addTask, updateTask, deleteTask, completeSubTask, completePomodoro,
  }), [settings, stats, tasks, activeTask, isLoading, saveSettings, completeOnboarding, addTask, updateTask, deleteTask, completeSubTask, completePomodoro]);
});