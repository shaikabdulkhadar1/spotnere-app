/**
 * Reviews Screen Component
 * Displays all reviews for the place
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useApp } from "../contexts/AppContext";

const ReviewsScreen = ({ onBack }) => {
  const { user, reviewsData, loadReviews } = useApp();

  React.useEffect(() => {
    if (user?.place_id) {
      loadReviews();
    }
  }, [user?.place_id, loadReviews]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />,
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={16}
          color="#CCCCCC"
        />,
      );
    }

    return stars;
  };

  const renderReviewItem = ({ item }) => {
    const userName =
      item.user?.first_name || item.user?.last_name
        ? `${item.user.first_name || ""} ${
            item.user.last_name || ""
          }`.trim()
        : item.user?.email || "Anonymous";

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewUserInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.reviewUserDetails}>
              <Text style={styles.reviewUserName}>{userName}</Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            {renderStars(item.rating || 0)}
            <Text style={styles.ratingText}>
              {item.rating?.toFixed(1) || "0.0"}
            </Text>
          </View>
        </View>
        {item.review && (
          <Text style={styles.reviewComment}>{item.review}</Text>
        )}
      </View>
    );
  };

  if (reviewsData.loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Reviews</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (reviewsData.error) {
    const error = reviewsData.error;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Reviews</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReviews}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const reviews = reviewsData.reviews || [];
  const averageRating =
    reviewsData.summary?.average != null ? reviewsData.summary.average : 0;

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
          <Text style={styles.title}>Reviews</Text>
          <Text style={styles.subtitle}>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </Text>
        </View>
      </View>

      {/* Summary Card */}
      {reviews.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            <View style={styles.summaryStars}>
              {renderStars(averageRating)}
            </View>
            <Text style={styles.summaryText}>
              Based on {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </Text>
          </View>
        </View>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="star-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Reviews from customers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item, index) =>
            item.user_id ? `${item.user_id}-${index}` : String(index)
          }
          contentContainerStyle={styles.reviewsList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
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
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 10,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContent: {
    alignItems: "center",
  },
  averageRating: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
  },
  summaryStars: {
    flexDirection: "row",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  reviewsList: {
    padding: 10,
    paddingBottom: 100,
  },
  reviewCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginLeft: 6,
  },
  reviewComment: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});

export default ReviewsScreen;
