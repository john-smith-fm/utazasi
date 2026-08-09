"use client";

import { useEffect, useState } from "react";
import { TRIP } from "@/data/trip";

export type CurrentLocationContext = {
  latitude: number;
  longitude: number;
  label: string;
  source: "device" | "trip";
  seaRelevant: boolean;
};

const fallback: CurrentLocationContext = {
  latitude: TRIP.coords.lat,
  longitude: TRIP.coords.lon,
  label: "Villasimius",
  source: "trip",
  seaRelevant: true,
};

const knownLocations = [
  { label: "Villasimius", latitude: 39.1372, longitude: 9.5313, radiusKm: 18, seaRelevant: true },
  { label: "Cagliari", latitude: 39.2238, longitude: 9.1217, radiusKm: 18, seaRelevant: true },
  { label: "Budapest", latitude: 47.4979, longitude: 19.0402, radiusKm: 35, seaRelevant: false },
] as const;

function distanceKm(a: Pick<CurrentLocationContext, "latitude" | "longitude">, b: Pick<CurrentLocationContext, "latitude" | "longitude">) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitude = radians(b.latitude - a.latitude);
  const longitude = radians(b.longitude - a.longitude);
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function contextForDevicePosition(latitude: number, longitude: number): CurrentLocationContext {
  const matched = knownLocations.find((place) => distanceKm({ latitude, longitude }, place) <= place.radiusKm);
  return {
    latitude,
    longitude,
    label: matched?.label ?? "Aktuális hely",
    source: "device",
    // Unknown locations stay conservative: do not present a sea temperature
    // unless the app can establish that the location is coastal.
    seaRelevant: matched?.seaRelevant ?? false,
  };
}

/**
 * The Home header means “where we are now”, never the day currently browsed.
 * It does not prompt for permission on load: an already granted device location
 * is used, otherwise the approved Trip base location remains the fallback.
 */
export function useCurrentLocationContext() {
  const [context, setContext] = useState<CurrentLocationContext>(fallback);

  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator) || !("permissions" in navigator)) return;

    void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (permission.state !== "granted") return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) setContext(contextForDevicePosition(position.coords.latitude, position.coords.longitude));
        },
        () => undefined,
        { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 },
      );
    }).catch(() => undefined);

    return () => { cancelled = true; };
  }, []);

  return context;
}
