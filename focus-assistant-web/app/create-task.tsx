// app/create-task.tsx
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import Colors from "@/constants/colors";
import { useFocus } from "@/contexts/FocusContext";
import type { Task, SubTask } from "@/types";

// Stub for AI generate (since web-only): creates a basic plan locally
async function fakePlan(desc: string) {
  const steps = Math.min(8, Math.max(5, Math.ceil(desc.length / 25)));
  return Array.from({ length: steps }).map((_, i) => ({
    title: `Шаг ${i + 1}: ${desc.slice(0, 20)}…`,
    estimatedPomodoros: 1 + (i % 3),
  }));
}

export default function CreateTaskScreen() {
  const router = useRouter();
  const { addTask, settings } = useFocus();
  const [taskDescription, setTaskDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<SubTask[] | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!taskDescription.trim()) { setError("Пожалуйста, опишите задачу"); return; }
    setIsAnalyzing(true); setError("");
    try {
      const plan = await fakePlan(taskDescription);
      const subTasks: SubTask[] = plan.map((st, index) => ({
        id: `subtask-${Date.now()}-${index}`,
        title: st.title,
        completed: false,
        estimatedPomodoros: st.estimatedPomodoros,
        completedPomodoros: 0,
      }));
      setGeneratedPlan(subTasks);
    } catch (err) {
      setError("Не удалось проанализировать задачу. Попробуйте еще раз.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPlan) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: taskDescription,
      deadline: deadline || undefined,
      subTasks: generatedPlan,
      createdAt: new Date().toISOString(),
      totalPomodoros: generatedPlan.reduce((sum, st) => sum + st.estimatedPomodoros, 0),
      completedPomodoros: 0,
    };
    await addTask(task);
    router.back();
  };

  const handleEdit = (index: number, newTitle: string) => {
    if (!generatedPlan) return;
    const updated = [...generatedPlan];
    updated[index] = { ...updated[index], title: newTitle };
    setGeneratedPlan(updated);
  };

  const handleRemove = (index: number) => {
    if (!generatedPlan) return;
    const updated = generatedPlan.filter((_, i) => i !== index);
    setGeneratedPlan(updated);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!generatedPlan ? (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Опишите вашу задачу</Text>
              <TextInput style={styles.textArea} placeholder="Например: Подготовиться к экзамену" placeholderTextColor={Colors.textTertiary} value={taskDescription} onChangeText={setTaskDescription} multiline numberOfLines={4} textAlignVertical="top" />
              <Text style={styles.label}>Дедлайн (опционально)</Text>
              <TextInput style={styles.input} placeholder="Например: до 15 декабря" placeholderTextColor={Colors.textTertiary} value={deadline} onChangeText={setDeadline} />
              {error ? (<Text style={styles.errorText}>{error}</Text>) : null}
              <TouchableOpacity style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]} onPress={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (<><ActivityIndicator size="small" color="#FFFFFF" /><Text style={styles.buttonText}>Анализирую задачу...</Text></>) : (<><Sparkles size={20} color="#FFFFFF" /><Text style={styles.buttonText}>Разобрать задачу с AI</Text></>)}
              </TouchableOpacity>
              <View style={styles.infoBox}><Text style={styles.infoIcon}>💡</Text><Text style={styles.infoText}>AI (или оффлайн-алгоритм) разобьёт задачу на шаги.</Text></View>
            </View>
          ) : (
            <View style={styles.planSection}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>✅ План готов!</Text>
                <Text style={styles.planSubtitle}>{generatedPlan.length} шагов • {generatedPlan.reduce((s, st) => s + st.estimatedPomodoros, 0)} сессий</Text>
              </View>
              <View style={styles.planList}>
                {generatedPlan.map((subTask, index) => (
                  <View key={subTask.id} style={styles.planItem}>
                    <View style={styles.planItemHeader}>
                      <Text style={styles.planItemNumber}>{index + 1}</Text>
                      <View style={styles.planItemContent}>
                        <TextInput style={styles.planItemTitle} value={subTask.title} onChangeText={(text) => handleEdit(index, text)} multiline />
                        <Text style={styles.planItemMeta}>🍅 {subTask.estimatedPomodoros} сессии</Text>
                      </View>
                      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(index)}><Text style={styles.removeButtonText}>✕</Text></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setGeneratedPlan(null)}><Text style={styles.secondaryButtonText}>Перегенерировать</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSave}><Text style={styles.primaryButtonText}>Сохранить план</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.background },
  keyboardView:{ flex:1 },
  scrollContent:{ padding:24 },
  inputSection:{ gap:16 },
  label:{ fontSize:17, fontWeight:"600" as const, color: Colors.text, marginBottom:-8 },
  textArea:{ backgroundColor: Colors.card, borderWidth:1, borderColor: Colors.border, borderRadius:12, padding:16, fontSize:16, color: Colors.text, minHeight:120 },
  input:{ backgroundColor: Colors.card, borderWidth:1, borderColor: Colors.border, borderRadius:12, padding:16, fontSize:16, color: Colors.text },
  errorText:{ color: Colors.error, fontSize:14, marginTop:-8 },
  analyzeButton:{ flexDirection:"row", backgroundColor: Colors.primary, borderRadius:12, padding:16, alignItems:"center", justifyContent:"center", gap:8, marginTop:8 },
  buttonDisabled:{ opacity:0.6 },
  buttonText:{ fontSize:17, fontWeight:"600" as const, color:"#FFFFFF" },
  infoBox:{ flexDirection:"row", backgroundColor: `${"#FD79A8"}20`, borderRadius:12, padding:16, gap:12, borderWidth:1, borderColor: Colors.accent },
  infoIcon:{ fontSize:20 },
  infoText:{ flex:1, fontSize:14, color: Colors.textSecondary, lineHeight:20 },
  planSection:{ gap:20 },
  planHeader:{ alignItems:"center", paddingBottom:20, borderBottomWidth:1, borderBottomColor: Colors.border },
  planTitle:{ fontSize:28, fontWeight:"700" as const, color: Colors.text, marginBottom:8 },
  planSubtitle:{ fontSize:15, color: Colors.textSecondary },
  planList:{ gap:12 },
  planItem:{ backgroundColor: Colors.card, borderWidth:1, borderColor: Colors.border, borderRadius:12, padding:16 },
  planItemHeader:{ flexDirection:"row", gap:12 },
  planItemNumber:{ width:32, height:32, borderRadius:16, backgroundColor: Colors.primary, color:"#FFFFFF", fontSize:16, fontWeight:"700" as const, textAlign:"center", lineHeight:32 },
  planItemContent:{ flex:1 },
  planItemTitle:{ fontSize:16, color: Colors.text, marginBottom:4, padding:0 },
  planItemMeta:{ fontSize:13, color: Colors.textSecondary },
  removeButton:{ width:32, height:32, borderRadius:16, backgroundColor: Colors.backgroundSecondary, alignItems:"center", justifyContent:"center" },
  removeButtonText:{ fontSize:18, color: Colors.textSecondary },
  actionButtons:{ flexDirection:"row", gap:12, marginTop:8 },
  secondaryButton:{ flex:1, backgroundColor: Colors.backgroundSecondary, borderRadius:12, padding:16, alignItems:"center" },
  secondaryButtonText:{ fontSize:16, fontWeight:"600" as const, color: Colors.text },
  primaryButton:{ flex:1, backgroundColor: Colors.primary, borderRadius:12, padding:16, alignItems:"center" },
  primaryButtonText:{ fontSize:16, fontWeight:"600" as const, color:"#FFFFFF" },
});