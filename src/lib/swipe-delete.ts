/** A destructive swipe must deliberately pass half of the device viewport. */
export function swipeDeleteOffset(deltaX: number, rowWidth: number) {
  return Math.max(-rowWidth, Math.min(0, deltaX));
}

export function completesSwipeDelete(offset: number) {
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  return -offset > viewportWidth / 2;
}
