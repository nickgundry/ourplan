export const colors = {
  // Surfaces
  bg:           "#FAF8F5",
  bgDeep:       "#F0EDE8",
  canvas:       "#FFFFFF",
  ink:          "#1C1917",
  inkMid:       "#57534E",
  inkLight:     "#A8A29E",
  inkGhost:     "#D6D3D1",
  border:       "#E7E5E2",
  borderMid:    "#D6D3D1",

  // Sage — primary accent
  sage:         "#4A7C59",
  sageMid:      "#6B9E7A",
  sageLight:    "#D4E8DA",
  sagePale:     "#EEF6F1",

  // Terracotta — warmth
  terracotta:   "#C2673A",
  terraPale:    "#FAEEE7",

  // Amber — secondary
  amber:        "#B45309",
  amberLight:   "#F59E0B",
  amberPale:    "#FEF3C7",

  // Slate — neutral action
  slate:        "#334155",
  slateMid:     "#64748B",
  slatePale:    "#F1F5F9",

  // Alert — used sparingly
  alert:        "#DC2626",
  alertPale:    "#FEF2F2",
  alertLight:   "#FCA5A5",

  // Purple — outside contacts / satellite
  purple:       "#7C3AED",
  purplePale:   "#F5F3FF",
  purpleLight:  "#C4B5FD",
} as const;

export const fonts = {
  display:      "Georgia",  // closest available serif on iOS; replace with Fraunces via expo-font
  body:         "System",
};

export const radius = {
  sm:  8,
  md:  14,
  lg:  20,
  xl:  24,
  full: 100,
};

export const shadow = {
  sm: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};
