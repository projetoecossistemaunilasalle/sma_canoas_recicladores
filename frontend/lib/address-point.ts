import type { AddressPoint, CurrentUser } from "./types";

/**
 * The point a signed-in citizen's collection checks run on, or null while
 * their address isn't complete — the house pin alone isn't enough, it needs
 * the street segment and side they confirmed for it.
 */
export function userAddressPoint(user: CurrentUser): AddressPoint | null {
  if (user.addressLat == null || user.addressLng == null || user.addressStreetId == null || user.addressSide == null) {
    return null;
  }
  return { lat: user.addressLat, lng: user.addressLng, streetId: user.addressStreetId, side: user.addressSide };
}
