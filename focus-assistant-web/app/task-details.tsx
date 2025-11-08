// app/task-details.tsx
import { useRouter, useLocalSearchParams } from "expo-router";
import { Play, CheckCircle2, Circle, Trash2 } from "lucide-react-native";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFocus } from "@/contexts/FocusContext";

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, deleteTask, setActiveTask } = useFocus();
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return (<SafeAreaView style={styles.container} edges={['bottom']}><View style={styles.errorContainer}><Text style={styles.errorText}>Задача не найдена</Text></View></SafeAreaView>);
  }

  const progress = (task.completedPomodoros / task.totalPomodoros) * 100;
  const completedSubTasks = task.subTasks.filter(st => st.completed).length;

  const handleStartPomodoro = (subTaskId: string) => {
    setActiveTask({ taskId: task.id, subTaskId });
    router.push("/pomodoro" as any);
  };

  const handleDeleteTask = () => {
    Alert.alert("Удалить задачу?", "Вы уверены, что хотите удалить эту задачу?", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => { await deleteTask(task.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
          {task.deadline && (<Text style={styles.deadline}>📅 Дедлайн: {new Date(task.deadline).toLocaleDateString('ru-RU')}</Text>)}
        </View>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}><Text style={styles.progressTitle}>Прогресс выполнения</Text><Text style={styles.progressPercentage}>{Math.round(progress)}%</Text></View>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}><Text style={styles.progressStatValue}>{task.completedPomodoros}</Text><Text style={styles.progressStatLabel}>Завершено</Text></View>
            <View style={styles.progressStat}><Text style={styles.progressStatValue}>{task.totalPomodoros - task.completedPomodoros}</Text><Text style={styles.progressStatLabel}>Осталось</Text></View>
            <View style={styles.progressStat}><Text style={styles.progressStatValue}>{completedSubTasks}/{task.subTasks.length}</Text><Text style={styles.progressStatLabel}>Шаги</Text></View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>План действий</Text>
          <View style={styles.taskList}>
            {task.subTasks.map((subTask, index) => (
              <View key={subTask.id} style={[styles.taskItem, subTask.completed && styles.taskItemCompleted]}>
                <View style={styles.taskItemHeader}>
                  <View style={styles.taskItemLeft}>
                    {subTask.completed ? (<CheckCircle2 size={24} color={Colors.success} />) : (<Circle size={24} color={Colors.textTertiary} />)}
                    <View style={styles.taskItemContent}>
                      <Text style={[styles.taskItemTitle, subTask.completed && styles.taskItemTitleCompleted]}>{index + 1}. {subTask.title}</Text>
                      <Text style={styles.taskItemMeta}>🍅 {subTask.completedPomodoros}/{subTask.estimatedPomodoros} сессий</Text>
                    </View>
                  </View>
                  {!subTask.completed && (<TouchableOpacity style={styles.startButton} onPress={() => handleStartPomodoro(subTask.id)}><Play size={18} color="#FFFFFF" /></TouchableOpacity>)}
                </View>
                {subTask.completedPomodoros > 0 && (
                  <View style={styles.taskItemProgress}><View style={styles.taskItemProgressBar}><View style={[styles.taskItemProgressFill, { width: `${(subTask.completedPomodoros / subTask.estimatedPomodoros) * 100}%` }]} /></View></View>
                )}
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTask}><Trash2 size={18} color={Colors.error} /><Text style={styles.deleteButtonText}>Удалить задачу</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.background },
  scrollContent:{ paddingBottom:40 },
  errorContainer:{ flex:1, alignItems:"center", justifyContent:"center", padding:24 },
  errorText:{ fontSize:17, color: Colors.textSecondary },
  header:{ padding:24, paddingBottom:20 },
  title:{ fontSize:28, fontWeight:"700" as const, color: Colors.text, marginBottom:12 },
  deadline:{ fontSize:15, color: Colors.textSecondary },
  progressCard:{ marginHorizontal:24, backgroundColor: Colors.card, borderRadius:16, padding:20, marginBottom:24, borderWidth:1, borderColor: Colors.border },
  progressHeader:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  progressTitle:{ fontSize:17, fontWeight:"600" as const, color: Colors.text },
  progressPercentage:{ fontSize:24, fontWeight:"700" as const, color: Colors.primary },
  progressBar:{ height:12, backgroundColor: Colors.backgroundSecondary, borderRadius:6, overflow:"hidden", marginBottom:16 },
  progressFill:{ height:"100%", backgroundColor: Colors.primary, borderRadius:6 },
  progressStats:{ flexDirection:"row", justifyContent:"space-around" },
  progressStat:{ alignItems:"center" },
  progressStatValue:{ fontSize:20, fontWeight:"700" as const, color: Colors.text, marginBottom:4 },
  progressStatLabel:{ fontSize:13, color: Colors.textSecondary },
  section:{ paddingHorizontal:24, marginBottom:24 },
  sectionTitle:{ fontSize:22, fontWeight:"700" as const, color: Colors.text, marginBottom:16 },
  taskList:{ gap:12 },
  taskItem:{ backgroundColor: Colors.card, borderRadius:12, padding:16, borderWidth:1, borderColor: Colors.border },
  taskItemCompleted:{ opacity:0.6 },
  taskItemHeader:{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start" },
  taskItemLeft:{ flexDirection:"row", flex:1, gap:12 },
  taskItemContent:{ flex:1 },
  taskItemTitle:{ fontSize:16, color: Colors.text, marginBottom:6, lineHeight:22 },
  taskItemTitleCompleted:{ textDecorationLine:"line-through" as const, color: Colors.textSecondary },
  taskItemMeta:{ fontSize:13, color: Colors.textSecondary },
  startButton:{ width:36, height:36, borderRadius:18, backgroundColor: Colors.primary, alignItems:"center", justifyContent:"center" },
  taskItemProgress:{ marginTop:12 },
  taskItemProgressBar:{ height:4, backgroundColor: Colors.backgroundSecondary, borderRadius:2, overflow:"hidden" },
  taskItemProgressFill:{ height:"100%", backgroundColor: Colors.primary, borderRadius:2 },
  deleteButton:{ flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginHorizontal:24, paddingVertical:16, borderRadius:12, backgroundColor: `${"#E17055"}10`, borderWidth:1, borderColor: Colors.error },
  deleteButtonText:{ fontSize:16, fontWeight:"600" as const, color: Colors.error },
});