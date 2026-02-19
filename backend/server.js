// server.js
// Razorpay PG backend for Spotnere (Create Order + Verify Payment + Webhook)
// Also updates Supabase bookings table.
//
// Requirements:
//   npm i express cors dotenv razorpay @supabase/supabase-js
// Notes:
// - Webhook must use express.raw() for signature verification.
// - Keep RAZORPAY_KEY_SECRET and SUPABASE_SERVICE_ROLE_KEY ONLY on backend.

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.resolve(__dirname, ".env"),
  quiet: true,
});

import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const app = express();

// ---------- Config ----------
const PORT = process.env.PORT || 5001;

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CORS_ORIGIN,
} = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error(
    "❌ Missing Razorpay env vars (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)",
  );
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing Supabase env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
  );
  process.exit(1);
}

// ---------- Clients ----------
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- Middleware ----------
app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(",").map((s) => s.trim()) : "*",
    credentials: true,
  }),
);

// Webhook MUST use raw body for signature verification - register BEFORE express.json()
app.post(
  "/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      if (!RAZORPAY_WEBHOOK_SECRET) {
        return res.status(500).send("Webhook secret not configured");
      }

      const signature = req.headers["x-razorpay-signature"];
      const expected = crypto
        .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");

      if (expected !== signature) {
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(req.body.toString("utf8"));
      const paymentEntity = event?.payload?.payment?.entity;
      const orderEntity = event?.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id || null;

      if (!orderId) {
        return res.json({ received: true, ignored: true });
      }

      const booking = await findBookingByOrderId(orderId);
      if (!booking) {
        return res.json({ received: true, ignored: true });
      }

      const rpStatus = paymentEntity?.status;
      const finalStatus =
        rpStatus === "captured"
          ? "SUCCESS"
          : rpStatus === "failed"
            ? "FAILED"
            : "PENDING";

      const updatedBooking = await updateBookingById(booking.id, {
        payment_status: finalStatus,
        razorpay_payment_id: paymentEntity?.id || booking.razorpay_payment_id,
        transaction_id: paymentEntity?.id || booking.transaction_id,
        payment_method: paymentEntity?.method || booking.payment_method,
        paid_at:
          finalStatus === "SUCCESS"
            ? new Date().toISOString()
            : booking.paid_at,
        amount_received_by_vendor:
          finalStatus === "SUCCESS"
            ? Number(paymentEntity?.amount || booking.amount_paid * 100) / 100
            : booking.amount_received_by_vendor,
        payment_error:
          finalStatus === "FAILED"
            ? paymentEntity?.error_description ||
              paymentEntity?.error_reason ||
              "Payment failed"
            : null,
      });

      if (finalStatus === "SUCCESS" && updatedBooking) {
        await insertVendorNotificationForBooking(updatedBooking);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("webhook error:", err);
      return res.status(500).send("Webhook handler error");
    }
  },
);

// JSON body parser for normal routes
app.use(express.json());

// ---------- Helpers ----------
const inrToPaise = (amountInr) => Math.round(Number(amountInr) * 100);

function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === signature;
}

async function updateBookingById(bookingId, patch) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function findBookingByOrderId(orderId) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification via Expo's push API.
 * @param {string} pushToken - ExponentPushToken[xxx]
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data] - Optional data payload for tap handling
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendExpoPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || typeof pushToken !== "string" || !pushToken.trim()) {
    return { success: false, error: "Invalid push token" };
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken.trim(),
        title,
        body,
        data,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Expo push error:", result);
      return {
        success: false,
        error: result?.errors?.[0]?.message ?? result?.message ?? "Push failed",
      };
    }

    if (result?.data?.status === "error") {
      const errMsg = result.data.message ?? "Push delivery failed";
      console.warn("Expo push delivery error:", errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err) {
    console.error("Expo push request failed:", err);
    return {
      success: false,
      error: err?.message ?? "Push request failed",
    };
  }
}

/**
 * Insert a vendor notification when payment succeeds.
 * Fetches vendor_id and push_token from vendors by place_id, inserts into vendor_notifications,
 * and sends a push notification if push_token exists.
 */
