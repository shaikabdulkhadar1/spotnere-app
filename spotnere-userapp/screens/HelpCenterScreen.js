import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const { width } = Dimensions.get("window");

const HelpCenterScreen = ({ onBack }) => {
  const handleCall = async () => {
    try {
      const phoneNumber = "+1234567890";
      // Remove any spaces, parentheses, dashes, but keep + and digits
      const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");

      // Use tel: protocol to open phone dialer
      const url = `tel:${cleanNumber}`;

      // Try to open the phone dialer directly
      // On some platforms, canOpenURL might return false even if tel: is supported
      // So we'll try to open it anyway and catch errors
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          // Even if canOpenURL returns false, try opening anyway
          // tel: protocol is usually supported on mobile devices
          await Linking.openURL(url);
        }
      } catch (linkError) {
        // If tel: doesn't work, try telprompt: (iOS) or just tel: again
        if (Platform.OS === "ios") {
          const telPromptUrl = `telprompt:${cleanNumber}`;
          await Linking.openURL(telPromptUrl);
        } else {
          // For Android, tel: should work
          await Linking.openURL(url);
        }
      }
    } catch (error) {
      console.error("Error making phone call:", error);
      // Show the phone number so user can manually dial
      Alert.alert(
        "Unable to Open Phone",
        `Please call us at: +1 (234) 567-890`,
        [{ text: "OK" }]
      );
    }
  };

  const handleChat = () => {
    // TODO: Implement chat functionality
    // For now, we'll show an alert or open a chat interface
    console.log("Chat with us clicked");
    // You can integrate with a chat service like Intercom, Zendesk, etc.
  };

  const handleLinkPress = async (url, label) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log(`Don't know how to open URI: ${url}`);
      }
    } catch (error) {
      console.error(`Error opening ${label}:`, error);
    }
  };

  return (
    <View style={styles.container}>
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
        </View>

        {/* Help Icon Section */}
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-circle" size={60} color={colors.primary} />
          </View>
          <Text style={styles.title}>How can we help you?</Text>
          <Text style={styles.subtitle}>
            We're here to assist you with any questions or concerns
          </Text>
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() =>
                handleLinkPress("mailto:support@spotnere.com", "email")
              }
              activeOpacity={0.7}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons
                  name="mail"
                  size={24}
                  color={colors.primary}
                  style={styles.contactIcon}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>support@spotnere.com</Text>
                <Text style={styles.contactDescription}>
                  Send us an email and we'll respond within 24 hours
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={() =>
                handleLinkPress("https://www.spotnere.com", "website")
              }
              activeOpacity={0.7}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons
                  name="globe"
                  size={24}
                  color={colors.primary}
                  style={styles.contactIcon}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Website</Text>
                <Text style={styles.contactValue}>www.spotnere.com</Text>
                <Text style={styles.contactDescription}>
                  Visit our website for more information
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons
                  name="call"
                  size={24}
                  color={colors.primary}
                  style={styles.contactIcon}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>+1 (234) 567-890</Text>
                <Text style={styles.contactDescription}>
                  Call us during business hours
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Ionicons
                  name="time"
                  size={24}
                  color={colors.primary}
                  style={styles.contactIcon}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Business Hours</Text>
                <Text style={styles.contactValue}>Mon - Fri: 9 AM - 6 PM</Text>
                <Text style={styles.contactDescription}>
                  We're available Monday through Friday
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqCard}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>
                How do I reset my password?
              </Text>
              <Text style={styles.faqAnswer}>
                Go to Profile → Account → Password & Security to change your
                password.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>
                How do I save a favorite place?
              </Text>
              <Text style={styles.faqAnswer}>
                Tap the heart icon on any place card to add it to your
                favorites.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Can I cancel a booking?</Text>
              <Text style={styles.faqAnswer}>
                Yes, you can cancel bookings from the Bookings section in your
                profile.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call Us</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChat}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.chatButtonText}>Chat With Us</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
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
  iconSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: fonts.regular,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    fontFamily: fonts.regular,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    fontFamily: fonts.regular,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactIcon: {
    // Icon styling is handled by Ionicons props
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  contactDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: fonts.regular,
  },
  chatButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.regular,
  },
});

export default HelpCenterScreen;
