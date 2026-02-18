/**
 * Registration Page Component
 * Handles vendor registration form
 */

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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { Country, State, City } from "country-state-city";
import { registerUser } from "../utils/auth";

const { width, height } = Dimensions.get("window");

const RegistrationPage = ({ onRegistrationSuccess, onBack, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    businessName: "",
    businessCategory: "",
    businessSubCategory: "",
    vendorFullName: "",
    businessPhoneNumber: "",
    vendorPhoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Business address (for places table)
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    // Vendor address (for vendors table)
    vendorAddress: "",
    vendorCity: "",
    vendorState: "",
    vendorCountry: "",
    vendorPostalCode: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Dropdown modals
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState("");
  // Vendor address dropdown modals
  const [showVendorCountryModal, setShowVendorCountryModal] = useState(false);
  const [showVendorStateModal, setShowVendorStateModal] = useState(false);
  const [showVendorCityModal, setShowVendorCityModal] = useState(false);
  const [selectedVendorCountryCode, setSelectedVendorCountryCode] = useState("");
  const [selectedVendorStateCode, setSelectedVendorStateCode] = useState("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Business category options
  const businessCategories = [
    { value: "Sports", label: "Sports" },
    { value: "Adventure", label: "Adventure" },
    { value: "Parks", label: "Parks" },
    { value: "Staycation", label: "Staycation" },
    { value: "Tickets to Event", label: "Tickets to Event" },
    { value: "Exclusive", label: "Exclusive" },
  ];

  // Business sub-categories mapping
  const getBusinessSubCategories = (category) => {
    const subCategoriesMap = {
      Sports: [
        "Cricket",
        "Racquet games",
        "Football",
        "Basket ball",
        "Volly ball",
        "Golf",
        "Bowling",
        "Snooker",
        "Aiming Games",
        "VR Games",
        "Paintball",
        "Go Carting",
        "Trampolin",
        "Cycling",
      ],
      Adventure: [
        "Water Amusement",
        "Jungle Safari",
        "Para Gliding",
        "Para Motoring",
        "Trekking",
        "Ziplining",
        "Horse Riding",
      ],
      Parks: ["Water Amusement", "Family Park", "Zoological park", "Kids park"],
      Staycation: ["Farm House", "Resorts", "5S Villa's"],
      "Tickets to Event": [
        "Football Match",
        "Cricket Match",
        "Hockey Match",
        "Snooker Match",
        "Tennis Match",
        "Kabaddi Match",
        "IPL Tickets",
      ],
      Exclusive: [
        "Scuba Diving",
        "Sky Diving",
        "Hot Air Ballon",
        "Disney Land",
        "Ferrari World",
        "Mount Everest Climbing",
      ],
    };

    return subCategoriesMap[category] || [];
  };

  // Get sub-categories for selected category
  const businessSubCategories = formData.businessCategory
    ? getBusinessSubCategories(formData.businessCategory).map((subCat) => ({
        value: subCat,
        label: subCat,
      }))
    : [];

  // Get countries, states, and cities from library
  const countries = Country.getAllCountries();
  const states = selectedCountryCode
    ? State.getStatesOfCountry(selectedCountryCode)
    : [];
  const cities =
    selectedCountryCode && selectedStateCode
      ? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
      : [];

  // Vendor address countries, states, and cities
  const vendorStates = selectedVendorCountryCode
    ? State.getStatesOfCountry(selectedVendorCountryCode)
    : [];
  const vendorCities =
    selectedVendorCountryCode && selectedVendorStateCode
      ? City.getCitiesOfState(selectedVendorCountryCode, selectedVendorStateCode)
      : [];

  // Reset state and city when country changes
  useEffect(() => {
    if (formData.country) {
      setFormData((prev) => ({ ...prev, state: "", city: "" }));
      setSelectedStateCode("");
    }
  }, [formData.country]);

  // Reset city when state changes
  useEffect(() => {
    if (formData.state) {
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  }, [formData.state]);

  // Reset vendor state and city when vendor country changes
  useEffect(() => {
    if (formData.vendorCountry) {
      setFormData((prev) => ({ ...prev, vendorState: "", vendorCity: "" }));
      setSelectedVendorStateCode("");
    }
  }, [formData.vendorCountry]);

  // Reset vendor city when vendor state changes
  useEffect(() => {
    if (formData.vendorState) {
      setFormData((prev) => ({ ...prev, vendorCity: "" }));
    }
  }, [formData.vendorState]);

  // Reset sub-category when category changes
  useEffect(() => {
    if (formData.businessCategory) {
      setFormData((prev) => ({ ...prev, businessSubCategory: "" }));
    }
  }, [formData.businessCategory]);

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
    } else if (field === "businessCategory") {
      setShowCategoryModal(false);
    } else if (field === "businessSubCategory") {
      setShowSubCategoryModal(false);
    } else if (field === "vendorCountry") {
      setShowVendorCountryModal(false);
    } else if (field === "vendorState") {
      setShowVendorStateModal(false);
    } else if (field === "vendorCity") {
      setShowVendorCityModal(false);
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountryCode(country.isoCode);
    setSelectedStateCode("");
    handleDropdownSelect("country", country.name, country.name);
  };

  const handleStateSelect = (state) => {
    setSelectedStateCode(state.isoCode);
    handleDropdownSelect("state", state.name, state.name);
  };

  const handleCitySelect = (city) => {
    handleDropdownSelect("city", city.name, city.name);
  };

  const handleVendorCountrySelect = (country) => {
    setSelectedVendorCountryCode(country.isoCode);
    setSelectedVendorStateCode("");
    handleDropdownSelect("vendorCountry", country.name, country.name);
  };

  const handleVendorStateSelect = (state) => {
    setSelectedVendorStateCode(state.isoCode);
    handleDropdownSelect("vendorState", state.name, state.name);
  };

  const handleVendorCitySelect = (city) => {
    handleDropdownSelect("vendorCity", city.name, city.name);
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case 1: // Login Details
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
        break;

      case 2: // Business Information
        if (!formData.businessName.trim()) {
          newErrors.businessName = "Business name is required";
        }
        if (!formData.businessCategory.trim()) {
          newErrors.businessCategory = "Business category is required";
        }
        break;

      case 3: // Business Address Information
        if (!formData.address.trim()) {
          newErrors.address = "Address is required";
        }
        if (!formData.country.trim()) {
          newErrors.country = "Country is required";
        }
        if (!formData.state.trim()) {
          newErrors.state = "State is required";
        }
        if (!formData.city.trim()) {
          newErrors.city = "City is required";
        }
        if (!formData.postalCode.trim()) {
          newErrors.postalCode = "Postal code is required";
        }
        if (!formData.businessPhoneNumber.trim()) {
          newErrors.businessPhoneNumber = "Business phone number is required";
        } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.businessPhoneNumber)) {
          newErrors.businessPhoneNumber = "Please enter a valid phone number";
        }
        break;

      case 4: // Vendor/Business Owner Details
        if (!formData.vendorFullName.trim()) {
          newErrors.vendorFullName = "Vendor full name is required";
        }
        if (!formData.vendorPhoneNumber.trim()) {
          newErrors.vendorPhoneNumber = "Vendor phone number is required";
        } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.vendorPhoneNumber)) {
          newErrors.vendorPhoneNumber = "Please enter a valid phone number";
        }
        if (!formData.vendorAddress.trim()) {
          newErrors.vendorAddress = "Vendor address is required";
        }
        if (!formData.vendorCountry.trim()) {
          newErrors.vendorCountry = "Vendor country is required";
        }
        if (!formData.vendorState.trim()) {
          newErrors.vendorState = "Vendor state is required";
        }
        if (!formData.vendorCity.trim()) {
          newErrors.vendorCity = "Vendor city is required";
        }
        if (!formData.vendorPostalCode.trim()) {
          newErrors.vendorPostalCode = "Vendor postal code is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }
    if (!formData.businessCategory.trim()) {
      newErrors.businessCategory = "Business category is required";
    }
    if (!formData.vendorFullName.trim()) {
      newErrors.vendorFullName = "Vendor full name is required";
    }
    if (!formData.businessPhoneNumber.trim()) {
      newErrors.businessPhoneNumber = "Business phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.businessPhoneNumber)) {
      newErrors.businessPhoneNumber = "Please enter a valid phone number";
    }
    if (!formData.vendorPhoneNumber.trim()) {
      newErrors.vendorPhoneNumber = "Vendor phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.vendorPhoneNumber)) {
      newErrors.vendorPhoneNumber = "Please enter a valid phone number";
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

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields correctly."
      );
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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
      const result = await registerUser(formData);

      if (!result.success) {
        Alert.alert(
          "Registration Failed",
          result.error || "Failed to create account. Please try again."
        );
        return;
      }

      // Success - call callback if provided
      if (onRegistrationSuccess && result.user) {
        onRegistrationSuccess(result.user);
      } else {
        Alert.alert(
          "Success",
          "Account created successfully! Your account is pending approval.",
          [{ text: "OK" }]
        );
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
    disabled = false,
    onSelect = null
  ) => {
    const hasError = errors[field];
    const selectedValue = formData[field];
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
                          onSelect
                            ? onSelect(item)
                            : handleDropdownSelect(field, value, display)
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
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <View key={index} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  index + 1 <= currentStep && styles.progressDotActive,
                ]}
              />
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    index + 1 < currentStep && styles.progressLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Form Fields - Step 1: Login Details */}
        {currentStep === 1 && (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Login Details</Text>
            {renderInputField(
              "email",
              "Email",
              "Enter your email address",
              "email-address",
              "none",
              "mail-outline"
            )}

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
          </View>
        )}

        {/* Form Fields - Step 2: Business Information */}
        {currentStep === 2 && (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Business Information</Text>
            {renderInputField(
              "businessName",
              "Business Name",
              "Enter your business name",
              "default",
              "words",
              "business-outline"
            )}

            {renderDropdownField(
              "businessCategory",
              "Business Category",
              "Select your business category",
              "grid-outline",
              businessCategories,
              showCategoryModal,
              setShowCategoryModal,
              (item) => item.value,
              (item) => item.label
            )}

            {renderDropdownField(
              "businessSubCategory",
              "Business Sub Category (Optional)",
              formData.businessCategory
                ? "Select your business sub category"
                : "Select category first",
              "list-outline",
              businessSubCategories,
              showSubCategoryModal,
              setShowSubCategoryModal,
              (item) => item.value,
              (item) => item.label,
              !formData.businessCategory
            )}
          </View>
        )}

        {/* Form Fields - Step 3: Business Address Information */}
        {currentStep === 3 && (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Business Address</Text>
            <Text style={styles.stepDescription}>
              Enter the address where your business/place is located
            </Text>
            {renderInputField(
              "address",
              "Address",
              "Enter your address",
              "default",
              "words",
              "home-outline"
            )}

            {renderDropdownField(
              "country",
              "Country",
              "Select your country",
              "globe-outline",
              countries,
              showCountryModal,
              setShowCountryModal,
              (item) => item.name,
              (item) => item.name,
              false,
              handleCountrySelect
            )}

            {renderDropdownField(
              "state",
              "State",
              formData.country ? "Select your state" : "Select country first",
              "map-outline",
              states,
              showStateModal,
              setShowStateModal,
              (item) => item.name,
              (item) => item.name,
              !formData.country,
              handleStateSelect
            )}

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
              !formData.state,
              handleCitySelect
            )}

            {renderInputField(
              "postalCode",
              "Postal Code",
              "Enter your postal code",
              "default",
              "characters",
              "mail-outline"
            )}

            {renderInputField(
              "businessPhoneNumber",
              "Business Phone Number",
              "Enter your business phone number",
              "phone-pad",
              "none",
              "call-outline"
            )}
          </View>
        )}

        {/* Form Fields - Step 4: Vendor/Business Owner Details */}
        {currentStep === 4 && (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Vendor Details</Text>
            <Text style={styles.stepDescription}>
              Enter your personal information and address
            </Text>
            {renderInputField(
              "vendorFullName",
              "Vendor Full Name",
              "Enter your full name",
              "default",
              "words",
              "person-outline"
            )}

            {renderInputField(
              "vendorPhoneNumber",
              "Vendor Phone Number",
              "Enter your vendor phone number",
              "phone-pad",
              "none",
              "call-outline"
            )}

            {/* Vendor Address Section */}
            <Text style={styles.sectionTitle}>Vendor Address</Text>
            {renderInputField(
              "vendorAddress",
              "Address",
              "Enter your address",
              "default",
              "words",
              "home-outline"
            )}

            {renderDropdownField(
              "vendorCountry",
              "Country",
              "Select your country",
              "globe-outline",
              countries,
              showVendorCountryModal,
              setShowVendorCountryModal,
              (item) => item.name,
              (item) => item.name,
              false,
              handleVendorCountrySelect
            )}

            {renderDropdownField(
              "vendorState",
              "State",
              formData.vendorCountry ? "Select your state" : "Select country first",
              "map-outline",
              vendorStates,
              showVendorStateModal,
              setShowVendorStateModal,
              (item) => item.name,
              (item) => item.name,
              !formData.vendorCountry,
              handleVendorStateSelect
            )}

            {renderDropdownField(
              "vendorCity",
              "City",
              formData.vendorState ? "Select your city" : "Select state first",
              "location-outline",
              vendorCities,
              showVendorCityModal,
              setShowVendorCityModal,
              (item) => item.name,
              (item) => item.name,
              !formData.vendorState,
              handleVendorCitySelect
            )}

            {renderInputField(
              "vendorPostalCode",
              "Postal Code",
              "Enter your postal code",
              "default",
              "characters",
              "mail-outline"
            )}
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 ? (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previousButtonPlaceholder} />
          )}
          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
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
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Text */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By creating an account, you agree to our{" "}
            <Text style={styles.footerLink}>Terms of Service</Text> and{" "}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.footerLink}>Login</Text>
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
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginTop: 24,
    marginBottom: 16,
  },
  formContainer: {
    marginBottom: 24,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  previousButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
    flex: 1,
    marginRight: 12,
    justifyContent: "center",
  },
  previousButtonPlaceholder: {
    flex: 1,
    marginRight: 12,
  },
  previousButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flex: 1,
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
    marginRight: 8,
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
    flex: 1,
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
    padding: 16,
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
  modalEmpty: {
    padding: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});

export default RegistrationPage;
