/**
 * Notifications Modal Component
 * Displays the latest 2 notifications in a floating popup modal with tail
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const { width: screenWidth } = Dimensions.get("window");

const NotificationsModal = ({
  visible,
  onClose,
  notificationButtonLayout,
  notifications = [],
  onShowAll,
}) => {
  const latestNotifications = notifications.slice(0, 2);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "NEW_BOOKING":
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

  const handleNotificationPress = (notification) => {
    onClose();
  };

  const handleShowAll = () => {
    onClose();
    onShowAll?.();
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

  const formatTime = (createdAt) => {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
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

          {/* Modal Container - prevent tap from closing when pressing inside */}
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            {latestNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-off-outline"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {latestNotifications.map((notification, index) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      index < latestNotifications.length - 1 &&
                        styles.notificationItemBorder,
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <View style={styles.iconWrapper}>
                        <View style={styles.iconInnerCircle}>
                          <Ionicons
                            name={getNotificationIcon(notification.type)}
                            size={24}
                            color={colors.primary}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={styles.contentContainer}>
                      <Text style={styles.title} numberOfLines={1}>
                        {notification.title}
                      </Text>
                      <Text style={styles.message} numberOfLines={2}>
                        {notification.body}
                      </Text>
                      <Text style={styles.timeText}>
                        {formatTime(notification.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Show all button */}
            <TouchableOpacity
              style={styles.showAllButton}
              onPress={handleShowAll}
              activeOpacity={0.7}
            >
              <Text style={styles.showAllButtonText}>Show all</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          </TouchableOpacity>
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
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    width: screenWidth * 0.85,
    maxWidth: 320,
    maxHeight: 280,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollView: {
    maxHeight: 220,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  notificationItem: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  notificationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: "flex-start",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconInnerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  timeText: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  showAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  showAllButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});

export default NotificationsModal;