async function insertVendorNotificationForBooking(booking) {
  if (!booking?.place_id || !booking?.id) return;

  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from("vendors")
    .select("id, push_token")
    .eq("place_id", booking.place_id)
    .maybeSingle();

  if (vendorError || !vendor?.id) {
    console.warn("Could not find vendor for place_id:", booking.place_id);
    return;
  }

  const bookingDate = booking.booking_date_time
    ? new Date(booking.booking_date_time).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "scheduled";

  const title = "New booking";
  const body = `You have a new booking for ${bookingDate}. Amount: ₹${Number(booking.amount_paid || 0).toLocaleString("en-IN")}`;

  const { error: insertError } = await supabaseAdmin
    .from("vendor_notifications")
    .insert({
      vendor_id: vendor.id,
      place_id: booking.place_id,
      booking_id: booking.id,
      type: "NEW_BOOKING",
      title,
      body,
    });

  if (insertError) {
    console.error("Failed to insert vendor notification:", insertError);
  }

  if (vendor?.push_token) {
    const pushResult = await sendExpoPushNotification(
      vendor.push_token,
      title,
      body,
      { type: "NEW_BOOKING", bookingId: booking.id, placeId: booking.place_id }
    );
    if (!pushResult.success) {
      console.warn("Push notification failed:", pushResult.error);
    }
  }
}

// ---------- Routes ----------
app.get("/health", (_, res) => res.json({ ok: true }));

/**
 * POST /bookings/create-and-order
 * Creates booking row (PENDING) + Razorpay order. Returns order details for checkout.
 * body: { userId, placeId, bookingDateTime, amountInr, currency? }
 * bookingDateTime: ISO string (e.g. "2025-01-27T10:00:00.000Z")
 */
