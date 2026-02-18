import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { loginUser } from "../utils/auth";
import RegistrationPage from "../components/RegistrationPage";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({ onLoginSuccess, onBack }) => {
  const [mode, setMode] = useState("signIn"); // "signIn" or "signUp"

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };


  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields correctly."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginUser(formData.email, formData.password);

      if (!result.success) {
        Alert.alert(
          "Sign In Failed",
          result.error || "Failed to sign in. Please try again."
        );
        return;
      }

      // Success - call callback if provided
      if (onLoginSuccess && result.user) {
        onLoginSuccess(result.user);
      } else {
        Alert.alert("Success", "Signed in successfully!", [{ text: "OK" }]);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  const renderInputField = (
    field,
    label,
    placeholder,
    keyboardType = "default",
    autoCapitalize = "words",
    icon = null,
    isPassword = false,
    showPasswordToggle = false,
  ) => {
    const hasError = errors[field];
    const value = formData[field];
    const isPasswordField = isPassword || field === "password";
    const showToggle = showPasswordToggle || isPasswordField;
    const isVisible = field === "password" ? showPassword : true;

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            hasError && styles.inputWrapperError,
            value && !hasError && styles.inputWrapperFilled,
          ]}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={hasError ? colors.error : colors.textSecondary}
              style={styles.inputIcon}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={(text) => handleInputChange(field, text)}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            secureTextEntry={isPasswordField && !isVisible}
          />
          {showToggle && (
            <TouchableOpacity
              onPress={() => {
                if (field === "password") {
                  setShowPassword(!showPassword);
                }
              }}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={isVisible ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  // Show RegistrationPage if in signUp mode
  if (mode === "signUp") {
    return (
      <RegistrationPage
        onRegistrationSuccess={(user) => {
          if (onLoginSuccess) {
            onLoginSuccess(user);
          }
        }}
        onBack={onBack}
        onSwitchToLogin={() => setMode("signIn")}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Spotnere Vendor</Text>
          <Text style={styles.subtitle}>
            Sign in to manage your business
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Sign In Form */}
          <>
            {/* Email */}
            {renderInputField(
              "email",
              "Business Email",
              "Enter your business email address",
              "email-address",
              "none",
              "mail-outline",
            )}

            {/* Password */}
            {renderInputField(
              "password",
              "Password",
              "Enter your password",
              "default",
              "none",
              "lock-closed-outline",
              true,
              true,
            )}
          </>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        {/* Footer Text */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => setMode("signUp")}>
            <Text style={styles.footerText}>
              Don't have an account?{" "}
              <Text style={styles.footerLink}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 30,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperFilled: {
    borderColor: colors.primary,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  eyeIcon: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  dropdownWrapper: {
    justifyContent: "space-between",
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
  },
  dropdownDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.surface,
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  modalItemTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  modalEmpty: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default LoginScreen;
