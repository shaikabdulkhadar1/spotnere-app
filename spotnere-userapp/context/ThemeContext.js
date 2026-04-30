import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors as lightColors, darkColors } from "../constants/colors";

const THEME_STORAGE_KEY = "spotnere_user_theme";

const ThemeContext = createContext({
  colors: lightColors,
  theme: "System Default",
  isDark: false,
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState("System Default");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored && ["Light", "Dark", "System Default"].includes(stored)) {
          setThemeState(stored);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme).catch(() => {});
  };

  const isDark = useMemo(() => {
    if (theme === "Dark") return true;
    if (theme === "Light") return false;
    return systemScheme === "dark";
  }, [theme, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({ colors, theme, isDark, setTheme }),
    [colors, theme, isDark],
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
