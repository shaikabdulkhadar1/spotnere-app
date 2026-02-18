/**
 * Help Center Screen Component
 * Displays help information, contact details, and FAQs
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const HelpCenterScreen = ({ onBack }) => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:support@spotnere.com").catch((err) =>
      console.error("Error opening email:", err)
    );
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://www.spotnere.com").catch((err) =>
      console.error("Error opening website:", err)
    );
  };

  const handlePhonePress = () => {
    Linking.openURL("tel:+1234567890").catch((err) =>
      console.error("Error opening phone:", err)
    );
  };

  const handleCallUsPress = () => {
    handlePhonePress();
  };

  const handleChatPress = () => {
    Alert.alert("Chat", "Chat feature coming soon!");
  };

  const renderContactItem = (
    iconName,
    title,
    detail,
    description,
    onPress,
    showArrow = true
  ) => {
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={onPress}
        activeOpacity={showArrow ? 0.7 : 1}
        disabled={!showArrow}
      >
        <View style={styles.contactIconContainer}>
          <View style={styles.contactIconWrapper}>
            <Ionicons name={iconName} size={20} color={colors.primary} />
          </View>
        </View>
        <View style={styles.contactContent}>
          <Text style={styles.contactTitle}>{title}</Text>
          <Text style={styles.contactDetail}>{detail}</Text>
          <Text style={styles.contactDescription}>{description}</Text>
        </View>
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        )}
      </TouchableOpacity>
    );
  };

  const faqs = [
    {
      question: "How do I reset my password?",
      answer:
        "Go to Profile → Account → Password & Security to change your password.",
    },
    {
      question: "How do I save a favorite place?",
      answer:
        "Tap the heart icon on any place card to add it to your favorites.",
    },
    {
      question: "Can I cancel a booking?",
      answer:
        "Yes, you can cancel bookings from the Bookings section in your profile.",
    },
  ];

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
          <View style={styles.headerIconContainer}>
            <View style={styles.headerIconCircle}>
              <Text style={styles.headerIconText}>?</Text>
            </View>
          </View>
          <Text style={styles.title}>How can we help you?</Text>
          <Text style={styles.subtitle}>
            We're here to assist you with any questions or concerns
          </Text>
        </View>
        {/* Spacer to balance the back button */}
        {onBack && <View style={styles.backButtonSpacer} />}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.sectionCard}>
            {renderContactItem(
              "mail-outline",
              "Email",
              "support@spotnere.com",
              "Send us an email and we'll respond within 24 hours",
              handleEmailPress
            )}
            <View style={styles.divider} />
            {renderContactItem(
              "globe-outline",
              "Website",
              "www.spotnere.com",
              "Visit our website for more information",
              handleWebsitePress
            )}
            <View style={styles.divider} />
            {renderContactItem(
              "call-outline",
              "Phone",
              "+1 (234) 567-890",
              "Call us during business hours",
              handlePhonePress
            )}
            <View style={styles.divider} />
            {renderContactItem(
              "time-outline",
              "Business Hours",
              "Mon - Fri: 9 AM - 6 PM",
              "We're available Monday through Friday",
              null,
              false
            )}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.sectionCard}>
            {faqs.map((faq, index) => (
              <View key={index}>
                <View style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
                {index < faqs.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallUsPress}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
          <Text style={styles.callButtonText}>Call Us</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.chatButtonText}>Chat With Us</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: "center",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  backButton: {
    position: "absolute",
    left: 10,
    top: 20,
    padding: 4,
  },
  backButtonSpacer: {
    width: 32,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  headerIconText: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
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
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  contactIconContainer: {
    marginRight: 12,
  },
  contactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  faqItem: {
    paddingVertical: 4,
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 12,
  },
  callButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});

export default HelpCenterScreen;
