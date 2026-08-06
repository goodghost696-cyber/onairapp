import {
  Home, Utensils, Dumbbell, MessageCircle, Settings, Users, BarChart3,
  Clipboard, Droplet, Moon, Zap, Award, Key, Mic, Camera, Link as LinkIcon,
  Sun, Salad, Apple, Flame, Sparkles, Check, Footprints, Activity,
} from 'lucide-react'

// Was a hand-drawn SVG path set (no browser in this sandbox to visually
// verify path data against) — several came out visibly wrong/broken,
// reported directly. Swapped to lucide-react (MIT, actively maintained,
// the same icon family Feather/Radix use) instead of hand-rolling again —
// no API key involved, this is a static open-source icon set, not a
// generated/dynamic asset. Kept the same name-based <Icon name="..." />
// API so every call site across the app didn't need touching.
const ICONS = {
  home: Home,
  utensils: Utensils,
  dumbbell: Dumbbell,
  'message-circle': MessageCircle,
  settings: Settings,
  users: Users,
  'bar-chart': BarChart3,
  clipboard: Clipboard,
  droplet: Droplet,
  moon: Moon,
  zap: Zap,
  award: Award,
  key: Key,
  mic: Mic,
  camera: Camera,
  link: LinkIcon,
  sun: Sun,
  salad: Salad,
  apple: Apple,
  flame: Flame,
  sparkle: Sparkles,
  check: Check,
  footprints: Footprints,
  activity: Activity,
}

export default function Icon({ name, size = 20, strokeWidth = 1.8, className = '', style }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} style={{ flexShrink: 0, ...style }} />
}
