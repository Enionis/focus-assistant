// app/statistics.tsx
import { Trophy, Target, Clock, Flame, Award } from "lucide-react-native";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFocus } from "@/contexts/FocusContext";

export default function StatisticsScreen() {
  const { stats } = useFocus();
  const hoursSpent = Math.floor(stats.totalFocusTime / 60);
  const minutesSpent = stats.totalFocusTime % 60;
  const levelProgress = stats.xp % 100;
  const nextLevelXP = 100;

  const achievements = [
    { id:'first_steps', title:'Первые шаги', description:'Завершите первую сессию', icon:'🎯', xp:10, unlocked: stats.achievements.some(a => a.id === 'first_steps') },
    { id:'weekly_warrior', title:'Ученик недели', description:'Завершите 7 сессий', icon:'🎓', xp:50, unlocked: stats.achievements.some(a => a.id === 'weekly_warrior') },
    { id:'focus_master', title:'Мастер фокуса', description:'10 дней подряд', icon:'🏆', xp:100, unlocked: stats.achievements.some(a => a.id === 'focus_master') },
    { id:'century_club', title:'Сотка', description:'100 завершенных сессий', icon:'💯', xp:200, unlocked: stats.achievements.some(a => a.id === 'century_club') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.levelCard}>
          <View style={styles.levelBadge}><Trophy size={32} color={Colors.primary} /><Text style={styles.levelNumber}>{stats.level}</Text></View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>Уровень {stats.level}</Text>
            <Text style={styles.levelSubtitle}>{levelProgress}/{nextLevelXP} XP до следующего уровня</Text>
            <View style={styles.levelProgress}><View style={[styles.levelProgressFill, { width: `${levelProgress}%` }]} /></View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}><View style={[styles.statIconContainer, { backgroundColor: `${Colors.primary}15` }]}><Target size={24} color={Colors.primary} /></View><Text style={styles.statValue}>{stats.totalSessions}</Text><Text style={styles.statLabel}>Всего сессий</Text></View>
          <View style={styles.statBox}><View style={[styles.statIconContainer, { backgroundColor: `${Colors.secondary}15` }]}><Clock size={24} color={Colors.secondary} /></View><Text style={styles.statValue}>{hoursSpent}ч {minutesSpent}м</Text><Text style={styles.statLabel}>Время фокуса</Text></View>
          <View style={styles.statBox}><View style={[styles.statIconContainer, { backgroundColor: `${Colors.accent}15` }]}><Flame size={24} color={Colors.accent} /></View><Text style={styles.statValue}>{stats.currentStreak}</Text><Text style={styles.statLabel}>Текущая серия</Text></View>
          <View style={styles.statBox}><View style={[styles.statIconContainer, { backgroundColor: `${Colors.success}15` }]}><Award size={24} color={Colors.success} /></View><Text style={styles.statValue}>{stats.longestStreak}</Text><Text style={styles.statLabel}>Лучшая серия</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Достижения</Text>
          <View style={styles.achievementsList}>
            {achievements.map((a) => (
              <View key={a.id} style={[styles.achievementCard, !a.unlocked && styles.achievementCardLocked]}>
                <Text style={styles.achievementIcon}>{a.icon}</Text>
                <View style={styles.achievementContent}>
                  <Text style={[styles.achievementTitle, !a.unlocked && styles.achievementTitleLocked]}>{a.title}</Text>
                  <Text style={styles.achievementDescription}>{a.description}</Text>
                  <Text style={styles.achievementXP}>+{a.xp} XP</Text>
                </View>
                {a.unlocked && (<View style={styles.achievementBadge}><Text style={styles.achievementBadgeText}>✓</Text></View>)}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.motivationCard}>
          <Text style={styles.motivationIcon}>💪</Text>
          <Text style={styles.motivationTitle}>Продолжай в том же духе!</Text>
          <Text style={styles.motivationText}>Каждая сессия делает тебя лучше!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: Colors.background },
  scrollContent:{ padding:24, paddingBottom:40 },
  levelCard:{ flexDirection:"row", backgroundColor: Colors.card, borderRadius:16, padding:20, marginBottom:24, borderWidth:2, borderColor: Colors.primary, alignItems:"center", gap:16 },
  levelBadge:{ width:80, height:80, borderRadius:40, backgroundColor: `${"#6C5CE7"}15`, alignItems:"center", justifyContent:"center", borderWidth:3, borderColor: Colors.primary },
  levelNumber:{ fontSize:20, fontWeight:"700" as const, color: Colors.primary, marginTop:4 },
  levelInfo:{ flex:1 },
  levelTitle:{ fontSize:24, fontWeight:"700" as const, color: Colors.text, marginBottom:4 },
  levelSubtitle:{ fontSize:14, color: Colors.textSecondary, marginBottom:12 },
  levelProgress:{ height:8, backgroundColor: Colors.backgroundSecondary, borderRadius:4, overflow:"hidden" },
  levelProgressFill:{ height:"100%", backgroundColor: Colors.primary, borderRadius:4 },
  statsGrid:{ flexDirection:"row", flexWrap:"wrap", gap:12, marginBottom:24 },
  statBox:{ width:"48%", backgroundColor: Colors.card, borderRadius:16, padding:20, alignItems:"center", borderWidth:1, borderColor: Colors.border },
  statIconContainer:{ width:48, height:48, borderRadius:24, alignItems:"center", justifyContent:"center", marginBottom:12 },
  statValue:{ fontSize:24, fontWeight:"700" as const, color: Colors.text, marginBottom:4 },
  statLabel:{ fontSize:13, color: Colors.textSecondary, textAlign:"center" },
  section:{ marginBottom:24 },
  sectionTitle:{ fontSize:22, fontWeight:"700" as const, color: Colors.text, marginBottom:16 },
  achievementsList:{ gap:12 },
  achievementCard:{ flexDirection:"row", backgroundColor: Colors.card, borderRadius:12, padding:16, alignItems:"center", gap:12, borderWidth:1, borderColor: Colors.border },
  achievementCardLocked:{ opacity:0.5 },
  achievementIcon:{ fontSize:32 },
  achievementContent:{ flex:1 },
  achievementTitle:{ fontSize:16, fontWeight:"600" as const, color: Colors.text, marginBottom:4 },
  achievementTitleLocked:{ color: Colors.textSecondary },
  achievementDescription:{ fontSize:13, color: Colors.textSecondary, marginBottom:4 },
  achievementXP:{ fontSize:12, fontWeight:"600" as const, color: Colors.primary },
  achievementBadge:{ width:32, height:32, borderRadius:16, backgroundColor: Colors.success, alignItems:"center", justifyContent:"center" },
  achievementBadgeText:{ fontSize:16, color:"#FFFFFF", fontWeight:"700" as const },
  motivationCard:{ backgroundColor: `${"#6C5CE7"}10`, borderRadius:16, padding:24, alignItems:"center", borderWidth:1, borderColor: Colors.primary },
  motivationIcon:{ fontSize:48, marginBottom:12 },
  motivationTitle:{ fontSize:20, fontWeight:"700" as const, color: Colors.text, marginBottom:12, textAlign:"center" },
  motivationText:{ fontSize:15, color: Colors.textSecondary, textAlign:"center", lineHeight:22 },
});