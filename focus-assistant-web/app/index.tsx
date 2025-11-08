// app/index.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocus } from "@/contexts/FocusContext";
import Colors from "@/constants/colors";

export default function Index() {
  const router = useRouter();
  const { settings } = useFocus();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (settings.isOnboarded) {
        router.replace("/home" as any);
      } else {
        router.replace("/onboarding" as any);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [settings.isOnboarded, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
});