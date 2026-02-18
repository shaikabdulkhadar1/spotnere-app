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

      await updateBookingById(booking.id, {
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
