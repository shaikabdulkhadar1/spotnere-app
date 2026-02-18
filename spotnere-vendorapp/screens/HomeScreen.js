/**
 * HomeScreen (Redesigned Vendor Dashboard)
 * - Cleaner header + quick stat chips
 * - Revenue card with modern graph (NO X/Y axis labels)
 * - Compact metric cards (Bookings / Rating / Avg. Price)
 * - Keeps your existing data flow (useApp)
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useApp } from "../contexts/AppContext";
import NotificationsModal from "../components/NotificationsModal";

const { width: screenWidth } = Dimensions.get("window");

const currencyCompact = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const num = Number(n);
  if (num >= 1000000) return `₹${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${Math.round(num)}`;
};

const getTrendMeta = (pct) => {
  const p = Number(pct || 0);
  if (p === 0) return { icon: "remove", color: colors.textSecondary };
  if (p > 0) return { icon: "trending-up", color: colors.success };
  return { icon: "trending-down", color: colors.error };
};

const HomeScreen = ({ onNavigateToBookings, onNavigateToReviews }) => {
  const {
    user,
    bookingsData,
    placeData,
    reviewsData,
    loadHomeScreenData,
    loadReviews,
  } = useApp();

  const [revenueTimeRange, setRevenueTimeRange] = React.useState("Past month");
  const [revenueData, setRevenueData] = React.useState(null);
  const [selectedDataPoint, setSelectedDataPoint] = React.useState(null);

  const [showNotificationsModal, setShowNotificationsModal] =
    React.useState(false);

  const notificationButtonRef = React.useRef(null);
  const [notificationButtonLayout, setNotificationButtonLayout] =
    React.useState(null);

  React.useEffect(() => {
    loadHomeScreenData();
  }, [loadHomeScreenData]);

  React.useEffect(() => {
    if (user?.place_id) loadReviews();
  }, [user?.place_id, loadReviews]);

  const ratingAverage =
    reviewsData.summary?.average != null ? reviewsData.summary.average : 0;
  const ratingCount =
    reviewsData.summary?.count != null ? reviewsData.summary.count : 0;
  const ratingLoading = reviewsData.loading;

  const generateRevenueData = React.useCallback((timeRange) => {
    let labels = [];
    let data = [];
    let totalRevenue = 0;
    let trendPercentage = 0;

    const now = new Date();
    const maxDataPoints = 8;

    switch (timeRange) {
      case "Today": {
        const hoursPerPoint = 24 / maxDataPoints;
        labels = Array.from({ length: maxDataPoints }, (_, i) => {
          const hour = Math.floor(i * hoursPerPoint);
          return hour.toString().padStart(2, "0") + ":00";
        });
        data = Array.from(
          { length: maxDataPoints },
          () => Math.random() * 2000 + 500,
        );
        break;
      }
      case "Past week": {
        labels = Array.from({ length: maxDataPoints }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (maxDataPoints - 1 - i));
          return date.toLocaleDateString("en-US", { weekday: "short" });
        });
        data = Array.from(
          { length: maxDataPoints },
          () => Math.random() * 2000 + 1000,
        );
        break;
      }
      case "Past month": {
        labels = Array.from(
          { length: maxDataPoints },
          (_, i) => `Week ${i + 1}`,
        );
        data = Array.from(
          { length: maxDataPoints },
          () => Math.random() * 2000 + 1500,
        );
        break;
      }
      case "Past Year": {
        labels = Array.from({ length: maxDataPoints }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (maxDataPoints - 1 - i) * 2);
          return date.toLocaleDateString("en-US", { month: "short" });
        });
        data = Array.from(
          { length: maxDataPoints },
          () => Math.random() * 2000 + 2000,
        );
        break;
      }
      default: {
        labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        data = [1200, 1500, 1400, 1600, 1800, 1700];
      }
    }

    totalRevenue = data.reduce((sum, v) => sum + v, 0);
    trendPercentage = ((data[data.length - 1] - data[0]) / data[0]) * 100;

    setRevenueData({
      labels,
      datasets: [{ data }],
      totalRevenue,
      trendPercentage,
      yAxisMax: 2500,
    });
  }, []);

  React.useEffect(() => {
    generateRevenueData(revenueTimeRange);
  }, [revenueTimeRange, generateRevenueData]);

  const handleMetricPress = (title, subtitle) => Alert.alert(title, subtitle);

  const handleNotificationPress = () => setShowNotificationsModal(true);

  const rangeLabel =
    revenueTimeRange === "Today"
      ? new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : revenueTimeRange === "Past week"
        ? "Last 7 days"
        : revenueTimeRange === "Past month"
          ? "Last 4 weeks"
          : "Last 12 months";

  const trendMeta = getTrendMeta(revenueData?.trendPercentage);

  // Chart config: NO X axis, NO Y axis labels
  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: () => colors.primary,
    labelColor: () => "transparent", // hides axis label text color
    formatXLabel: () => "", // <-- hide X labels
    formatYLabel: () => "", // <-- hide Y labels
    propsForLabels: { fontSize: 0 }, // extra guard
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: colors.primary,
      fill: colors.cardBackground,
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: colors.border,
      strokeWidth: 1,
    },
    style: { borderRadius: 16 },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.businessName}>
            {user?.business_name || "Vendor"}
          </Text>
          <Text style={styles.subtext}>
            Here’s what’s happening with your venue
          </Text>

          {/* Quick chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Ionicons name="calendar-outline" size={14} color={colors.text} />
              <Text style={styles.chipText}>
                Today: {bookingsData?.loading ? "—" : bookingsData?.today || 0}
              </Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="star-outline" size={14} color={colors.text} />
              <Text style={styles.chipText}>
                {ratingLoading ? "—" : ratingAverage.toFixed(1)} ({ratingCount})
              </Text>
            </View>
          </View>
        </View>

        <View
          ref={notificationButtonRef}
          onLayout={() => {
            notificationButtonRef.current?.measureInWindow((x, y, w, h) => {
              setNotificationButtonLayout({ x, y, width: w, height: h });
            });
          }}
        >
          <TouchableOpacity
            onPress={handleNotificationPress}
            style={styles.notificationButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.cardBackground, colors.surface]}
              style={styles.notificationBtnInner}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.text}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* REVENUE */}
      <View style={styles.card}>
        <View style={styles.revenueTop}>
          <View>
            <Text style={styles.cardTitle}>Revenue</Text>
            <Text style={styles.cardSubtitle}>{rangeLabel}</Text>
          </View>

          <View style={styles.revenueRight}>
            <View style={styles.trendPill}>
              <Ionicons
                name={trendMeta.icon}
                size={14}
                color={trendMeta.color}
              />
              <Text style={[styles.trendText, { color: trendMeta.color }]}>
                {revenueData
                  ? Math.abs(revenueData.trendPercentage).toFixed(1)
                  : "—"}
                %
              </Text>
            </View>
            <Text style={styles.revenueTotal}>
              {currencyCompact(revenueData?.totalRevenue)}
            </Text>
          </View>
        </View>

        <View style={styles.chartWrap}>
          {revenueData ? (
            <>
              <LineChart
                data={revenueData}
                width={screenWidth - 32 + 56} // widen chart
                height={210}
                fromZero
                segments={5}
                withVerticalLabels={false} // hide X labels
                withHorizontalLabels={false} // hide Y labels
                withVerticalLines={false}
                withOuterLines={false}
                chartConfig={chartConfig}
                bezier
                style={{ marginLeft: -56 }}
                onDataPointClick={(dp) => {
                  setSelectedDataPoint({
                    value: Math.round(dp.value),
                    index: dp.index,
                    label: revenueData.labels[dp.index],
                  });
                  setTimeout(() => setSelectedDataPoint(null), 2500);
                }}
              />

              {selectedDataPoint && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipLabel}>
                    {selectedDataPoint.label}
                  </Text>
                  <Text style={styles.tooltipValue}>
                    ₹{selectedDataPoint.value.toLocaleString()}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.chartLoadingText}>Loading chart…</Text>
            </View>
          )}
        </View>

        <View style={styles.rangeRow}>
          {["Today", "Past week", "Past month", "Past Year"].map((range) => {
            const active = revenueTimeRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[styles.rangeBtn, active && styles.rangeBtnActive]}
                onPress={() => setRevenueTimeRange(range)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.rangeBtnText,
                    active && styles.rangeBtnTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* METRICS GRID */}
      <View style={styles.grid}>
        {/* Bookings */}
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() =>
            onNavigateToBookings
              ? onNavigateToBookings()
              : handleMetricPress("Bookings", "View upcoming bookings")
          }
          activeOpacity={0.85}
        >
          <View style={styles.metricHeader}>
            <View style={styles.metricIcon}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricTitle}>Bookings</Text>
          </View>

          {bookingsData.loading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginTop: 10 }}
            />
          ) : (
            <View style={styles.metricBody}>
              <View style={styles.metricRow}>
                <Text style={styles.metricBig}>{bookingsData.today}</Text>
                <Text style={styles.metricHint}>today</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricBig}>{bookingsData.total}</Text>
                <Text style={styles.metricHint}>this month</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Rating */}
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => onNavigateToReviews && onNavigateToReviews()}
          activeOpacity={0.85}
        >
          <View style={styles.metricHeader}>
            <View style={styles.metricIcon}>
              <Ionicons name="star" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricTitle}>Rating</Text>
          </View>

          <View style={styles.ratingWrap}>
            <View style={styles.pieWrap}>
              <PieChart
                data={[
                  {
                    name: "5★",
                    population: 180,
                    color: colors.success,
                    legendFontColor: colors.textSecondary,
                    legendFontSize: 10,
                  },
                  {
                    name: "4★",
                    population: 100,
                    color: "#8BC34A",
                    legendFontColor: colors.textSecondary,
                    legendFontSize: 10,
                  },
                  {
                    name: "3★",
                    population: 25,
                    color: colors.warning,
                    legendFontColor: colors.textSecondary,
                    legendFontSize: 10,
                  },
                  {
                    name: "2★",
                    population: 5,
                    color: "#FF9800",
                    legendFontColor: colors.textSecondary,
                    legendFontSize: 10,
                  },
                  {
                    name: "1★",
                    population: 2,
                    color: colors.error,
                    legendFontColor: colors.textSecondary,
                    legendFontSize: 10,
                  },
                ]}
                width={150}
                height={150}
                chartConfig={{ color: () => `rgba(0,0,0,1)` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="34"
                absolute
                hasLegend={false}
              />
              <View style={styles.pieHole} />
              <View style={styles.pieCenter}>
                <Text style={styles.pieValue}>
                  {ratingLoading ? "—" : ratingAverage.toFixed(1)}
                </Text>
                <Text style={styles.pieSub}>
                  {ratingLoading
                    ? "Loading…"
                    : ratingCount === 0
                      ? "No reviews"
                      : `${ratingCount} ${ratingCount === 1 ? "review" : "reviews"}`}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Avg Price */}
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() =>
            handleMetricPress("Avg. Price", "Compare pricing trends")
          }
          activeOpacity={0.85}
        >
          <View style={styles.metricHeader}>
            <View style={styles.metricIcon}>
              <Ionicons name="cash" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricTitle}>Avg. Price</Text>
          </View>

          <Text style={styles.priceBig}>
            {placeData?.avg_price
              ? `₹${parseFloat(placeData.avg_price).toFixed(0)}`
              : "₹0"}
          </Text>
          <Text style={styles.priceSub}>per booking</Text>
        </TouchableOpacity>

        {/* Placeholder / Optional Metric */}
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => handleMetricPress("Insights", "Coming soon")}
          activeOpacity={0.85}
        >
          <View style={styles.metricHeader}>
            <View style={styles.metricIcon}>
              <Ionicons name="analytics" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricTitle}>Insights</Text>
          </View>
          <Text style={styles.insightText}>
            Track trends, refunds, and peak hours.
          </Text>
          <Text style={styles.insightLink}>Coming soon</Text>
        </TouchableOpacity>
      </View>

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notificationButtonLayout={notificationButtonLayout}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  content: {
    paddingTop:
      Platform.OS === "ios" ? 18 : (StatusBar.currentHeight || 0) + 12,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: { flex: 1, paddingRight: 10 },

  greeting: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },

  notificationButton: { padding: 2, marginTop: 2 },
  notificationBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },

  revenueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  revenueRight: { alignItems: "flex-end" },
  revenueTotal: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },

  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },

  chartWrap: {
    borderRadius: 16,
    overflow: "hidden", // IMPORTANT (clips shifted chart)
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    marginBottom: 12,
    position: "relative",
  },

  // Keep your left offset trick for chart-kit padding
  chartLoading: {
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  chartLoadingText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  tooltip: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  tooltipLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.cardBackground,
    opacity: 0.9,
  },
  tooltipValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.cardBackground,
    marginTop: 2,
  },

  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeBtnText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  rangeBtnTextActive: { color: "#fff" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 2,
  },
  metricCard: {
    width: "48%",
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    minHeight: 160,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.badgeBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  metricTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },

  metricBody: { marginTop: 8 },
  metricRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  metricBig: {
    fontSize: 34,
    fontFamily: fonts.bold,
    color: colors.text,
    lineHeight: 38,
  },
  metricHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  metricDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.7,
    marginVertical: 10,
  },

  ratingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  pieWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pieHole: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBackground,
  },
  pieCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 90,
  },
  pieValue: { fontSize: 22, fontFamily: fonts.bold, color: colors.text },
  pieSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },

  priceBig: {
    marginTop: 14,
    fontSize: 34,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  priceSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
  },

  insightText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  insightLink: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});

export default HomeScreen;
