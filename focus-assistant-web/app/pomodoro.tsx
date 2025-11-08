// app/pomodoro.tsx
import { useRouter } from "expo-router";
import { X, Pause, Play } from "lucide-react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFocus } from "@/contexts/FocusContext";

export default function PomodoroScreen() {
  const router = useRouter();
  const { activeTask, tasks, settings, completePomodoro, completeSubTask } = useFocus();
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroLength * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const task = tasks.find(t => t.id === activeTask?.taskId);
  const subTask = task?.subTasks.find(st => st.id === activeTask?.subTaskId);

  const handleComplete = useCallback(async () => {
    if (activeTask) {
      const newAchievements = await completePomodoro(activeTask.taskId, activeTask.subTaskId);
      if (subTask && subTask.completedPomodoros + 1 >= subTask.estimatedPomodoros) {
        await completeSubTask(activeTask.taskId, activeTask.subTaskId);
      }
      Alert.alert("🎉 Отлично!", `Сессия завершена!\nТеперь отдохни ${settings.breakLength} минут!`, [{ text: "Завершить", onPress: () => router.back() }]);
    }
  }, [activeTask, completePomodoro, completeSubTask, router, settings.breakLength, subTask]);

  const startPulse = useCallback(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, [pulseAnim]);

  useEffect(() => { setIsRunning(true); startPulse(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [startPulse]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => { if (prev <= 1) { handleComplete(); return 0; } return prev - 1; });
      }, 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, isPaused, handleComplete]);

  const handlePause = () => { setIsPaused(!isPaused); };

  if (!task || !subTask) {
    return (<SafeAreaView style={styles.container} edges={['top', 'bottom']}><View style={styles.errorContainer}><Text style={styles.errorText}>Задача не найдена</Text></View></SafeAreaView>);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((settings.pomodoroLength * 60 - timeLeft) / (settings.pomodoroLength * 60)) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}><X size={24} color={Colors.text} /></TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskLabel}>Фокус на задаче</Text>
          <Text style={styles.taskTitle}>{subTask.title}</Text>
          <Text style={styles.taskProject}>{task.title}</Text>
        </View>
        <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}</Text>
            <Text style={styles.timerLabel}>{isPaused ? "Пауза" : "Фокус-режим 🍅"}</Text>
          </View>
        </Animated.View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={styles.progressText}>{Math.round(progress)}% завершено</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.controlButton, styles.pauseButton]} onPress={handlePause}>
            {isPaused ? (<Play size={28} color={Colors.primary} />) : (<Pause size={28} color={Colors.primary} />)}
          </TouchableOpacity>
        </View>
        <View style={styles.motivationContainer}><Text style={styles.motivationText}>{isPaused ? "Готов продолжить? Ты справляешься! 💪" : "Сосредоточься. Уведомлю, когда время выйдет!"}</Text></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.background },
  header:{ paddingHorizontal:24, paddingTop:16, flexDirection:"row", justifyContent:"flex-end" },
  closeButton:{ width:40, height:40, borderRadius:20, backgroundColor: Colors.backgroundSecondary, alignItems:"center", justifyContent:"center" },
  content:{ flex:1, justifyContent:"space-around", paddingHorizontal:24 },
  errorContainer:{ flex:1, alignItems:"center", justifyContent:"center" },
  errorText:{ fontSize:17, color: Colors.textSecondary },
  taskInfo:{ alignItems:"center" },
  taskLabel:{ fontSize:15, color: Colors.textSecondary, marginBottom:8, textTransform:"uppercase" as const, letterSpacing:1 },
  taskTitle:{ fontSize:24, fontWeight:"700" as const, color: Colors.text, textAlign:"center", marginBottom:8 },
  taskProject:{ fontSize:17, color: Colors.textSecondary, textAlign:"center" },
  timerContainer:{ alignItems:"center", justifyContent:"center" },
  timerCircle:{ width:280, height:280, borderRadius:140, backgroundColor: Colors.card, borderWidth:12, borderColor: Colors.primary, alignItems:"center", justifyContent:"center", shadowColor: Colors.shadow, shadowOffset:{ width:0, height:8 }, shadowOpacity:0.1, shadowRadius:16, elevation:8 },
  timerText:{ fontSize:64, fontWeight:"700" as const, color: Colors.text, marginBottom:8 },
  timerLabel:{ fontSize:17, color: Colors.textSecondary, fontWeight:"600" as const },
  progressContainer:{ alignItems:"center" },
  progressBar:{ width:"100%", height:8, backgroundColor: Colors.backgroundSecondary, borderRadius:4, overflow:"hidden", marginBottom:8 },
  progressFill:{ height:"100%", backgroundColor: Colors.primary, borderRadius:4 },
  progressText:{ fontSize:14, color: Colors.textSecondary },
  controls:{ alignItems:"center" },
  controlButton:{ width:72, height:72, borderRadius:36, alignItems:"center", justifyContent:"center", shadowColor: Colors.shadow, shadowOffset:{ width:0, height:4 }, shadowOpacity:0.2, shadowRadius:8, elevation:4 },
  pauseButton:{ backgroundColor: Colors.card, borderWidth:2, borderColor: Colors.primary },
  motivationContainer:{ paddingHorizontal:32 },
  motivationText:{ fontSize:16, color: Colors.textSecondary, textAlign:"center", lineHeight:24 },
});