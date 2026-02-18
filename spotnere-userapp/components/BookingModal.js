import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { getCurrentUser } from "../utils/auth";
import { useBookings } from "../context/BookingsContext";
import { NativeModules } from "react-native";
import RazorpayCheckout from "react-native-razorpay";

const { width, height } = Dimensions.get("window");

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:5001";

const BookingModal = ({ visible, onClose, placeDetails, vendor }) => {
  const { refreshBookings } = useBookings();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [guests, setGuests] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showPaymentProcessing, setShowPaymentProcessing] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentFailed, setShowPaymentFailed] = useState(false);
  const [paymentFailedMessage, setPaymentFailedMessage] = useState("");
  const [showPaymentCancelled, setShowPaymentCancelled] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowPaymentSuccess(false);
      setShowPaymentFailed(false);
      setShowPaymentCancelled(false);
    }
  }, [visible]);

  // Available time slots
  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
    "6:00 PM",
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const isDateSelected = (date) => {
    return date && selectedDate && date.getTime() === selectedDate.getTime();
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDatePress = (date) => {
    if (!date || isPastDate(date)) return;
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Reset time slot when date changes
    setGuests(""); // Reset guests when date changes
  };

  const handleTimeSlotPress = (timeSlot) => {
    if (!selectedDate) return; // Don't allow selection if no date is selected
    setSelectedTimeSlot(timeSlot);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + direction,
        1,
      ),
    );
  };

  const calculateTotal = () => {
    if (!placeDetails || !selectedDate || !selectedTimeSlot || !guests) {
      return { subtotal: 0, serviceFee: 0, total: 0 };
    }

    const basePrice =
      placeDetails.price_per_night ||
      placeDetails.avg_price ||
      placeDetails.price ||
      0;

    // Parse number of guests
    const numGuests = parseInt(guests, 10) || 1;

    // Since we only have single date selection, assume 1 night
    const nights = 1;
    const subtotal = parseFloat(basePrice) * nights * numGuests;
    const serviceFee = subtotal * 0.1; // 10% service fee
    const total = subtotal + serviceFee;

    return { subtotal, serviceFee, total };
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bookingTotal = calculateTotal();

  const handlePayAndBook = async () => {
    if (!selectedDate || !selectedTimeSlot || !guests) {
      Alert.alert(
        "Incomplete Booking",
        "Please select date, time slot, and number of guests.",
        [{ text: "OK" }],
      );
      return;
    }

    const total = bookingTotal.total;
    if (total <= 0) {
      Alert.alert("Invalid Amount", "Please check your booking details.", [
        { text: "OK" },
      ]);
      return;
    }

    const user = await getCurrentUser();
    if (!user?.id) {
      Alert.alert("Login required", "Please log in to book.", [{ text: "OK" }]);
      return;
    }

    setPaying(true);
    try {
      const placeId = placeDetails?.id || placeDetails?.place_id;
      if (!placeId) {
        Alert.alert("Error", "Place information is missing.", [{ text: "OK" }]);
        return;
      }

      // Combine date + time slot into ISO datetime (e.g. "2025-01-27T10:00:00")
      const dateStr = selectedDate.toISOString().split("T")[0];
      const timeMap = {
        "9:00 AM": "09:00",
        "10:00 AM": "10:00",
        "11:00 AM": "11:00",
        "12:00 PM": "12:00",
        "1:00 PM": "13:00",
        "2:00 PM": "14:00",
        "3:00 PM": "15:00",
        "4:00 PM": "16:00",
        "5:00 PM": "17:00",
        "6:00 PM": "18:00",
      };
      const timeStr = timeMap[selectedTimeSlot] || "10:00";
      const bookingDateTime = `${dateStr}T${timeStr}:00.000Z`;

      const numberOfGuests = parseInt(guests, 10) || 0;

      const res = await fetch(`${API_BASE}/bookings/create-and-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          placeId,
          bookingDateTime,
          amountInr: total,
          currency: "INR",
          number_of_guests: numberOfGuests,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "Failed to create booking";
        throw new Error(msg);
      }

      setPaying(false);

      if (!NativeModules.RNRazorpayCheckout) {
        Alert.alert(
          "Razorpay Unavailable",
          "Payment module is not loaded. Rebuild the app with: npx expo prebuild --clean && npx expo run:android --device",
          [{ text: "OK" }],
        );
        return;
      }

      setShowPaymentProcessing(true);

      let razorpayData;
      try {
        razorpayData = await RazorpayCheckout.open({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.orderId,
          description: `Booking - ${placeDetails?.name || placeDetails?.title || "Place"}`,
          name: "Spotnere",
        });
      } catch (razorpayErr) {
        setShowPaymentProcessing(false);
        const err = razorpayErr?.error || razorpayErr;
        const isUserCancelled =
          razorpayErr?.code === 2 ||
          err?.code === 2 ||
          err?.reason === "payment_error" ||
          err?.source === "customer";
        if (isUserCancelled) {
          try {
            await fetch(`${API_BASE}/bookings/${data.bookingId}/cancel`, {
              method: "DELETE",
            });
          } catch (e) {
            console.warn("Failed to delete cancelled booking:", e);
          }
          setShowPaymentCancelled(true);
          return;
        }
        const msg =
          razorpayErr?.message?.includes("null")
            ? "Razorpay native module not loaded. Rebuild the app with: npx expo prebuild --clean && npx expo run:android --device"
            : err?.description || razorpayErr?.description || "Payment cancelled or failed.";
        throw new Error(msg);
      }

      setShowPaymentProcessing(false);
      setPaying(true);

      const verifyRes = await fetch(`${API_BASE}/payments/razorpay/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: data.bookingId,
          razorpay_order_id: razorpayData.razorpay_order_id,
          razorpay_payment_id: razorpayData.razorpay_payment_id,
          razorpay_signature: razorpayData.razorpay_signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.status === "SUCCESS") {
        setShowPaymentProcessing(false);
        await refreshBookings();
        setShowPaymentSuccess(true);
      } else {
        setShowPaymentProcessing(false);
        setPaymentFailedMessage(
          verifyData.reason ||
            verifyData.error ||
            verifyData.details ||
            "Payment could not be completed.",
        );
        setShowPaymentFailed(true);
      }
    } catch (err) {
      setShowPaymentProcessing(false);
      console.error("Create booking error:", err);
      setPaymentFailedMessage(
        err.message || "Failed to create booking. Please try again.",
      );
      setShowPaymentFailed(true);
    } finally {
      setPaying(false);
    }
  };

  const BlurContainer = Platform.OS === "ios" ? BlurView : View;
  const blurProps =
    Platform.OS === "ios"
      ? { intensity: 80 }
      : { backgroundColor: "rgba(0, 0, 0, 0.5)" };

  const handleCloseSuccess = () => {
    setShowPaymentSuccess(false);
    onClose();
  };

  const handleCloseFailed = () => {
    setShowPaymentFailed(false);
    setPaymentFailedMessage("");
  };

  const handleCloseCancelled = () => {
    setShowPaymentCancelled(false);
  };

  return (
    <Modal
      visible={!!visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {showPaymentSuccess ? (
          <TouchableOpacity
            style={styles.successOverlay}
            activeOpacity={1}
            onPress={handleCloseSuccess}
          >
            <View style={styles.successContent}>
              <Ionicons name="checkmark-circle" size={64} color="#fff" />
              <Text style={styles.successTitle}>Payment Successful</Text>
              <Text style={styles.successSubtitle}>
                Booking Confirmed. Check Trips for more details
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={handleCloseSuccess}
                activeOpacity={0.85}
              >
                <Text style={styles.successButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : showPaymentFailed ? (
          <TouchableOpacity
            style={styles.failedOverlay}
            activeOpacity={1}
            onPress={handleCloseFailed}
          >
            <View style={styles.failedContent}>
              <Ionicons name="close-circle" size={64} color="#fff" />
              <Text style={styles.failedTitle}>Payment Failed</Text>
              <Text style={styles.failedSubtitle}>{paymentFailedMessage}</Text>
              <TouchableOpacity
                style={styles.failedButton}
                onPress={handleCloseFailed}
                activeOpacity={0.85}
              >
                <Text style={styles.failedButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : showPaymentCancelled ? (
          <TouchableOpacity
            style={styles.cancelledOverlay}
            activeOpacity={1}
            onPress={handleCloseCancelled}
          >
            <View style={styles.cancelledContent}>
              <Ionicons name="close-circle-outline" size={64} color="#fff" />
              <Text style={styles.cancelledTitle}>Payment Cancelled</Text>
              <Text style={styles.cancelledSubtitle}>
                Your booking has been cancelled.
              </Text>
              <TouchableOpacity
                style={styles.cancelledButton}
                onPress={handleCloseCancelled}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelledButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : (
        <BlurContainer {...blurProps} style={styles.blurOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Book your stay</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Calendar */}
              <View style={styles.calendarContainer}>
                {/* Month Navigation */}
                <View style={styles.monthHeader}>
                  <TouchableOpacity
                    onPress={() => navigateMonth(-1)}
                    style={styles.monthNavButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                  <Text style={styles.monthYearText}>
                    {formatMonthYear(currentMonth)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigateMonth(1)}
                    style={styles.monthNavButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* Week Days Header */}
                <View style={styles.weekDaysContainer}>
                  {weekDays.map((day, index) => (
                    <View key={index} style={styles.weekDay}>
                      <Text style={styles.weekDayText}>{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {days.map((date, index) => {
                    if (!date) {
                      return <View key={index} style={styles.dayCell} />;
                    }

                    const isSelected = isDateSelected(date);
                    const isPast = isPastDate(date);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isPast && styles.dayCellPast,
                        ]}
                        onPress={() => handleDatePress(date)}
                        disabled={isPast}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                            isPast && styles.dayTextPast,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Time Slot Selection - Always visible but grayed out until date is selected */}
              <View style={styles.timeSlotContainer}>
                <Text
                  style={[
                    styles.timeSlotTitle,
                    !selectedDate && styles.timeSlotTitleDisabled,
                  ]}
                >
                  Select time
                </Text>
                <View style={styles.timeSlotGrid}>
                  {timeSlots.map((timeSlot, index) => {
                    const isSelected = selectedTimeSlot === timeSlot;
                    const isDisabled = !selectedDate;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.timeSlotButton,
                          isSelected && styles.timeSlotButtonSelected,
                          !isDisabled &&
                            !isSelected &&
                            styles.timeSlotButtonEnabled,
                          isDisabled && styles.timeSlotButtonDisabled,
                        ]}
                        onPress={() => handleTimeSlotPress(timeSlot)}
                        disabled={isDisabled}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                            !isDisabled &&
                              !isSelected &&
                              styles.timeSlotTextEnabled,
                            isDisabled && styles.timeSlotTextDisabled,
                          ]}
                        >
                          {timeSlot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Guests Input Field */}
              <View style={styles.guestsContainer}>
                <Text
                  style={[
                    styles.guestsTitle,
                    (!selectedDate || !selectedTimeSlot) &&
                      styles.guestsTitleDisabled,
                  ]}
                >
                  Number of guests
                </Text>
                <View
                  style={[
                    styles.guestsInputContainer,
                    (!selectedDate || !selectedTimeSlot) &&
                      styles.guestsInputContainerDisabled,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.guestsIcon}
                  />
                  <TextInput
                    style={[
                      styles.guestsInput,
                      (!selectedDate || !selectedTimeSlot) &&
                        styles.guestsInputDisabled,
                    ]}
                    placeholder="Enter number of guests"
                    placeholderTextColor={colors.textSecondary}
                    value={guests}
                    onChangeText={setGuests}
                    keyboardType="numeric"
                    editable={!!(selectedDate && selectedTimeSlot)}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Pay and Book Button */}
            <View style={styles.footer}>
              {/* Breakdown Toggle */}
              <TouchableOpacity
                style={styles.breakdownToggle}
                onPress={() => setShowBreakdown(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.breakdownToggleText}>Price breakdown</Text>
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.payButton}
                onPress={handlePayAndBook}
                activeOpacity={0.8}
                disabled={paying}
              >
                <View style={styles.payButtonContent}>
                  {paying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.payButtonText}>Pay and Book</Text>
                      <Text style={styles.payButtonAmount}>
                        ${bookingTotal.total.toFixed(2)}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </BlurContainer>
        )}
      </View>

      {/* Payment Processing Overlay */}
      <Modal
        visible={showPaymentProcessing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.paymentProcessingOverlay}>
          <View style={styles.paymentProcessingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.paymentProcessingText}>Payment processing...</Text>
          </View>
        </View>
      </Modal>

      {/* Breakdown Modal */}
      <Modal
        visible={showBreakdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBreakdown(false)}
      >
        <View style={styles.breakdownModalOverlay}>
          <BlurContainer {...blurProps} style={styles.breakdownBlurOverlay}>
            <TouchableOpacity
              style={styles.breakdownModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowBreakdown(false)}
            >
              <View style={styles.breakdownModalContainer}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.breakdownModalContent}>
                    {/* Header */}
                    <View style={styles.breakdownHeader}>
                      <Text style={styles.breakdownHeaderTitle}>
                        Price breakdown
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowBreakdown(false)}
                        style={styles.breakdownCloseButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    {/* Breakdown Details */}
                    <View style={styles.breakdownDetails}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                          $
                          {placeDetails?.price_per_night ||
                            placeDetails?.avg_price ||
                            placeDetails?.price ||
                            0}{" "}
                          × {parseInt(guests, 10) || 1} guest
                          {parseInt(guests, 10) !== 1 ? "s" : ""}
                        </Text>
                        <Text style={styles.breakdownValue}>
                          ${bookingTotal.subtotal.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Service fee</Text>
                        <Text style={styles.breakdownValue}>
                          ${bookingTotal.serviceFee.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={[styles.breakdownRow, styles.breakdownTotalRow]}
                      >
                        <Text style={styles.breakdownTotalLabel}>Total</Text>
                        <Text style={styles.breakdownTotalValue}>
                          ${bookingTotal.total.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </BlurContainer>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  successOverlay: {
    flex: 1,
    backgroundColor: colors.success || "#1E8E3E",
    justifyContent: "center",
    alignItems: "center",
  },
  successContent: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.95)",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  successButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
  },
  successButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#fff",
  },
  failedOverlay: {
    flex: 1,
    backgroundColor: colors.error || "#D93025",
    justifyContent: "center",
    alignItems: "center",
  },
  failedContent: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  failedTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
  },
  failedSubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.95)",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  failedButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
  },
  failedButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#fff",
  },
  cancelledOverlay: {
    flex: 1,
    backgroundColor: colors.warning || "#F9AB00",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelledContent: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  cancelledTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
  },
  cancelledSubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.95)",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  cancelledButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
  },
  cancelledButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#fff",
  },
  blurOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
    flexDirection: "column",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthNavButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  weekDaysContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: (width - 40) / 7,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: fonts.bold,
  },
  dayTextPast: {
    color: colors.textSecondary,
  },
  timeSlotContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeSlotTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  timeSlotTitleDisabled: {
    opacity: 0.4,
  },
  timeSlotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginHorizontal: -5,
  },
  timeSlotButton: {
    width: (width - 60) / 3,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 5,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.4,
  },
  timeSlotButtonEnabled: {
    opacity: 0.7,
  },
  timeSlotButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    fontFamily: fonts.semiBold,
    opacity: 1,
  },
  timeSlotButtonDisabled: {
    opacity: 0.4,
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  timeSlotTextEnabled: {
    color: colors.text,
  },
  timeSlotTextSelected: {
    color: "#fff",
    fontWeight: "600",
    fontFamily: fonts.semiBold,
  },
  timeSlotTextDisabled: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
  guestsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  guestsTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 12,
  },
  guestsTitleDisabled: {
    opacity: 0.4,
  },
  guestsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestsInputContainerDisabled: {
    opacity: 0.4,
  },
  guestsIcon: {
    marginRight: 12,
  },
  guestsInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  guestsInputDisabled: {
    color: colors.text,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  breakdownToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  breakdownToggleText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  paymentProcessingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentProcessingContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 200,
  },
  paymentProcessingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  breakdownModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownBlurOverlay: {
    flex: 1,
    width: "100%",
  },
  breakdownModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  breakdownModalContainer: {
    width: "100%",
    maxWidth: 400,
  },
  breakdownModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: colors.text,
  },
  breakdownCloseButton: {
    padding: 4,
  },
  breakdownDetails: {
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonContent: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: fonts.bold,
  },
  payButtonAmount: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: fonts.bold,
  },
});

export default BookingModal;
