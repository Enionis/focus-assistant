// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FocusProvider } from "@/contexts/FocusContext";
import { initMaxBridge } from "./max-bridge";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Назад" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen 
        name="create-task" 
        options={{ title: "Создать задачу", headerShown: true, presentation: "modal" }} 
      />
      <Stack.Screen 
        name="task-details" 
        options={{ title: "План задачи", headerShown: true }} 
      />
      <Stack.Screen 
        name="pomodoro" 
        options={{ headerShown: false, presentation: "fullScreenModal" }} 
      />
      <Stack.Screen 
        name="statistics" 
        options={{ title: "Статистика", headerShown: true }} 
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    const API_BASE = process.env.EXPO_PUBLIC_MAX_BACKEND || "";
    initMaxBridge(API_BASE).catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FocusProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </FocusProvider>
    </QueryClientProvider>
  );
}