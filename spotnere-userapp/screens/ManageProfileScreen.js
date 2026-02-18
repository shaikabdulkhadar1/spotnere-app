import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { supabase } from "../config/supabase";
import { updateUserData, getCurrentUser } from "../utils/auth";
import { Country, State, City } from "country-state-city";

const { width, height } = Dimensions.get("window");

const ManageProfileScreen = ({ userData: initialUserData, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState(initialUserData);
  const [formData, setFormData] = useState({
    firstName: initialUserData?.firstName || "",
    lastName: initialUserData?.lastName || "",
    email: initialUserData?.email || "",
    phoneNumber: initialUserData?.phoneNumber || "",
    address: initialUserData?.address?.address || "",
    city: initialUserData?.address?.city || "",
    state: initialUserData?.address?.state || "",
    country: initialUserData?.address?.country || "",
    postalCode: initialUserData?.address?.postalCode || "",
  });

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

  useEffect(() => {
    if (initialUserData) {
      setUserData(initialUserData);
      setFormData({
        firstName: initialUserData?.firstName || "",
        lastName: initialUserData?.lastName || "",
        email: initialUserData?.email || "",
        phoneNumber: initialUserData?.phoneNumber || "",
        address: initialUserData?.address?.address || "",
        city: initialUserData?.address?.city || "",
        state: initialUserData?.address?.state || "",
        country: initialUserData?.address?.country || "",
        postalCode: initialUserData?.address?.postalCode || "",
      });
    }
  }, [initialUserData]);

  // Generate initials from first name and last name
  const getInitials = (firstName, lastName) => {
    const firstInitial =
      firstName && firstName.length > 0
        ? firstName.charAt(0).toUpperCase()
        : "";
    const lastInitial =
      lastName && lastName.length > 0 ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}` || "U";
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original user data
    setFormData({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      phoneNumber: userData?.phoneNumber || "",
      address: userData?.address?.address || "",
      city: userData?.address?.city || "",
      state: userData?.address?.state || "",
      country: userData?.address?.country || "",
      postalCode: userData?.address?.postalCode || "",
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!userData?.id) {
        Alert.alert("Error", "User ID not found");
        return;
      }

      // Update user in Supabase
      const { error: updateError } = await supabase
        .from("users")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postal_code: formData.postalCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.id);

      if (updateError) {
        console.error("❌ Error updating user:", updateError);
        Alert.alert("Error", updateError.message || "Failed to update profile");
        return;
      }

      // Format updated user data
      const updatedUserData = {
        ...userData,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postalCode: formData.postalCode,
        },
      };

      // Update local storage
      await updateUserData(updatedUserData);

      // Update state
      setUserData(updatedUserData);
      setIsEditing(false);

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const renderInfoRow = (label, value, icon, fieldKey) => {
    if (isEditing && fieldKey) {
      return (
        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <Ionicons name={icon} size={20} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>{label}</Text>
          </View>
          <TextInput
            style={styles.infoInput}
            value={formData[fieldKey] || ""}
            onChangeText={(text) =>
              setFormData({ ...formData, [fieldKey]: text })
            }
            placeholder="Not provided"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      );
    }
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoRowLeft}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value || "Not provided"}</Text>
      </View>
    );
  };

  const renderDropdownRow = (
    label,
    value,
    icon,
    fieldKey,
    options,
    onSelect
  ) => {
    if (isEditing && fieldKey) {
      const selectedOption = options.find(
        (opt) => opt.isoCode === value || opt.name === value
      );
      return (
        <TouchableOpacity
          style={styles.infoRow}
          onPress={onSelect}
          activeOpacity={0.7}
        >
          <View style={styles.infoRowLeft}>
            <Ionicons name={icon} size={20} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>{label}</Text>
          </View>
          <Text style={styles.infoValue}>
            {selectedOption?.name || value || "Select"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoRowLeft}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value || "Not provided"}</Text>
      </View>
    );
  };

  const renderDropdownModal = (title, data, onSelect, visible, onClose) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item.isoCode || item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
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
        <Text style={styles.headerTitle}>Manage Profile</Text>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={20} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Avatar Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(userData?.firstName || "", userData?.lastName || "")}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>{userData?.name || "User"}</Text>
        <Text style={styles.userEmail}>{userData?.email || ""}</Text>
      </View>

      {/* Personal Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          {renderInfoRow(
            "First Name",
            userData?.firstName,
            "person-outline",
            "firstName"
          )}
          {renderInfoRow(
            "Last Name",
            userData?.lastName,
            "person-outline",
            "lastName"
          )}
          {renderInfoRow("Email", userData?.email, "mail-outline", "email")}
          {renderInfoRow(
            "Phone Number",
            userData?.phoneNumber,
            "call-outline",
            "phoneNumber"
          )}
        </View>
      </View>

      {/* Address Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address Information</Text>
        <View style={styles.infoCard}>
          {renderInfoRow(
            "Address",
            userData?.address?.address,
            "home-outline",
            "address"
          )}
          {renderDropdownRow(
            "Country",
            formData.country || userData?.address?.country,
            "globe-outline",
            "country",
            countries,
            () => setShowCountryModal(true)
          )}
          {renderDropdownRow(
            "State",
            formData.state || userData?.address?.state,
            "location-outline",
            "state",
            states,
            () => setShowStateModal(true)
          )}
          {renderDropdownRow(
            "City",
            formData.city || userData?.address?.city,
            "location-outline",
            "city",
            cities,
            () => setShowCityModal(true)
          )}
          {renderInfoRow(
            "Postal Code",
            userData?.address?.postalCode,
            "mail-outline",
            "postalCode"
          )}
        </View>
      </View>

      {/* Save/Cancel Buttons - Only show when editing */}
      {isEditing && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.cancelButtonBottom}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonTextBottom}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButtonBottom}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonTextBottom}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Dropdown Modals */}
      {renderDropdownModal(
        "Select Country",
        countries,
        (item) => {
          setFormData({
            ...formData,
            country: item.isoCode,
            state: "", // Reset state when country changes
            city: "", // Reset city when country changes
          });
        },
        showCountryModal,
        () => setShowCountryModal(false)
      )}

      {renderDropdownModal(
        "Select State",
        states,
        (item) => {
          setFormData({
            ...formData,
            state: item.isoCode,
            city: "", // Reset city when state changes
          });
        },
        showStateModal,
        () => setShowStateModal(false)
      )}

      {renderDropdownModal(
        "Select City",
        cities,
        (item) => {
          setFormData({
            ...formData,
            city: item.name,
          });
        },
        showCityModal,
        () => setShowCityModal(false)
      )}
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
    flexDirection: "row",
    justifyContent: "space-between",
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
    flex: 1,
    textAlign: "center",
  },
  editButton: {
    position: "absolute",
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 10,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 4,
    fontFamily: fonts.regular,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 24,
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.cardBackground,
  },
  userName: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.text,
    marginLeft: 12,
    fontFamily: fonts.regular,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "right",
    flex: 1,
    fontFamily: fonts.regular,
  },
  infoInput: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    textAlign: "right",
    flex: 1,
    fontFamily: fonts.regular,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
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
    maxHeight: height * 0.7,
    paddingBottom: 20,
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
    fontWeight: "600",
    color: colors.text,
    fontFamily: fonts.regular,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  cancelButtonBottom: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  cancelButtonTextBottom: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  saveButtonBottom: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonTextBottom: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: fonts.regular,
  },
});

export default ManageProfileScreen;
