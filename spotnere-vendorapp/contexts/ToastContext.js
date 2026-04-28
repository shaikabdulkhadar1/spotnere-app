/**
 * Toast Context
 * Provides a simple in-app toast/banner for notifications
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { StyleSheet, Text, Animated } from "react-native";
import { useTheme } from "./ThemeContext";
import { fonts } from "../constants/fonts";

const ToastContext = createContext();

const TOAST_DURATION = 3500;

export const ToastProvider = ({ children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [message, setMessage] = useState(null);
  const [opacity] = useState(() => new Animated.Value(0));

  const showToast = useCallback((msg) => {
    setMessage(msg);
  }, []);

  useEffect(() => {
    if (!message) return;

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(TOAST_DURATION - 400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMessage(null);
      opacity.setValue(0);
    });
  }, [message, opacity]);

  const value = { showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const createStyles = (colors) => StyleSheet.create({
  toast: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fonts.semiBold,
    textAlign: "center",
  },
});
