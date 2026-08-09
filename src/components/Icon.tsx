"use client";

import {
  ArrowUp,
  Baby,
  Bath,
  Bed,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Droplet,
  Droplets,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  NotebookPen,
  Plus,
  Sun,
  Sunrise,
  Sunset,
  Umbrella,
  Utensils,
  Wallet,
  Waves,
  Wind,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "arrow-up": ArrowUp,
  baby: Baby,
  bed: Bed,
  "calendar-days": CalendarDays,
  "chevron-right": ChevronRight,
  "circle-help": CircleHelp,
  "cloud-sun": CloudSun,
  droplet: Droplet,
  droplets: Droplets,
  home: Home,
  "log-out": LogOut,
  "map-pin": MapPin,
  "message-circle": MessageCircle,
  "notebook-pen": NotebookPen,
  plus: Plus,
  sun: Sun,
  sunrise: Sunrise,
  sunset: Sunset,
  toilet: Bath,
  umbrella: Umbrella,
  utensils: Utensils,
  wallet: Wallet,
  waves: Waves,
  wind: Wind,
  x: X,
};

interface IconProps extends LucideProps {
  name: keyof typeof icons | string;
}

/** Statikus importok: PWA offline induláskor nincs külön ikon-chunk. */
export function Icon({ name, size = 18, strokeWidth = 2, ...props }: IconProps) {
  const LucideIcon = icons[name];
  return LucideIcon ? <LucideIcon size={size} strokeWidth={strokeWidth} {...props} /> : null;
}
