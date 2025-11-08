// app/home.tsx
import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ФокусПомощник</Text>
      <Link href="/create-task" style={styles.link}><Text style={styles.linkText}>Создать задачу</Text></Link>
      <Link href="/statistics" style={[styles.link, { marginTop: 12 }]}><Text style={styles.linkText}>Статистика</Text></Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: Colors.background, alignItems:"center", justifyContent:"center", gap:16, padding:24 },
  title: { fontSize:28, fontWeight:"700" as const, color: Colors.text, marginBottom:20 },
  link: { backgroundColor: Colors.primary, paddingHorizontal:24, paddingVertical:12, borderRadius:12 },
  linkText: { color: "#fff", fontSize:16, fontWeight:"600" as const },
});