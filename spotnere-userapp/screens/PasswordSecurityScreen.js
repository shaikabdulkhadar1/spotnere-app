import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { api } from "../api/client";
import { getCurrentUser } from "../utils/auth";

const PasswordSecurityScreen = ({ onBack }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const user = await getCurrentUser();
      if (!user || !user.id) {
        Alert.alert("Error", "User not found. Please log in again.");
        return;
      }

      try {
        await api.updatePassword(
          user.id,
          formData.currentPassword,
          formData.newPassword
        );
      } catch (err) {
        const msg = err?.data?.error || err?.message || "Failed to update password";
        if (msg.toLowerCase().includes("current password")) {
          setErrors({ currentPassword: "Current password is incorrect" });
          return;
        }
        Alert.alert("Error", msg);
        return;
      }

      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});

      Alert.alert("Success", "Password updated successfully");
    } catch (error) {
      console.error("Error saving password:", error);
      Alert.alert("Error", error.message || "Failed to save password");
    } finally {
      setIsSaving(false);
    }
  };

  const renderPasswordField = (
    label,
    value,
    onChangeText,
    showPassword,
    onToggleVisibility,
    error,
    fieldKey
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={[styles.passwordInput, error && styles.inputError]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={onToggleVisibility}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password & Security</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Your password must be at least 8 characters long. Make sure to use a
            strong password that you haven't used before.
          </Text>
        </View>
      </View>

      {/* Password Fields */}
      <View style={styles.section}>
        {renderPasswordField(
          "Current Password",
          formData.currentPassword,
          (text) =>
            setFormData({ ...formData, currentPassword: text }) &&
            setErrors({ ...errors, currentPassword: "" }),
          showCurrentPassword,
          () => setShowCurrentPassword(!showCurrentPassword),
          errors.currentPassword,
          "currentPassword"
        )}

        {renderPasswordField(
          "New Password",
          formData.newPassword,
          (text) =>
            setFormData({ ...formData, newPassword: text }) &&
            setErrors({ ...errors, newPassword: "" }),
          showNewPassword,
          () => setShowNewPassword(!showNewPassword),
          errors.newPassword,
          "newPassword"
        )}

        {renderPasswordField(
          "Confirm New Password",
          formData.confirmPassword,
          (text) =>
            setFormData({ ...formData, confirmPassword: text }) &&
            setErrors({ ...errors, confirmPassword: "" }),
          showConfirmPassword,
          () => setShowConfirmPassword(!showConfirmPassword),
          errors.confirmPassword,
          "confirmPassword"
        )}
      </View>

      {/* Save Button */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.regular,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  section: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
    fontFamily: fonts.regular,
  },
  inputError: {
    borderColor: colors.error,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
    fontFamily: fonts.regular,
  },
  actionButtonsContainer: {
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: fonts.regular,
  },
});

export default PasswordSecurityScreen;
