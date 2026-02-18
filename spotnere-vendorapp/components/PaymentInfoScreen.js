/**
 * Payment Info Screen Component
 * Displays vendor bank/payment details
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../config/supabase";

const PaymentInfoScreen = ({ onBack }) => {
  const { user } = useApp();
  const [paymentInfo, setPaymentInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
  });
  const [formErrors, setFormErrors] = React.useState({});

  React.useEffect(() => {
    const loadPaymentInfo = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("vendors")
          .select(
            "account_holder_name, account_number, ifsc_code, upi_id",
          )
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        const info = data || {};
        setPaymentInfo(info);
        setEditForm({
          account_holder_name: info.account_holder_name || "",
          account_number: info.account_number || "",
          ifsc_code: info.ifsc_code || "",
          upi_id: info.upi_id || "",
        });
      } catch (err) {
        console.error("Error loading payment info:", err);
        setError(err.message || "Failed to load payment info");
      } finally {
        setLoading(false);
      }
    };

    loadPaymentInfo();
  }, [user?.id]);

  const maskAccountNumber = (value) => {
    if (!value) return "Not added";
    const str = String(value);
    if (str.length <= 4) return str;
    return `•••• ${str.slice(-4)}`;
  };

  const handleInputChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!editForm.account_holder_name.trim()) {
      errors.account_holder_name = "Account holder name is required";
    }

    if (!editForm.account_number.trim()) {
      errors.account_number = "Account number is required";
    } else if (!/^\d{6,20}$/.test(editForm.account_number.trim())) {
      errors.account_number = "Enter a valid account number";
    }

    if (!editForm.ifsc_code.trim()) {
      errors.ifsc_code = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(editForm.ifsc_code.trim())) {
      errors.ifsc_code = "Enter a valid IFSC code";
    }

    if (!editForm.upi_id.trim()) {
      errors.upi_id = "UPI ID is required";
    } else if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(editForm.upi_id.trim())) {
      errors.upi_id = "Enter a valid UPI ID (e.g., name@paytm)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.id) {
      return;
    }
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      const updateData = {
        account_holder_name: editForm.account_holder_name.trim(),
        account_number: editForm.account_number.trim(),
        ifsc_code: editForm.ifsc_code.trim().toUpperCase(),
        upi_id: editForm.upi_id.trim(),
      };

      const { error: updateError } = await supabase
        .from("vendors")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setPaymentInfo(updateData);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating payment info:", err);
      setError(err.message || "Failed to update payment info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (paymentInfo) {
      setEditForm({
        account_holder_name: paymentInfo.account_holder_name || "",
        account_number: paymentInfo.account_number || "",
        ifsc_code: paymentInfo.ifsc_code || "",
        upi_id: paymentInfo.upi_id || "",
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const renderField = (label, value, options = {}) => {
    const display =
      options.type === "account"
        ? maskAccountNumber(value)
        : value || "Not added";

    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          style={[
            styles.fieldValue,
            !value && styles.fieldValuePlaceholder,
          ]}
          numberOfLines={1}
        >
          {display}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.title}>Payment Info</Text>
          </View>
          {onBack && <View style={styles.backButtonSpacer} />}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.title}>Payment Info</Text>
          </View>
          {onBack && <View style={styles.backButtonSpacer} />}
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
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
          <Text style={styles.title}>Payment Info</Text>
        </View>
        <View style={styles.headerRight}>
          {!isEditing && (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.editButton}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="card-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.iconTextContainer}>
              <Text style={styles.sectionTitle}>Bank Details</Text>
              <Text style={styles.sectionSubtitle}>
                These details are used to send your payouts.
              </Text>
            </View>
          </View>

          <View style={styles.fieldsContainer}>
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Account Holder Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.account_holder_name && styles.inputError,
                    ]}
                    value={editForm.account_holder_name}
                    onChangeText={(text) =>
                      handleInputChange("account_holder_name", text)
                    }
                    placeholder="Enter account holder name"
                    placeholderTextColor={colors.textSecondary}
                  />
                  {formErrors.account_holder_name && (
                    <Text style={styles.errorText}>
                      {formErrors.account_holder_name}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Account Number</Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.account_number && styles.inputError,
                    ]}
                    value={editForm.account_number}
                    onChangeText={(text) =>
                      handleInputChange("account_number", text)
                    }
                    placeholder="Enter account number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  {formErrors.account_number && (
                    <Text style={styles.errorText}>
                      {formErrors.account_number}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>IFSC Code</Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.ifsc_code && styles.inputError,
                    ]}
                    value={editForm.ifsc_code}
                    onChangeText={(text) =>
                      handleInputChange("ifsc_code", text.toUpperCase())
                    }
                    placeholder="Enter IFSC code (e.g., ABCD0123456)"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                  />
                  {formErrors.ifsc_code && (
                    <Text style={styles.errorText}>
                      {formErrors.ifsc_code}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>UPI ID</Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.upi_id && styles.inputError,
                    ]}
                    value={editForm.upi_id}
                    onChangeText={(text) =>
                      handleInputChange("upi_id", text)
                    }
                    placeholder="Enter UPI ID (e.g., name@paytm)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {formErrors.upi_id && (
                    <Text style={styles.errorText}>{formErrors.upi_id}</Text>
                  )}
                </View>
              </>
            ) : (
              <>
                {renderField(
                  "Account Holder Name",
                  paymentInfo?.account_holder_name,
                )}
                {renderField("Account Number", paymentInfo?.account_number, {
                  type: "account",
                })}
                {renderField("IFSC Code", paymentInfo?.ifsc_code)}
                {renderField("UPI ID", paymentInfo?.upi_id)}
              </>
            )}
          </View>

          {isEditing && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  backButtonSpacer: {
    width: 36,
  },
  headerContent: {
    flex: 1,
  },
  headerRight: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  editButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: 16,
    textAlign: "center",
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.badgeBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  fieldsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginRight: 12,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
  fieldValuePlaceholder: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.badgeBackground,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
  },
});

export default PaymentInfoScreen;

