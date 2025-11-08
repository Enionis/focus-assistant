// app/+not-found.tsx
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Страница не найдена" }} />
      <View style={styles.container}>
        <Text style={styles.icon}>🤔</Text>
        <Text style={styles.title}>Страница не найдена</Text>
        <Text style={styles.description}>Кажется, вы попали не туда</Text>

        <Link href="/home" style={styles.link}>
          <Text style={styles.linkText}>Вернуться на главную</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: Colors.background },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" as const, color: Colors.text, marginBottom: 8 },
  description: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24 },
  link: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  linkText: { fontSize: 16, fontWeight: "600" as const, color: "#FFFFFF" },
});