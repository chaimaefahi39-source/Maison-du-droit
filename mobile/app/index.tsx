import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { useAuthStore } from "../store/useAuthStore";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const loadAuth = useAuthStore((s) => s.loadAuth);

  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate in
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 10, stiffness: 80 });
    textOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 90 }));
    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));

    // Load auth and navigate
    const timer = setTimeout(async () => {
      await loadAuth();
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        router.replace("/(app)/home" as any);
      } else {
        router.replace("/(auth)/login" as any);
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background decorative elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgAccentLine} />

      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <View style={styles.logoBox}>
          <Ionicons name="shield-checkmark" size={52} color={colors.primary} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Animated.Text style={styles.brandTitle}>Maison du Droit</Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.subtitleContainer, animatedSubtitleStyle]}>
        <Animated.Text style={styles.subtitle}>
          Votre assistant juridique intelligent
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoBox: {
    width: 110,
    height: 110,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 24,
    zIndex: 10,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  subtitleContainer: {
    marginTop: 8,
    zIndex: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.accentLight,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  bgCircle1: {
    position: "absolute",
    width: width * 1.6,
    height: width * 1.6,
    borderRadius: width,
    backgroundColor: "rgba(255,255,255,0.03)",
    top: -width * 0.8,
    left: -width * 0.3,
  },
  bgCircle2: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "rgba(200,164,92,0.06)",
    bottom: -width * 0.5,
    right: -width * 0.4,
  },
  bgAccentLine: {
    position: "absolute",
    width: 3,
    height: 120,
    backgroundColor: colors.accent,
    opacity: 0.2,
    bottom: 80,
    right: 40,
    borderRadius: 2,
  },
});
