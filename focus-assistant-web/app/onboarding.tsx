// app/onboarding.tsx
import { useRouter } from "expo-router";
import { Target } from "lucide-react-native";
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFocus } from "@/contexts/FocusContext";

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useFocus();
  const [step, setStep] = useState(0);
  const [dailyHours, setDailyHours] = useState(4);
  const [productiveTime, setProductiveTime] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [pomodoroLength, setPomodoroLength] = useState(25);
  const [breakLength, setBreakLength] = useState(5);
  const [fadeAnim] = useState(new Animated.Value(1));

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 200);
  };

  const handleNext = () => { if (step < 3) { animateTransition(() => setStep(step + 1)); } else { handleComplete(); } };

  const handleComplete = async () => {
    await completeOnboarding({ dailyHours, productiveTime, pomodoroLength, breakLength });
    router.replace("/home" as any);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}><Target size={80} color={Colors.primary} strokeWidth={2} /></View>
            <Text style={styles.title}>Добро пожаловать в{"\n"}ФокусПомощник! 🎯</Text>
            <Text style={styles.description}>Я помогу разбить большие задачи на маленькие шаги и сфокусироваться.</Text>
            <Text style={styles.subDescription}>Давай настроим профиль для эффективности!</Text>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>📅 Сколько часов в день{"\n"}ты готов уделять задачам?</Text>
            <View style={styles.optionsContainer}>
              {[{ value: 2, label: "2-3 часа" }, { value: 4, label: "4-5 часов" }, { value: 6, label: "6+ часов" }].map((o) => (
                <TouchableOpacity key={o.value} style={[styles.option, dailyHours === o.value && styles.optionSelected]} onPress={() => setDailyHours(o.value)}>
                  <Text style={[styles.optionText, dailyHours === o.value && styles.optionTextSelected]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>⏰ В какое время ты{"\n"}наиболее продуктивен?</Text>
            <View style={styles.optionsContainer}>
              {[
                { value: 'morning' as const, label: "Утро (8-12)", emoji: "🌅" },
                { value: 'afternoon' as const, label: "День (12-17)", emoji: "☀️" },
                { value: 'evening' as const, label: "Вечер (17-22)", emoji: "🌆" },
                { value: 'night' as const, label: "Ночная сова", emoji: "🌙" },
              ].map((o) => (
                <TouchableOpacity key={o.value} style={[styles.option, productiveTime === o.value && styles.optionSelected]} onPress={() => setProductiveTime(o.value)}>
                  <Text style={styles.optionEmoji}>{o.emoji}</Text>
                  <Text style={[styles.optionText, productiveTime === o.value && styles.optionTextSelected]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🎯 Предпочитаемая длина{"\n"}сессий Pomodoro:</Text>
            <View style={styles.optionsContainer}>
              {[
                { work: 25, break: 5, label: "🍅 Классика", sub: "25 мин / 5 мин" },
                { work: 50, break: 10, label: "🔥 Интенсив", sub: "50 мин / 10 мин" },
                { work: 90, break: 15, label: "⚡ Глубокая работа", sub: "90 мин / 15 мин" },
              ].map((o) => (
                <TouchableOpacity key={o.work} style={[styles.option, pomodoroLength === o.work && styles.optionSelected]} onPress={() => { setPomodoroLength(o.work); setBreakLength(o.break); }}>
                  <Text style={[styles.optionText, pomodoroLength === o.work && styles.optionTextSelected]}>{o.label}</Text>
                  <Text style={[styles.optionSubText, pomodoroLength === o.work && styles.optionSubTextSelected]}>{o.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          {[0,1,2,3].map(i => <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />)}
        </View>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>{renderStep()}</Animated.View>
      </ScrollView>
      <View style={styles.footer}>
        {step > 0 && (<TouchableOpacity style={styles.backButton} onPress={() => animateTransition(() => setStep(step - 1))}><Text style={styles.backButtonText}>Назад</Text></TouchableOpacity>)}
        <TouchableOpacity style={[styles.nextButton, step === 0 && styles.nextButtonFull]} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{step === 3 ? "Начать!" : step === 0 ? "Настроить" : "Далее"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.background },
  scrollContent:{ flexGrow:1 },
  progressContainer:{ flexDirection:"row", justifyContent:"center", alignItems:"center", paddingVertical:20, gap:8 },
  progressDot:{ width:8, height:8, borderRadius:4, backgroundColor: Colors.border },
  progressDotActive:{ width:24, backgroundColor: Colors.primary },
  content:{ flex:1, justifyContent:"center", paddingHorizontal:24 },
  stepContainer:{ alignItems:"center", justifyContent:"center" },
  iconContainer:{ marginBottom:32 },
  title:{ fontSize:32, fontWeight:"700" as const, color: Colors.text, textAlign:"center", marginBottom:16, lineHeight:40 },
  description:{ fontSize:17, color: Colors.textSecondary, textAlign:"center", lineHeight:24, marginBottom:12 },
  subDescription:{ fontSize:15, color: Colors.textTertiary, textAlign:"center", lineHeight:22 },
  stepTitle:{ fontSize:26, fontWeight:"700" as const, color: Colors.text, textAlign:"center", marginBottom:32, lineHeight:34 },
  optionsContainer:{ width:"100%", gap:12 },
  option:{ backgroundColor: Colors.card, borderWidth:2, borderColor: Colors.border, borderRadius:16, padding:20, alignItems:"center" },
  optionSelected:{ borderColor: Colors.primary, backgroundColor: `${"#6C5CE7"}10` },
  optionEmoji:{ fontSize:28, marginBottom:8 },
  optionText:{ fontSize:17, fontWeight:"600" as const, color: Colors.text },
  optionTextSelected:{ color: Colors.primary },
  optionSubText:{ fontSize:14, color: Colors.textSecondary, marginTop:4 },
  optionSubTextSelected:{ color: Colors.primaryDark },
  footer:{ flexDirection:"row", paddingHorizontal:24, paddingVertical:16, gap:12 },
  backButton:{ flex:1, backgroundColor: Colors.backgroundSecondary, borderRadius:16, paddingVertical:16, alignItems:"center", justifyContent:"center" },
  backButtonText:{ fontSize:17, fontWeight:"600" as const, color: Colors.text },
  nextButton:{ flex:2, backgroundColor: Colors.primary, borderRadius:16, paddingVertical:16, alignItems:"center", justifyContent:"center" },
  nextButtonFull:{ flex:1 },
  nextButtonText:{ fontSize:17, fontWeight:"700" as const, color:"#FFFFFF" },
});