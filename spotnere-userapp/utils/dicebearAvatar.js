import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "@spotnere_dicebear_style_";

/** Default style (matches previous hard-coded behavior). */
export const DEFAULT_AVATAR_STYLE = "avataaars";

/**
 * Curated DiceBear 9.x styles — same user seed looks consistent within each style.
 * @see https://www.dicebear.com/styles/
 */
export const AVATAR_STYLE_OPTIONS = [
  { id: "avataaars", label: "Avataaars" },
  { id: "lorelei", label: "Lorelei" },
  { id: "lorelei-neutral", label: "Lorelei Neutral" },
  { id: "notionists", label: "Notionists" },
  { id: "notionists-neutral", label: "Notionists Neutral" },
  { id: "adventurer", label: "Adventurer" },
  { id: "adventurer-neutral", label: "Adventurer Neutral" },
  { id: "big-smile", label: "Big Smile" },
  { id: "bottts", label: "Bottts" },
  { id: "croodles", label: "Croodles" },
  { id: "fun-emoji", label: "Fun Emoji" },
  { id: "personas", label: "Personas" },
];

export function getAvatarSeed(user) {
  return (
    user?.id ||
    user?.email ||
    `${user?.firstName || ""}${user?.lastName || ""}` ||
    "spotnere"
  );
}

/**
 * Full SVG URL for DiceBear (use with SvgUri).
 */
export function getDicebearSvgUri(user, styleId = DEFAULT_AVATAR_STYLE) {
  const seed = getAvatarSeed(user);
  const style = styleId || DEFAULT_AVATAR_STYLE;
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(String(seed))}`;
}

/**
 * PNG URL for thumbnails / Image (faster in grids).
 */
export function getDicebearPngUri(user, styleId, size = 128) {
  const seed = getAvatarSeed(user);
  const style = styleId || DEFAULT_AVATAR_STYLE;
  return `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(String(seed))}&size=${size}`;
}

export async function getStoredAvatarStyle(userId) {
  if (!userId) return DEFAULT_AVATAR_STYLE;
  try {
    const v = await AsyncStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (v && AVATAR_STYLE_OPTIONS.some((o) => o.id === v)) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_AVATAR_STYLE;
}

export async function setStoredAvatarStyle(userId, styleId) {
  if (!userId || !styleId) return;
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${userId}`, styleId);
  } catch {
    /* ignore */
  }
}