app.post("/bookings/create-and-order", async (req, res) => {
  try {
    const { userId, placeId, bookingDateTime, amountInr, currency, number_of_guests } = req.body;

    if (!userId || !placeId || !bookingDateTime) {
      return res.status(400).json({
        error: "userId, placeId, and bookingDateTime are required",
      });
    }
    if (!amountInr || Number(amountInr) <= 0) {
      return res.status(400).json({ error: "amountInr must be > 0" });
    }

    const amountPaise = inrToPaise(amountInr);
    const payCurrency = currency || "INR";

    // Generate unique booking ref (SPT-{timestamp}-{random})
    const bookingRefNumber = `SPT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // 1) Create booking row (payment_status = PENDING)
    const insertPayload = {
      user_id: userId,
      place_id: placeId,
      booking_date_time: bookingDateTime,
      booking_ref_number: bookingRefNumber,
      amount_paid: Number(amountInr),
      currency_paid: payCurrency,
      payment_status: "PENDING",
    };
    if (number_of_guests != null && !isNaN(Number(number_of_guests))) {
      insertPayload.number_of_guests = Number(number_of_guests);
    }
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      console.error("create-booking error:", insertError);
      return res.status(500).json({
        error: "Failed to create booking",
        details: insertError.message,
      });
    }

    // 2) Create Razorpay order (receipt max 40 chars)
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: payCurrency,
      receipt: bookingRefNumber,
      notes: { bookingId: booking.id },
    });

    // 3) Update booking with razorpay_order_id
    await updateBookingById(booking.id, {
      razorpay_order_id: order.id,
    });

    return res.json({
      keyId: RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: booking.id,
    });
  } catch (err) {
    console.error("create-and-order error:", err);
    return res.status(500).json({
      error: "Failed to create booking and order",
      details: err?.message || String(err),
    });
  }
});

/**
 * DELETE /bookings/:bookingId/cancel
 * Deletes a PENDING booking (e.g. when user cancels payment).
 */
app.delete("/bookings/:bookingId/cancel", async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId)
      return res.status(400).json({ error: "bookingId is required" });

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, payment_status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (booking.payment_status !== "PENDING") {
      return res.status(400).json({
        error: "Can only cancel PENDING bookings",
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (deleteError) {
      console.error("cancel-booking error:", deleteError);
      return res.status(500).json({ error: "Failed to cancel booking" });
    }

    return res.json({ cancelled: true });
  } catch (err) {
    console.error("cancel-booking error:", err);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
});

/**
 * POST /payments/razorpay/create-order
 * body: { bookingId, amountInr, currency? }
 * Creates Razorpay order + stores order id in bookings.
 */
app.post("/payments/razorpay/create-order", async (req, res) => {
  try {
    const { bookingId, amountInr, currency } = req.body;

    if (!bookingId)
      return res.status(400).json({ error: "bookingId is required" });
    if (!amountInr || Number(amountInr) <= 0)
      return res.status(400).json({ error: "amountInr must be > 0" });

    const amountPaise = inrToPaise(amountInr);
    const payCurrency = currency || "INR";

    const receipt =
      String(bookingId).length <= 40
        ? `booking_${bookingId}`
        : `bk_${String(bookingId).replace(/-/g, "").slice(0, 32)}`;
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: payCurrency,
      receipt,
      notes: { bookingId },
    });

    // Update booking row: set order id + mark pending + store amount/currency
    await updateBookingById(bookingId, {
      razorpay_order_id: order.id,
      payment_status: "PENDING",
      amount_paid: Number(amountInr),
      currency_paid: payCurrency,
      payment_error: null,
    });

    return res.json({
      keyId: RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * POST /payments/razorpay/verify
 * body: { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies signature + fetches payment status from Razorpay + updates bookings.
 */
app.post("/payments/razorpay/verify", async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!bookingId)
      return res.status(400).json({ error: "bookingId is required" });
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay fields" });
    }

    // 1) Signature verify
    const sigOk = verifyCheckoutSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!sigOk) {
      await updateBookingById(bookingId, {
        payment_status: "FAILED",
        razorpay_payment_id,
        razorpay_signature,
        transaction_id: razorpay_payment_id,
        payment_error: "Signature mismatch",
      });
      return res
        .status(400)
        .json({ status: "FAILED", reason: "Signature mismatch" });
    }

    // 2) Fetch payment from Razorpay (extra safety)
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const finalStatus =
      payment.status === "captured"
        ? "SUCCESS"
        : payment.status === "failed"
          ? "FAILED"
          : "PENDING";

    // 3) Update booking
    const booking = await updateBookingById(bookingId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transaction_id: razorpay_payment_id,
      payment_method: payment.method || null,
      payment_status: finalStatus,
      paid_at: finalStatus === "SUCCESS" ? new Date().toISOString() : null,
      amount_received_by_vendor:
        finalStatus === "SUCCESS" ? Number(payment.amount) / 100 : null,
      payment_error:
        finalStatus === "FAILED"
          ? payment.error_description || "Payment failed"
          : null,
    });

    if (finalStatus === "SUCCESS" && booking) {
      await insertVendorNotificationForBooking(booking);
    }

    return res.json({
      status: finalStatus,
      bookingId: booking.id,
      razorpay_payment_id,
      razorpay_order_id,
      method: payment.method,
      gateway_status: payment.status,
    });
  } catch (err) {
    console.error("verify error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * GET /payments/razorpay/status?bookingId=...
 * Handy for polling from app if needed.
 */
app.get("/payments/razorpay/status", async (req, res) => {
  try {
    const { bookingId } = req.query;
    if (!bookingId)
      return res.status(400).json({ error: "bookingId is required" });

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id,payment_status,razorpay_order_id,razorpay_payment_id,paid_at,payment_error",
      )
      .eq("id", bookingId)
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error("status error:", err);
    return res.status(500).json({ error: "Failed to fetch status" });
  }
});

// ---------- API Routes (moved from userapp) ----------

/**
 * GET /api/places?country=...
 * Fetch places filtered by country.
 */
app.get("/api/places", async (req, res) => {
  try {
    const { country } = req.query;
    let query = supabaseAdmin.from("places").select("*");
    if (country) query = query.eq("country", country);
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error("api/places error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch places" });
  }
});

/**
 * POST /api/places/by-ids
 * body: { placeIds: string[], country?: string }
 * Fetch places by IDs.
 */
app.post("/api/places/by-ids", async (req, res) => {
  try {
    const { placeIds, country } = req.body || {};
    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return res.status(400).json({ error: "placeIds array is required" });
    }
    let query = supabaseAdmin.from("places").select("*").in("id", placeIds);
    if (country) query = query.eq("country", country);
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error("api/places/by-ids error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch places" });
  }
});

/**
 * GET /api/places/:placeId
 * Fetch single place.
 */
app.get("/api/places/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("places")
      .select("*")
      .eq("id", placeId)
      .single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error("api/places/:placeId error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch place" });
  }
});

/**
 * GET /api/places/:placeId/reviews
 * Fetch reviews for a place.
 */
app.get("/api/places/:placeId/reviews", async (req, res) => {
  try {
    const { placeId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select(
        `
        user_id,
        place_id,
        review,
        rating,
        created_at,
        user:users!user_id(first_name, last_name)
      `,
      )
      .eq("place_id", placeId)
      .order("created_at", { ascending: false });
    if (error) {
      const { data: fallback } = await supabaseAdmin
        .from("reviews")
        .select("user_id, place_id, review, rating, created_at")
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });
      return res.json(fallback || []);
    }
    return res.json(data || []);
  } catch (err) {
    console.error("api/places/:placeId/reviews error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch reviews" });
  }
});

/**
 * GET /api/places/:placeId/gallery
 * Fetch gallery images.
 */
app.get("/api/places/:placeId/gallery", async (req, res) => {
  try {
    const { placeId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("gallery_images")
      .select("id, gallery_image_url")
      .eq("place_id", placeId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error("api/places/:placeId/gallery error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch gallery" });
  }
});

/**
 * GET /api/places/:placeId/vendor
 * Fetch vendor for a place.
 */
app.get("/api/places/:placeId/vendor", async (req, res) => {
  try {
    const { placeId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .select(
        "business_name, vendor_full_name, vendor_phone_number, vendor_email, vendor_address, vendor_city, vendor_state, vendor_country, vendor_postal_code, upi_id",
      )
      .eq("place_id", placeId)
      .maybeSingle();
    if (error) throw error;
    return res.json(data || null);
  } catch (err) {
    console.error("api/places/:placeId/vendor error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch vendor" });
  }
});

/**
 * POST /api/places/:placeId/reviews
 * body: { userId, review, rating }
 * Add review and update place rating.
 */
app.post("/api/places/:placeId/reviews", async (req, res) => {
  try {
    const { placeId } = req.params;
    const { userId, review, rating } = req.body || {};
    if (!userId || !review || !rating) {
      return res.status(400).json({ error: "userId, review, and rating are required" });
    }
    const insertPayload = {
      user_id: userId,
      place_id: placeId,
      review: String(review).trim(),
      rating: Number(rating),
    };
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("reviews")
      .insert([insertPayload])
      .select()
      .single();
    if (insertError) throw insertError;

    const { data: allReviews } = await supabaseAdmin
      .from("reviews")
      .select("rating")
      .eq("place_id", placeId);
    const avgRating =
      allReviews && allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + parseFloat(r.rating ?? 0), 0) / allReviews.length
        : 0;
    const roundedAvg = Math.round(avgRating * 10) / 10;
    await supabaseAdmin.from("places").update({ rating: roundedAvg }).eq("id", placeId);

    return res.json(inserted);
  } catch (err) {
    console.error("api/places/:placeId/reviews POST error:", err);
    return res.status(500).json({ error: err?.message || "Failed to add review" });
  }
});

/**
 * GET /api/favorites?userId=...
 * Fetch favorite place IDs and places.
 */
app.get("/api/favorites", async (req, res) => {
  try {
    const { userId, country } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const { data: userPlaces, error: upError } = await supabaseAdmin
      .from("user_places")
      .select("fav_place_id")
      .eq("user_id", userId);
    if (upError) throw upError;
    if (!userPlaces || userPlaces.length === 0) return res.json([]);
    const favoriteIds = userPlaces.map((u) => u.fav_place_id);
    let query = supabaseAdmin.from("places").select("*").in("id", favoriteIds);
    if (country) query = query.eq("country", country);
    const { data: places, error } = await query;
    if (error) throw error;
    return res.json(places || []);
  } catch (err) {
    console.error("api/favorites error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch favorites" });
  }
});

/**
 * POST /api/favorites
 * body: { userId, placeId }
 */
app.post("/api/favorites", async (req, res) => {
  try {
    const { userId, placeId } = req.body || {};
    if (!userId || !placeId) {
      return res.status(400).json({ error: "userId and placeId are required" });
    }
    const { error } = await supabaseAdmin.from("user_places").insert([
      { user_id: userId, fav_place_id: placeId },
    ]);
    if (error) {
      if (error.code === "23505") return res.json({ success: true });
      throw error;
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("api/favorites POST error:", err);
    return res.status(500).json({ error: err?.message || "Failed to save favorite" });
  }
});

/**
 * DELETE /api/favorites
 * body: { userId, placeId }
 */
app.delete("/api/favorites", async (req, res) => {
  try {
    const { userId, placeId } = req.body || req.query;
    if (!userId || !placeId) {
      return res.status(400).json({ error: "userId and placeId are required" });
    }
    const { error } = await supabaseAdmin
      .from("user_places")
      .delete()
      .eq("user_id", userId)
      .eq("fav_place_id", placeId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error("api/favorites DELETE error:", err);
    return res.status(500).json({ error: err?.message || "Failed to remove favorite" });
  }
});

/**
 * GET /api/favorites/check?userId=...&placeId=...
 */
app.get("/api/favorites/check", async (req, res) => {
  try {
    const { userId, placeId } = req.query;
    if (!userId || !placeId) return res.json({ favorited: false });
    const { data, error } = await supabaseAdmin
      .from("user_places")
      .select("fav_place_id")
      .eq("user_id", userId)
      .eq("fav_place_id", placeId)
      .maybeSingle();
    if (error) throw error;
    return res.json({ favorited: !!data });
  } catch (err) {
    console.error("api/favorites/check error:", err);
    return res.json({ favorited: false });
  }
});

/**
 * GET /api/bookings?userId=...
 * Fetch user bookings with place details.
 */
app.get("/api/bookings", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const { data: bookingsWithPlaces, error: joinError } = await supabaseAdmin
      .from("bookings")
      .select(
        `
        id,
        place_id,
        booking_date_time,
        booking_ref_number,
        amount_paid,
        currency_paid,
        payment_status,
        number_of_guests,
        payment_method,
        paid_at,
        transaction_id,
        places!place_id (
          id,
          name,
          banner_image_link,
          avg_price,
          rating,
          country,
          city,
          address
        )
      `,
      )
      .eq("user_id", userId)
      .order("booking_date_time", { ascending: false });
    if (!joinError && bookingsWithPlaces && bookingsWithPlaces.length > 0) {
      const formatted = bookingsWithPlaces.map((b) => {
        const place = b.places || b.place || {};
        return {
          id: b.id,
          placeId: b.place_id || place.id,
          title: place.name || "Place",
          price: `$${place.avg_price || 0} per person`,
          imageUri: place.banner_image_link,
          isSmall: false,
          country: place.country,
          bookingRefNumber: b.booking_ref_number,
          bookingDateTime: b.booking_date_time,
          amountPaid: b.amount_paid,
          currencyPaid: b.currency_paid,
          paymentStatus: b.payment_status,
          numberOfGuests: b.number_of_guests,
          paymentMethod: b.payment_method,
          paidAt: b.paid_at,
          transactionId: b.transaction_id,
        };
      });
      return res.json(formatted);
    }
    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, place_id, booking_date_time, booking_ref_number, amount_paid, currency_paid, payment_status, number_of_guests, payment_method, paid_at, transaction_id",
      )
      .eq("user_id", userId)
      .order("booking_date_time", { ascending: false });
    if (error) throw error;
    if (!bookings || bookings.length === 0) return res.json([]);
    const placeIds = [...new Set(bookings.map((b) => b.place_id).filter(Boolean))];
    const { data: places } = await supabaseAdmin
      .from("places")
      .select("id, name, banner_image_link, avg_price, rating, country, city, address")
      .in("id", placeIds);
    const placesMap = (places || []).reduce((acc, p) => {
      acc[String(p.id)] = p;
      return acc;
    }, {});
    const formatted = bookings.map((b) => {
      const place = placesMap[String(b.place_id)] || {};
      return {
        id: b.id,
        placeId: b.place_id,
        title: place.name || "Place",
        price: `$${place.avg_price || 0} per person`,
        imageUri: place.banner_image_link,
        isSmall: false,
        country: place.country,
        bookingRefNumber: b.booking_ref_number,
        bookingDateTime: b.booking_date_time,
        amountPaid: b.amount_paid,
        currencyPaid: b.currency_paid,
        paymentStatus: b.payment_status,
        numberOfGuests: b.number_of_guests,
        paymentMethod: b.payment_method,
        paidAt: b.paid_at,
        transactionId: b.transaction_id,
      };
    });
    return res.json(formatted);
  } catch (err) {
    console.error("api/bookings error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch bookings" });
  }
});

// Auth helpers (match userapp utils/auth.js)
const SALT_ROUNDS = 10000;
const sha256 = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");
const generateSalt = () => crypto.randomBytes(16).toString("hex");
const hashPassword = async (password) => {
  const salt = generateSalt();
  let hash = password + salt;
  for (let i = 0; i < SALT_ROUNDS; i++) hash = sha256(hash);
  return `${salt}:${hash}`;
};
const verifyPassword = async (password, storedHash) => {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  let h = password + salt;
  for (let i = 0; i < SALT_ROUNDS; i++) h = sha256(h);
  return h === hash;
};

/**
 * POST /api/auth/register
 * body: { firstName, lastName, phoneNumber, email, password, address, city, state, country, postalCode }
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const body = req.body || {};
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      password,
      address,
      city,
      state,
      country,
      postalCode,
    } = body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }
    const hashedPassword = await hashPassword(password);
    const userData = {
      first_name: firstName || "",
      last_name: lastName || "",
      phone_number: phoneNumber || "",
      email,
      password_hash: hashedPassword,
      address: address || "",
      city: city || "",
      state: state || "",
      country: country || "",
      postal_code: postalCode || "",
      created_at: new Date().toISOString(),
    };
    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert([userData])
      .select()
      .single();
    if (error) throw error;
    const formatted = {
      id: newUser.id,
      name: `${newUser.first_name} ${newUser.last_name}`,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phoneNumber: newUser.phone_number,
      address: {
        address: newUser.address,
        city: newUser.city,
        state: newUser.state,
        country: newUser.country,
        postalCode: newUser.postal_code,
      },
      createdAt: newUser.created_at,
    };
    return res.json({ success: true, user: formatted });
  } catch (err) {
    console.error("api/auth/register error:", err);
    return res.status(500).json({ error: err?.message || "Failed to register" });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const formatted = {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number,
      address: {
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        postalCode: user.postal_code,
      },
      createdAt: user.created_at,
    };
    return res.json({ success: true, user: formatted });
  } catch (err) {
    console.error("api/auth/login error:", err);
    return res.status(500).json({ error: err?.message || "Failed to login" });
  }
});

/**
 * PATCH /api/users/:userId
 * body: { firstName, lastName, phoneNumber, email, address, city, state, country, postalCode }
 */
app.patch("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const body = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const patch = {
      updated_at: new Date().toISOString(),
    };
    if (body.firstName != null) patch.first_name = body.firstName;
    else if (body.first_name != null) patch.first_name = body.first_name;
    if (body.lastName != null) patch.last_name = body.lastName;
    else if (body.last_name != null) patch.last_name = body.last_name;
    if (body.phoneNumber != null) patch.phone_number = body.phoneNumber;
    else if (body.phone_number != null) patch.phone_number = body.phone_number;
    if (body.email != null) patch.email = body.email;
    if (body.address != null) patch.address = body.address;
    if (body.city != null) patch.city = body.city;
    if (body.state != null) patch.state = body.state;
    if (body.country != null) patch.country = body.country;
    if (body.postalCode != null) patch.postal_code = body.postalCode;
    else if (body.postal_code != null) patch.postal_code = body.postal_code;
    const { error } = await supabaseAdmin.from("users").update(patch).eq("id", userId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error("api/users PATCH error:", err);
    return res.status(500).json({ error: err?.message || "Failed to update profile" });
  }
});

/**
 * PATCH /api/users/:userId/password
 * body: { currentPassword, newPassword }
 */
app.patch("/api/users/:userId/password", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body || {};
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    const { data: dbUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .single();
    if (fetchError || !dbUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const valid = await verifyPassword(currentPassword, dbUser.password_hash);
    if (!valid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    const hashedNew = await hashPassword(newPassword);
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password_hash: hashedNew, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updateError) throw updateError;
    return res.json({ success: true });
  } catch (err) {
    console.error("api/users/password error:", err);
    return res.status(500).json({ error: err?.message || "Failed to update password" });
  }
});

// ---------- Start ----------
// 0.0.0.0 = accept connections from any interface (needed for Android/device testing)
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(
    `✅ Spotnere backend running on http://localhost:${PORT} (also http://192.168.x.x:${PORT} on network)`,
  );
});

server.on("error", (err) => {
  console.error("❌ Server error:", err);
  if (err.code === "EADDRINUSE") {
    console.error(`   Port ${PORT} is already in use. Try a different PORT.`);
  } else if (err.code === "EACCES" || err.code === "EPERM") {
    console.error(
      `   Permission denied. Try PORT > 1024 or run with appropriate permissions.`,
    );
  }
  process.exit(1);
});

// Prevent silent exit from uncaught errors
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("❌ Unhandled rejection:", reason);
});
