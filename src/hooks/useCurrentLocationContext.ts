"use client";

import { useCallback, useEffect, useState } from "react";
import { TRIP } from "@/data/trip";
import { storageGet, storageSet } from "@/lib/storage";

export type CurrentLocationContext = {
  latitude: number;
  longitude: number;
  label: string;
  source: "device" | "trip";
  seaRelevant: boolean;
};

export type DeviceLocationState = "available" | "prompt" | "denied" | "unavailable" | "locating";

export type CurrentLocationResult = {
  context: CurrentLocationContext;
  deviceState: DeviceLocationState;
  requestDeviceLocation: () => void;
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

const LOCATION_CACHE_KEY = "current-location-context";
const LOCATION_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CachedLocation = { context: CurrentLocationContext; cachedAt: string };

function cachedDeviceContext(): CurrentLocationContext | null {
  const cached = storageGet<CachedLocation | null>(LOCATION_CACHE_KEY, null);
  if (!cached || cached.context.source !== "device" || !Number.isFinite(cached.context.latitude) || !Number.isFinite(cached.context.longitude)) return null;
  const cachedAt = Date.parse(cached.cachedAt);
  return Number.isFinite(cachedAt) && Date.now() - cachedAt <= LOCATION_CACHE_MAX_AGE_MS ? cached.context : null;
}

function cacheDeviceContext(context: CurrentLocationContext) {
  storageSet<CachedLocation>(LOCATION_CACHE_KEY, { context, cachedAt: new Date().toISOString() });
}

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
 * A native location prompt is only triggered by the person's explicit action
 * in the Home UI. An already granted permission may refresh silently; an
 * already denied permission is respected and the Trip base remains the
 * fallback. The last granted device context stays only on this device for up
 * to twelve hours, so an offline PWA cold start keeps a coherent header.
 */
export function useCurrentLocationContext(): CurrentLocationResult {
  const [context, setContext] = useState<CurrentLocationContext>(fallback);
  const [deviceState, setDeviceState] = useState<DeviceLocationState>("unavailable");

  const requestDeviceLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setDeviceState("unavailable");
      return;
    }

    setDeviceState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = contextForDevicePosition(position.coords.latitude, position.coords.longitude);
        cacheDeviceContext(next);
        setContext(next);
        setDeviceState("available");
      },
      (error) => setDeviceState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    const cached = cachedDeviceContext();
    if (cached) setContext(cached);
    if (!("geolocation" in navigator)) return;

    if (!("permissions" in navigator)) {
      // Older iOS versions do not expose Permissions API. Do not call
      // getCurrentPosition here: that would trigger a native prompt on Home
      // open. The explicit Home control will make the request instead.
      setDeviceState("prompt");
    } else {
      void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
        if (permission.state === "granted") requestDeviceLocation();
        else if (permission.state === "denied") setDeviceState("denied");
        else setDeviceState("prompt");
      }).catch(() => setDeviceState("prompt"));
    }

  }, [requestDeviceLocation]);

  return { context, deviceState, requestDeviceLocation };
}
