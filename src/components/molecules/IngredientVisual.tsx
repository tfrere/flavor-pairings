import { useState } from "react";
import { styled } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import type { Ingredient } from "../../types";
import { CAT_EMOJI } from "../../types";

export function slug(en: string): string {
  return en.replace(/\s+/g, "-");
}

const Wrap = styled("span")({
  position: "relative",
  display: "block",
  width: "100%",
  height: "100%",
});

const Img = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  opacity: 0,
  transition: "opacity .3s ease, transform .25s ease",
  // illustrations have a pure-white background; multiply makes it vanish
  // on any surface (white cards stay light, the cream page tints through)
  mixBlendMode: "multiply",
  "&.loaded": { opacity: 1 },
});

const Center = styled("span")({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

/**
 * Responsive ingredient illustration with a loading spinner and emoji
 * fallback. Fills its parent box; the parent decides the frame (radius,
 * border, aspect ratio).
 */
export function IngredientImg({
  ing,
  sizes,
  className,
  spinnerSize = 18,
  inset = 0,
  spinner = true,
}: {
  ing: Ingredient;
  /** HTML `sizes` attribute, e.g. "96px" or "(max-width:600px) 45vw, 220px" */
  sizes: string;
  className?: string;
  spinnerSize?: number;
  /** breathing room (px) between the illustration and its frame */
  inset?: number;
  /** hide the loading placeholder (e.g. hero marquee: the splash covers it) */
  spinner?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const base = import.meta.env.BASE_URL;
  const s = slug(ing.en);

  if (failed) {
    return (
      <Wrap aria-hidden>
        <Center style={{ fontSize: "1.4em" }}>{CAT_EMOJI[ing.cat]}</Center>
      </Wrap>
    );
  }

  return (
    <Wrap aria-hidden>
      {!loaded && spinner && (
        <Center>
          <CircularProgress size={spinnerSize} thickness={4.5} sx={{ color: "divider" }} />
        </Center>
      )}
      <Img
        className={`${className ?? ""} ${loaded ? "loaded" : ""}`}
        style={inset ? { padding: inset } : undefined}
        srcSet={`${base}img/sm/${s}.webp 160w, ${base}img/${s}.webp 320w`}
        sizes={sizes}
        src={`${base}img/${s}.webp`}
        alt=""
        loading="lazy"
        ref={(el) => {
          // cached images may be complete before onLoad is attached
          if (el?.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </Wrap>
  );
}

const Frame = styled("span")(({ theme }) => ({
  overflow: "hidden",
  display: "inline-flex",
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
}));

/** Small round (or rounded) avatar variant of the illustration. */
export function IngredientVisual({
  ing,
  size = 44,
  round = true,
}: {
  ing: Ingredient;
  size?: number;
  round?: boolean;
}) {
  return (
    <Frame
      style={{
        width: size,
        height: size,
        borderRadius: round ? "50%" : 10,
        fontSize: size * 0.55,
      }}
      aria-hidden
    >
      <IngredientImg
        ing={ing}
        sizes={`${size}px`}
        spinnerSize={Math.max(12, Math.min(20, Math.round(size * 0.4)))}
      />
    </Frame>
  );
}
