import React, { useState, useEffect } from "react";
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
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { registerUser } from "../utils/auth";
import { Country, State, City } from "country-state-city";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({ onLoginSuccess, onBack }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown modals
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  // Get countries, states, and cities from library
  const countries = Country.getAllCountries();
  const states = formData.country
    ? State.getStatesOfCountry(formData.country)
    : [];
  const cities =
    formData.country && formData.state
      ? City.getCitiesOfState(formData.country, formData.state)
      : [];

  // Reset state and city when country changes
  useEffect(() => {
    if (formData.country) {
      setFormData((prev) => ({ ...prev, state: "", city: "" }));
    }
  }, [formData.country]);

  // Reset city when state changes
  useEffect(() => {
    if (formData.state) {
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  }, [formData.state]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleDropdownSelect = (field, value, displayValue) => {
    handleInputChange(field, value);
    if (field === "country") {
      setShowCountryModal(false);
    } else if (field === "state") {
      setShowStateModal(false);
    } else if (field === "city") {
      setShowCityModal(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

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

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
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
      // Call Supabase registration function
      const result = await registerUser(formData);

      if (!result.success) {
        Alert.alert(
          "Registration Failed",
          result.error || "Failed to create account. Please try again."
        );
        return;
      }

      // Success - call callback if provided
      if (onLoginSuccess && result.user) {
        onLoginSuccess(result.user);
      } else {
        Alert.alert("Success", "Account created successfully!", [
          { text: "OK" },
        ]);
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const renderInputField = (
    field,
    label,
    placeholder,
    keyboardType = "default",
    autoCapitalize = "words",
    icon = null,
    isPassword = false,
    showPasswordToggle = false
  ) => {
    const hasError = errors[field];
    const value = formData[field];
    const isPasswordField =
      isPassword || field === "password" || field === "confirmPassword";
    const showToggle = showPasswordToggle || isPasswordField;
    const isVisible =
      field === "password"
        ? showPassword
        : field === "confirmPassword"
        ? showConfirmPassword
        : true;

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
                } else if (field === "confirmPassword") {
                  setShowConfirmPassword(!showConfirmPassword);
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

  const renderDropdownField = (
    field,
    label,
    placeholder,
    icon,
    options,
    showModal,
    setShowModal,
    getValue,
    getDisplayValue,
    disabled = false
  ) => {
    const hasError = errors[field];
    const selectedValue = formData[field];
    // Ensure options is always an array
    const safeOptions = Array.isArray(options) ? options : [];
    const selectedOption = safeOptions.find(
      (item) => getValue(item) === selectedValue
    );
    const displayText = selectedOption
      ? getDisplayValue(selectedOption)
      : placeholder;

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.inputWrapper,
            styles.dropdownWrapper,
            hasError && styles.inputWrapperError,
            selectedValue && !hasError && styles.inputWrapperFilled,
            disabled && styles.dropdownDisabled,
          ]}
          onPress={() => !disabled && setShowModal(true)}
          disabled={disabled}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={hasError ? colors.error : colors.textSecondary}
              style={styles.inputIcon}
            />
          )}
          <Text
            style={[
              styles.dropdownText,
              !selectedValue && styles.dropdownPlaceholder,
            ]}
          >
            {displayText}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {hasError && <Text style={styles.errorText}>{errors[field]}</Text>}

        {/* Dropdown Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {label}</Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              {safeOptions.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>
                    {disabled
                      ? "Please select a country first"
                      : "No options available"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={safeOptions}
                  keyExtractor={(item, index) =>
                    getValue(item) || `option-${index}`
                  }
                  renderItem={({ item }) => {
                    const value = getValue(item);
                    const display = getDisplayValue(item);
                    const isSelected = selectedValue === value;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.modalItem,
                          isSelected && styles.modalItemSelected,
                        ]}
                        onPress={() =>
                          handleDropdownSelect(field, value, display)
                        }
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            isSelected && styles.modalItemTextSelected,
                          ]}
                        >
                          {display}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.modalList}
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };

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
        {/* Header */}
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Please fill in your details to get started
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* First Name */}
          {renderInputField(
            "firstName",
            "First Name",
            "Enter your first name",
            "default",
            "words",
            "person-outline"
          )}

          {/* Last Name */}
          {renderInputField(
            "lastName",
            "Last Name",
            "Enter your last name",
            "default",
            "words",
            "person-outline"
          )}

          {/* Phone Number */}
          {renderInputField(
            "phoneNumber",
            "Phone Number",
            "Enter your phone number",
            "phone-pad",
            "none",
            "call-outline"
          )}

          {/* Email */}
          {renderInputField(
            "email",
            "Email",
            "Enter your email address",
            "email-address",
            "none",
            "mail-outline"
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
            true
          )}

          {/* Confirm Password */}
          {renderInputField(
            "confirmPassword",
            "Confirm Password",
            "Confirm your password",
            "default",
            "none",
            "lock-closed-outline",
            true,
            true
          )}

          {/* Address */}
          {renderInputField(
            "address",
            "Address",
            "Enter your address",
            "default",
            "words",
            "home-outline"
          )}

          {/* Country Dropdown */}
          {renderDropdownField(
            "country",
            "Country",
            "Select your country",
            "globe-outline",
            countries,
            showCountryModal,
            setShowCountryModal,
            (item) => item.isoCode,
            (item) => item.name
          )}

          {/* State Dropdown */}
          {renderDropdownField(
            "state",
            "State",
            formData.country ? "Select your state" : "Select country first",
            "map-outline",
            states,
            showStateModal,
            setShowStateModal,
            (item) => item.isoCode,
            (item) => item.name,
            !formData.country
          )}

          {/* City Dropdown */}
          {renderDropdownField(
            "city",
            "City",
            formData.state ? "Select your city" : "Select state first",
            "location-outline",
            cities,
            showCityModal,
            setShowCityModal,
            (item) => item.name,
            (item) => item.name,
            !formData.state
          )}

          {/* Postal Code */}
          {renderInputField(
            "postalCode",
            "Postal Code",
            "Enter your postal code",
            "default",
            "characters",
            "mail-outline"
          )}
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
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Creating Account...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Footer Text */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By creating an account, you agree to our{" "}
            <Text style={styles.footerLink}>Terms of Service</Text> and{" "}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
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
