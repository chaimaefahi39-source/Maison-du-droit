import { Tabs } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Platform } from "react-native";
import { useLanguage } from "../../context/LanguageContext";

export default function AppLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.iconDisabled,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabHome"),
          tabBarIcon: ({ color, size }) => <Feather name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabAssistant"),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t("tabRequests"),
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: t("tabResources"),
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabProfile"),
          tabBarIcon: ({ color, size }) => <Feather name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
