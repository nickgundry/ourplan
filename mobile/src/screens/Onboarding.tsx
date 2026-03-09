import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius } from "../theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🛡",
    title: "Ready before\nyou need it.",
    body: "Prepared helps your family know exactly what to do when a disaster happens — where to meet, who to call, and what to grab.",
    bg: "#2D4A35",
    textColor: "white",
  },
  {
    emoji: "📍",
    title: "One tap sends\nyour location.",
    body: "Hit Send Alert and everyone on your list gets your exact location and your full plan — even if local networks are down.",
    bg: colors.bg,
    textColor: colors.ink,
  },
  {
    emoji: "📵",
    title: "Works without\na signal.",
    body: "Your plan lives on your phone. No Wi-Fi, no problem. We'll send your alert the moment any connection is available.",
    bg: colors.bg,
    textColor: colors.ink,
  },
  {
    emoji: "👥",
    title: "Your whole\nfamily, covered.",
    body: "Add family members, set meeting places, and designate someone outside your area to coordinate if things get serious.",
    bg: colors.bg,
    textColor: colors.ink,
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export default function Onboarding({ onDone }: OnboardingProps) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (idx: number) => {
    setCurrent(idx);
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== current) setCurrent(idx);
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={s.root}>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((sl, i) => (
          <View key={i} style={[s.slide, { backgroundColor: sl.bg }]}>
            <SafeAreaView style={s.slideInner} edges={["top", "bottom"]}>
              <View style={s.slideContent}>
                <View style={[s.emojiWrap, i === 0 && { backgroundColor: "rgba(255,255,255,.15)" }]}>
                  <Text style={s.emoji}>{sl.emoji}</Text>
                </View>
                <Text style={[s.slideTitle, { color: sl.textColor }]}>{sl.title}</Text>
                <Text style={[s.slideBody,  { color: i === 0 ? "rgba(255,255,255,.75)" : colors.inkMid }]}>{sl.body}</Text>
              </View>
            </SafeAreaView>
          </View>
        ))}
      </ScrollView>

      {/* Fixed bottom controls */}
      <SafeAreaView style={[s.footer, { backgroundColor: slide.bg }]} edges={["bottom"]}>
        {/* Dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[
                s.dot,
                i === current && s.dotActive,
                current === 0 && { backgroundColor: i === 0 ? "white" : "rgba(255,255,255,.3)" },
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.footerBtns}>
          {isLast ? (
            <TouchableOpacity style={[s.primaryBtn, s.primaryBtnFull]} onPress={onDone}>
              <Text style={s.primaryBtnText}>Get started</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={onDone} style={s.skipBtn}>
                <Text style={[s.skipText, current === 0 && { color: "rgba(255,255,255,.6)" }]}>
                  Skip
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, current === 0 && { backgroundColor: "white" }]}
                onPress={() => goTo(current + 1)}
              >
                <Text style={[s.primaryBtnText, current === 0 && { color: colors.ink }]}>
                  Next
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  slide:        { width, flex: 1 },
  slideInner:   { flex: 1 },
  slideContent: { flex: 1, padding: 32, justifyContent: "center" },
  emojiWrap:    { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  emoji:        { fontSize: 40 },
  slideTitle:   { fontSize: 38, fontFamily: fonts.display, fontWeight: "400", letterSpacing: -0.8, lineHeight: 44, marginBottom: 18 },
  slideBody:    { fontSize: 17, lineHeight: 26 },
  footer:       { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  dots:         { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 20 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkGhost },
  dotActive:    { width: 20, backgroundColor: colors.sage },
  footerBtns:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  skipBtn:      { flex: 1, paddingVertical: 15, alignItems: "center" },
  skipText:     { fontSize: 15, color: colors.inkMid, fontWeight: "500" },
  primaryBtn:   { flex: 2, backgroundColor: colors.sage, borderRadius: radius.lg, paddingVertical: 16, alignItems: "center" },
  primaryBtnFull:{ flex: 1 },
  primaryBtnText:{ color: "white", fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
});
