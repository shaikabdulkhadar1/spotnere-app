/**
 * Manage Profile Screen Component
 * Displays and allows editing of vendor profile details
 */

import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../config/supabase";
import { Country, State, City } from "country-state-city";

const ManageProfileScreen = ({ onBack }) => {
  const { user, refreshData } = useApp();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({});
  const [showCountryModal, setShowCountryModal] = React.useState(false);
  const [showStateModal, setShowStateModal] = React.useState(false);
  const [showCityModal, setShowCityModal] = React.useState(false);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = React.useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = React.useState("");
  const [selectedStateCode, setSelectedStateCode] = React.useState("");
  // Vendor address modal states
  const [showVendorCountryModal, setShowVendorCountryModal] = React.useState(false);
  const [showVendorStateModal, setShowVendorStateModal] = React.useState(false);
  const [showVendorCityModal, setShowVendorCityModal] = React.useState(false);
  const [selectedVendorCountryCode, setSelectedVendorCountryCode] = React.useState("");
  const [selectedVendorStateCode, setSelectedVendorStateCode] = React.useState("");

  const businessCategories = [
    "Sports",
    "Adventure",
    "Parks",
    "Staycation",
    "Tickets to Event",
    "Exclusive",
  ];

  const businessSubCategories = {
    Sports: ["Football", "Basketball", "Tennis", "Swimming", "Golf", "Cricket"],
    Adventure: [
      "Hiking",
      "Rock Climbing",
      "Water Sports",
      "Skydiving",
      "Bungee Jumping",
      "Paragliding",
    ],
    Parks: [
      "National Park",
      "Theme Park",
      "Amusement Park",
      "Water Park",
      "Wildlife Park",
    ],
    Staycation: ["Resort", "Hotel", "Villa", "Cabin", "Beach House"],
    "Tickets to Event": [
      "Concert",
      "Sports Event",
      "Theater",
      "Festival",
      "Conference",
    ],
    Exclusive: ["VIP Access", "Private Tour", "Luxury Experience"],
  };

  const initializeFormData = useCallback((vendorData) => {
    setEditFormData({
      business_name: vendorData.business_name || "",
      vendor_full_name: vendorData.vendor_full_name || "",
      vendor_phone_number: vendorData.vendor_phone_number || "",
      vendor_email: vendorData.vendor_email || "",
      // Vendor address fields
      vendor_address: vendorData.vendor_address || "",
      vendor_city: vendorData.vendor_city || "",
      vendor_state: vendorData.vendor_state || "",
      vendor_country: vendorData.vendor_country || "",
      vendor_postal_code: vendorData.vendor_postal_code || "",
    });
  }, []);

  const loadVendorData = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      // Fetch vendor details ONLY from vendors table
      // NOTE: business_phone_number is stored in places table, not vendors table
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select(
          "id, business_name, vendor_full_name, vendor_phone_number, vendor_email, vendor_address, vendor_city, vendor_state, vendor_country, vendor_postal_code"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching vendor data:", error);
        // Fallback to user data from context if fetch fails
        if (user) {
          initializeFormData(user);
        }
        return;
      }

      if (vendorData) {
        // Initialize form data with vendor data from vendors table
        initializeFormData(vendorData);
      }
    } catch (error) {
      console.error("Error loading vendor data:", error);
      // Fallback to user data from context if fetch fails
      if (user) {
        initializeFormData(user);
      }
    }
  }, [user, initializeFormData]);

  React.useEffect(() => {
    if (user?.id) {
      loadVendorData();
    }
  }, [user?.id, loadVendorData]);

  React.useEffect(() => {
    if (!isEditing) return;
    // Business address country/state codes
    const countryCode =
      Country.getAllCountries().find(
        (item) => item.name === editFormData.country
      )?.isoCode || "";
    setSelectedCountryCode(countryCode);
    if (!countryCode) {
      setSelectedStateCode("");
    } else {
      const stateCode =
        State.getStatesOfCountry(countryCode).find(
          (item) => item.name === editFormData.state
        )?.isoCode || "";
      setSelectedStateCode(stateCode);
    }
    // Vendor address country/state codes
    const vendorCountryCode =
      Country.getAllCountries().find(
        (item) => item.name === editFormData.vendor_country
      )?.isoCode || "";
    setSelectedVendorCountryCode(vendorCountryCode);
    if (!vendorCountryCode) {
      setSelectedVendorStateCode("");
    } else {
      const vendorStateCode =
        State.getStatesOfCountry(vendorCountryCode).find(
          (item) => item.name === editFormData.vendor_state
        )?.isoCode || "";
      setSelectedVendorStateCode(vendorStateCode);
    }
  }, [editFormData.country, editFormData.state, editFormData.vendor_country, editFormData.vendor_state, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = async () => {
    // Reset form data by fetching fresh vendor data from vendors table
    await loadVendorData();
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User information not available");
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        business_name: editFormData.business_name || null,
        vendor_full_name: editFormData.vendor_full_name || null,
        vendor_phone_number: editFormData.vendor_phone_number || null,
        vendor_email: editFormData.vendor_email || null,
        // Vendor address fields
        vendor_address: editFormData.vendor_address || null,
        vendor_city: editFormData.vendor_city || null,
        vendor_state: editFormData.vendor_state || null,
        vendor_country: editFormData.vendor_country || null,
        vendor_postal_code: editFormData.vendor_postal_code || null,
      };

      const { error } = await supabase
        .from("vendors")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Profile updated successfully");
      setIsEditing(false);
      // Refresh user data
      await refreshData();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableField = (
    label,
    fieldKey,
    placeholder = "Add details",
    keyboardType = "default",
    editable = true
  ) => {
    const value = editFormData[fieldKey] || "";
    const displayValue = value || placeholder;

    if (!isEditing) {
      return (
        <View style={styles.detailItem}>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text
              style={[
                styles.detailValue,
                !value && styles.detailValuePlaceholder,
              ]}
            >
              {displayValue}
            </Text>
          </View>
        </View>
      );
    }

    if (!editable) {
      return (
        <View style={styles.detailItem}>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, styles.detailValueDisabled]}>
              {displayValue}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.detailItem}>
        <View style={styles.detailTextContainer}>
          <Text style={styles.detailLabel}>{label}</Text>
          <TextInput
            style={styles.detailInput}
            value={value}
            onChangeText={(text) =>
              setEditFormData({ ...editFormData, [fieldKey]: text })
            }
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType={keyboardType}
          />
        </View>
      </View>
    );
  };

  const renderVendorLocationDropdown = (label, fieldKey, type) => {
    const value = editFormData[fieldKey] || "";
    const displayValue = value || "Add details";
    const isModalVisible =
      type === "country"
        ? showVendorCountryModal
        : type === "state"
        ? showVendorStateModal
        : showVendorCityModal;

    const setModalVisible = (visible) => {
      if (type === "country") {
        setShowVendorCountryModal(visible);
      } else if (type === "state") {
        setShowVendorStateModal(visible);
      } else {
        setShowVendorCityModal(visible);
      }
    };

    if (!isEditing) {
      return (
        <View style={styles.detailItem}>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text
              style={[
                styles.detailValue,
                !value && styles.detailValuePlaceholder,
              ]}
            >
              {displayValue}
            </Text>
          </View>
        </View>
      );
    }

    let options = [];
    if (type === "country") {
      options = Country.getAllCountries().map((c) => ({
        label: c.name,
        value: c.name,
        code: c.isoCode,
      }));
    } else if (type === "state") {
      if (selectedVendorCountryCode) {
        options = State.getStatesOfCountry(selectedVendorCountryCode).map((s) => ({
          label: s.name,
          value: s.name,
          code: s.isoCode,
        }));
      }
    } else if (type === "city") {
      if (selectedVendorStateCode && selectedVendorCountryCode) {
        options = City.getCitiesOfState(
          selectedVendorCountryCode,
          selectedVendorStateCode
        ).map((c) => ({
          label: c.name,
          value: c.name,
        }));
      }
    }

    return (
      <View style={styles.detailItem}>
        <View style={styles.detailTextContainer}>
          <Text style={styles.detailLabel}>{label}</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.dropdownButton}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                !value && styles.dropdownButtonTextPlaceholder,
              ]}
            >
              {displayValue}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {label}</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item, index) =>
                  `${item.value || item.label}-${index}`
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      if (type === "country" && item.code) {
                        setSelectedVendorCountryCode(item.code);
                        // Reset state and city when country changes
                        setEditFormData({
                          ...editFormData,
                          [fieldKey]: item.value || item.label,
                          vendor_state: "",
                          vendor_city: "",
                        });
                      } else if (type === "state" && item.code) {
                        setSelectedVendorStateCode(item.code);
                        // Reset city when state changes
                        setEditFormData({
                          ...editFormData,
                          [fieldKey]: item.value || item.label,
                          vendor_city: "",
                        });
                      } else {
                        setEditFormData({
                          ...editFormData,
                          [fieldKey]: item.value || item.label,
                        });
                      }
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {item.label || item.value}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderCategoryDropdown = (label, fieldKey, isSubCategory = false) => {
    const value = editFormData[fieldKey] || "";
    const displayValue = value || "Add details";
    const isModalVisible = isSubCategory
      ? showSubCategoryModal
      : showCategoryModal;

    const setModalVisible = (visible) => {
      if (isSubCategory) {
        setShowSubCategoryModal(visible);
      } else {
        setShowCategoryModal(visible);
      }
    };

    if (!isEditing) {
      return (
        <View style={styles.detailItem}>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text
              style={[
                styles.detailValue,
                !value && styles.detailValuePlaceholder,
              ]}
            >
              {displayValue}
            </Text>
          </View>
        </View>
      );
    }

    let options = [];
    if (isSubCategory) {
      const category = editFormData.business_category;
      if (category && businessSubCategories[category]) {
        options = businessSubCategories[category].map((sub) => ({
          label: sub,
          value: sub,
        }));
      }
    } else {
      options = businessCategories.map((cat) => ({
        label: cat,
        value: cat,
      }));
    }

    return (
      <View style={styles.detailItem}>
        <View style={styles.detailTextContainer}>
          <Text style={styles.detailLabel}>{label}</Text>
          <TouchableOpacity
            onPress={() => {
              if (isSubCategory && !editFormData.business_category) {
                Alert.alert(
                  "Select Category First",
                  "Please select a business category first"
                );
                return;
              }
              setModalVisible(true);
            }}
            style={styles.dropdownButton}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                !value && styles.dropdownButtonTextPlaceholder,
              ]}
            >
              {displayValue}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {label}</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item, index) =>
                  `${item.value || item.label}-${index}`
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      const newData = {
                        ...editFormData,
                        [fieldKey]: item.value || item.label,
                      };
                      // If changing category, reset sub_category
                      if (!isSubCategory) {
                        newData.business_sub_category = "";
                      }
                      setEditFormData(newData);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {item.label || item.value}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Manage Profile</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No user data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Manage Profile</Text>
        </View>
        {!isEditing && (
          <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Details */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.sectionCard}>
            {renderEditableField("Business Name", "business_name")}
            <View style={styles.divider} />
            {renderEditableField(
              "Vendor Email",
              "vendor_email",
              "Add email",
              "email-address"
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Information</Text>
          <View style={styles.sectionCard}>
            {renderEditableField("Vendor Full Name", "vendor_full_name")}
            <View style={styles.divider} />
            {renderEditableField(
              "Vendor Phone Number",
              "vendor_phone_number",
              "Add phone number",
              "phone-pad"
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Address</Text>
          <View style={styles.sectionCard}>
            {renderVendorLocationDropdown("Country", "vendor_country", "country")}
            <View style={styles.divider} />
            {renderVendorLocationDropdown("State", "vendor_state", "state")}
            <View style={styles.divider} />
            {renderVendorLocationDropdown("City", "vendor_city", "city")}
            <View style={styles.divider} />
            {renderEditableField(
              "Postal Code",
              "vendor_postal_code",
              "Add postal code"
            )}
            <View style={styles.divider} />
            {renderEditableField(
              "Address",
              "vendor_address",
              "Add address"
            )}
          </View>
        </View>

        {/* Action Buttons - Only show when editing */}
        {isEditing && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveButton}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  editButton: {
    padding: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailItem: {
    paddingVertical: 16,
    minHeight: 60,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  detailValuePlaceholder: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  detailValueDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  detailInput: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 10,
    marginRight: 10,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  dropdownButtonText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  dropdownButtonTextPlaceholder: {
    color: colors.textSecondary,
    fontStyle: "italic",
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
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});

export default ManageProfileScreen;
