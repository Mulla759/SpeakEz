import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark";

export const fonts = {
  sans: "Karla_400Regular",
  sansMedium: "Karla_500Medium",
  sansSemibold: "Karla_600SemiBold",
  sansBold: "Karla_700Bold",
  serif: "Newsreader_400Regular",
  serifMedium: "Newsreader_500Medium",
  serifSemibold: "Newsreader_600SemiBold",
  serifBold: "Newsreader_700Bold",
  serifItalic: "Newsreader_500Medium_Italic",
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const type = {
  hero: 40,
  display: 32,
  title: 24,
  heading: 17,
  body: 15,
  support: 13,
  meta: 11,
  reading: 19,
} as const;

export const lineHeight = {
  reading: 30,
  excerpt: 27,
} as const;

/**
 * Type roles from the Pencil design. The rule of the system: the app speaks in
 * Karla (sans), the students speak in Newsreader (serif). Headlines that carry a
 * student's words (note titles, prompts, editorial headlines) are serif 500;
 * utility headings (screen titles, settings, onboarding steps) stay sans bold.
 */
export const textStyle = {
  // Serif voice (content)
  displaySerif: { fontFamily: fonts.serifMedium, fontSize: type.display, lineHeight: 36, letterSpacing: -0.6 },
  titleSerif: { fontFamily: fonts.serifMedium, fontSize: type.title, lineHeight: 27, letterSpacing: -0.3 },
  rowTitleSerif: { fontFamily: fonts.serifMedium, fontSize: type.reading, lineHeight: 24, letterSpacing: -0.1 },
  headingSerif: { fontFamily: fonts.serifMedium, fontSize: type.heading, lineHeight: 21, letterSpacing: -0.1 },
  chipSerif: { fontFamily: fonts.serifItalic, fontSize: type.body, lineHeight: 19 },
  reading: { fontFamily: fonts.serif, fontSize: type.reading, lineHeight: lineHeight.reading },
  excerpt: { fontFamily: fonts.serif, fontSize: type.reading, lineHeight: lineHeight.excerpt },
  wordmark: { fontFamily: fonts.serifItalic, fontSize: 28, letterSpacing: -0.6 },
  // Sans voice (interface)
  hero: { fontFamily: fonts.sansBold, fontSize: type.hero, lineHeight: 44, letterSpacing: -1.2 },
  displaySans: { fontFamily: fonts.sansBold, fontSize: type.display, lineHeight: 35, letterSpacing: -1 },
  titleSans: { fontFamily: fonts.sansBold, fontSize: type.title, lineHeight: 27, letterSpacing: -0.7 },
  headingSans: { fontFamily: fonts.sansBold, fontSize: type.heading, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: fonts.sans, fontSize: type.body, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansBold, fontSize: type.body, lineHeight: 22 },
  support: { fontFamily: fonts.sans, fontSize: type.support, lineHeight: 19 },
  supportStrong: { fontFamily: fonts.sansBold, fontSize: type.support, lineHeight: 19 },
  meta: { fontFamily: fonts.sans, fontSize: type.meta, lineHeight: 15 },
  caps: { fontFamily: fonts.sansBold, fontSize: type.meta, letterSpacing: 1.2 },
  capsLarge: { fontFamily: fonts.sansBold, fontSize: type.support, letterSpacing: 1.4 },
  barTitle: { fontFamily: fonts.sansSemibold, fontSize: type.body },
} as const;

/** Elevation from the design: controls sit close to the surface, floating chrome lifts more. */
export const shadow = {
  control: { shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  float: { shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  sheet: { shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
} as const;

/** Pressed-state feedback: rows and list items tint, controls dim slightly. */
export const pressed = {
  dim: 0.72,
  soft: 0.85,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  gutter: 24,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const motion = {
  press: 260,
  stretch: 190,
  settle: 420,
  stagger: 22,
} as const;

export type ColorTokens = {
  bg: string;
  surface: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  onAccent: string;
  accentWash: string;
  accentLine: string;
  accentClear: string;
  tint: string;
  frost: string;
  glass: string;
  glassStrong: string;
  glassStroke: string;
  glassShadow: string;
  scrim: string;
  danger: string;
  dangerSoft: string;
  waveMuted: string;
  ring: string;
  bgClear: string;
  bgVeil: string;
  surfaceClear: string;
  controlLine: string;
  mapGround: string;
  mapBlock: string;
  mapPark: string;
  mapWater: string;
  mapRoad: string;
  mapLabel: string;
  mapLandmark: string;
  mapPath: string;
  mapTunnel: string;
  /** QR codes stay dark-on-light in both themes so any scanner reads them. */
  qrDark: string;
  qrLight: string;
};

const light: ColorTokens = {
  bg: "#F7F6F3",
  surface: "#FDFCF9",
  ink: "#1C1D1F",
  ink2: "#4A4D52",
  ink3: "#676B71",
  line: "#E2E3DF",
  accent: "#6B4FA0",
  accentSoft: "#EEE8F6",
  accentText: "#553C85",
  onAccent: "#FAF8FC",
  accentWash: "#6B4FA01A",
  accentLine: "#6B4FA059",
  accentClear: "#6B4FA000",
  tint: "#1C1D1F0D",
  frost: "#FFFFFF99",
  glass: "#FFFFFFD1",
  glassStrong: "#FAFAF8F0",
  glassStroke: "#1C1D1F14",
  glassShadow: "#1C1D1F1A",
  scrim: "#1C1D1F4D",
  danger: "#A63D33",
  dangerSoft: "#F7E8E5",
  waveMuted: "#C7CACD",
  ring: "#FCFCFA",
  bgClear: "#F7F6F300",
  bgVeil: "#F7F6F3EB",
  surfaceClear: "#FFFFFF00",
  controlLine: "#7E8287",
  mapGround: "#ECEEED",
  mapBlock: "#DFE2E1",
  mapPark: "#DCE6DC",
  mapWater: "#CCDCE4",
  mapRoad: "#FAFAF9",
  mapLabel: "#5F6664",
  mapLandmark: "#D2D8D5",
  mapPath: "#FCFCFA",
  mapTunnel: "#8A938F",
  qrDark: "#1C1D1F",
  qrLight: "#FFFFFF",
};

const dark: ColorTokens = {
  bg: "#121314",
  surface: "#1B1D1F",
  ink: "#ECEAE6",
  ink2: "#C6C3BE",
  ink3: "#9C9995",
  line: "#2C2F32",
  accent: "#B7A0E0",
  accentSoft: "#26203A",
  accentText: "#CDBDF0",
  onAccent: "#17122A",
  accentWash: "#B7A0E024",
  accentLine: "#B7A0E066",
  accentClear: "#B7A0E000",
  tint: "#FFFFFF12",
  frost: "#1B1D1F99",
  glass: "#232528C7",
  glassStrong: "#1B1D1FF2",
  glassStroke: "#FFFFFF1F",
  glassShadow: "#0B0C0D66",
  scrim: "#0B0C0D80",
  danger: "#E59A90",
  dangerSoft: "#2E1C1A",
  waveMuted: "#3B3F43",
  ring: "#121314",
  bgClear: "#12131400",
  bgVeil: "#121314EB",
  surfaceClear: "#1B1D1F00",
  controlLine: "#77746F",
  mapGround: "#1A1C1E",
  mapBlock: "#25282B",
  mapPark: "#1C2620",
  mapWater: "#16222B",
  mapRoad: "#2A2D31",
  mapLabel: "#8F9699",
  mapLandmark: "#30353A",
  mapPath: "#343A3E",
  mapTunnel: "#5E6669",
  qrDark: "#1C1D1F",
  qrLight: "#FFFFFF",
};

export const palette: Record<ThemeMode, ColorTokens> = { light, dark };

let override: ThemeMode | null = null;
const listeners = new Set<() => void>();

export function setThemeOverride(mode: ThemeMode | null): void {
  override = mode;
  listeners.forEach((listener) => listener());
}

export function getThemeOverride(): ThemeMode | null {
  return override;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const ThemeScopeContext = createContext<ThemeMode | null>(null);

export function ThemeScope({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  return createElement(ThemeScopeContext.Provider, { value: mode }, children);
}

export function useThemeMode(): ThemeMode {
  const scoped = useContext(ThemeScopeContext);
  const systemMode: ThemeMode = useColorScheme() === "dark" ? "dark" : "light";
  const globalMode = useSyncExternalStore(subscribe, () => override ?? systemMode);
  void scoped; void globalMode;
  return "light";
}

export function useTheme(): ColorTokens {
  return palette[useThemeMode()];
}

/** True when the system asks for reduced motion; loops and slides should then collapse to static. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
