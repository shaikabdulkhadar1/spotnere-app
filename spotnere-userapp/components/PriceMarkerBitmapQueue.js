import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { Image } from "expo-image";
import { fonts } from "../constants/fonts";

/**
 * Renders off-screen pill views and captures them as expo-image ImageRefs for
 * Google Maps marker icons (Android). iOS uses Map annotations instead.
 */
export function PriceMarkerBitmapQueue({ labels, onIcons }) {
  const viewRef = useRef(null);
  const cacheRef = useRef({});
  const queueRef = useRef([]);
  const capturingRef = useRef(false);
  const activeLabelRef = useRef(null);
  const captureRetryRef = useRef(0);
  const [activeLabel, setActiveLabel] = useState(null);

  useEffect(() => {
    activeLabelRef.current = activeLabel;
    if (activeLabel) captureRetryRef.current = 0;
  }, [activeLabel]);

  const finishLabel = useCallback(
    (label, imageRef) => {
      if (label && imageRef) {
        cacheRef.current[label] = imageRef;
        onIcons({ ...cacheRef.current });
      }
      capturingRef.current = false;
      setActiveLabel(null);
    },
    [onIcons],
  );

  const runCapture = useCallback(async () => {
    const label = activeLabelRef.current;
    if (!label) {
      capturingRef.current = false;
      setActiveLabel(null);
      return;
    }
    if (!viewRef.current) {
      if (captureRetryRef.current < 10) {
        captureRetryRef.current += 1;
        setTimeout(() => runCapture(), 48);
        return;
      }
      captureRetryRef.current = 0;
      capturingRef.current = false;
      finishLabel(label, null);
      return;
    }
    captureRetryRef.current = 0;
    try {
      await new Promise((r) => requestAnimationFrame(r));
      const uri = await captureRef(viewRef, { format: "png", quality: 1 });
      const normalized =
        typeof uri === "string" && uri.startsWith("file")
          ? uri
          : `file://${uri}`;
      const imageRef = await Image.loadAsync({ uri: normalized });
      finishLabel(label, imageRef);
    } catch {
      finishLabel(label, null);
    }
  }, [finishLabel]);

  const flushQueue = useCallback(() => {
    if (Platform.OS !== "android") return;
    if (capturingRef.current || activeLabelRef.current != null) return;
    const next = queueRef.current.shift();
    if (!next) return;
    capturingRef.current = true;
    setActiveLabel(next);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const uniq = [...new Set(labels)].filter(Boolean);
    for (const label of uniq) {
      if (cacheRef.current[label]) continue;
      if (!queueRef.current.includes(label)) {
        queueRef.current.push(label);
      }
    }
    flushQueue();
  }, [labels, flushQueue]);

  useEffect(() => {
    if (!activeLabel) {
      flushQueue();
      return;
    }
    const t = setTimeout(() => runCapture(), 72);
    return () => clearTimeout(t);
  }, [activeLabel, runCapture, flushQueue]);

  if (Platform.OS !== "android" || !activeLabel) {
    return null;
  }

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View
        key={activeLabel}
        ref={viewRef}
        collapsable={false}
        style={styles.pill}
      >
        <Text style={styles.pillText} numberOfLines={1}>
          {activeLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    left: -2000,
    top: 0,
    opacity: 1,
  },
  pill: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#000000",
  },
  pillText: {
    fontFamily: fonts.bold,
    color: "#000000",
    fontSize: 15,
  },
});
