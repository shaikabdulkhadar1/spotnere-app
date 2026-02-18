import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const MapScreen = ({ onBack }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find places Nearby</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Coming Soon Message */}
      <View style={styles.content}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Image
              source={require("../assets/categoryImages/mapImg.png")}
              style={styles.emptyIconImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.emptyTitle}>Map view coming soon</Text>
        </View>
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
    paddingTop:
      Platform.OS === "ios" ? 80 : (StatusBar.currentHeight || 0) + 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 4,
    zIndex: 1,
  },
  homeButton: {
    padding: 4,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconImage: {
    width: 74,
    height: 74,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: fonts.semiBold,
  },
});

export default MapScreen;
