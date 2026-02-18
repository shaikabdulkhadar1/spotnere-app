/**
 * Notifications Modal Component
 * Displays a single notification in a floating popup modal with tail
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const { width: screenWidth } = Dimensions.get("window");

const NotificationsModal = ({ visible, onClose, notificationButtonLayout }) => {
  // Sample notification - replace with actual data from API/context
  const notification = {
    id: 1,
    title: "New Booking Received",
    message:
      "You have received a new booking for Adventure Park. Check it out now!",
    type: "booking",
    action: "VIEW",
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "booking":
        return "calendar-outline";
      case "payment":
        return "cash-outline";
      case "review":
        return "star-outline";
      case "cancellation":
        return "close-circle-outline";
      case "info":
        return "information-circle-outline";
      default:
        return "notifications-outline";
    }
  };

  const handleActionPress = () => {
    // Handle action (e.g., navigate to booking)
    onClose();
  };

  // Calculate modal position based on notification button layout
  const getModalWrapperStyle = () => {
    if (!notificationButtonLayout) {
      return {
        position: "absolute",
        top: 70,
        right: 16,
        alignItems: "flex-end",
      };
    }
    return {
      position: "absolute",
      top: notificationButtonLayout.y + notificationButtonLayout.height + 8,
      right:
        screenWidth -
        notificationButtonLayout.x -
        notificationButtonLayout.width / 2,
      alignItems: "flex-end",
    };
  };

  // Calculate tail position to align with icon center
  const getTailStyle = () => {
    if (!notificationButtonLayout) {
      return {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: colors.cardBackground,
        marginRight: 24,
        marginBottom: -1,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      };
    }
    // Center the tail on the notification icon (which is centered in the button)
    const iconCenterOffset = notificationButtonLayout.width / 2 - 10;
    return {
      width: 0,
      height: 0,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderBottomWidth: 10,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: colors.cardBackground,
      marginRight: iconCenterOffset,
      marginBottom: -1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={getModalWrapperStyle()}>
          {/* Tail pointing upward */}
          <View style={getTailStyle()} />

          {/* Modal Container */}
          <View style={styles.modalContainer}>
            {/* Icon on the left */}
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <View style={styles.iconInnerCircle}>
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={28}
                    color={colors.primary}
                  />
                </View>
              </View>
            </View>

            {/* Content on the right */}
            <View style={styles.contentContainer}>
              <Text style={styles.message} numberOfLines={3}>
                {notification.message}
              </Text>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleActionPress}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>
                  {notification.action}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  modalContainer: {
    flexDirection: "row",
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    width: screenWidth * 0.85,
    maxWidth: 320,
    minHeight: 100,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: "flex-start",
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconInnerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
    flex: 1,
  },
  actionButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default NotificationsModal;
