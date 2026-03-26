/**
 * Price copy for listings/details from places.charge_per_guest.
 * true → per person; false / null / undefined → per hour
 */

export function getPriceUnitLabel(chargePerGuest) {
  return chargePerGuest === true ? "per person per hour" : "per hour";
}

/** Home / favorites / reels listings use $ prefix */
export function formatListingPrice(avgPrice, chargePerGuest) {
  const n = avgPrice ?? 0;
  return `$${n} ${getPriceUnitLabel(chargePerGuest)}`;
}
