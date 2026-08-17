import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import ButtonBase from "@mui/material/ButtonBase";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { usePairData, topPartners } from "./data";
import type { Partner } from "./types";
import { IngredientImg } from "./components/molecules/IngredientVisual";
import { IngredientSearch } from "./components/molecules/IngredientSearch";
import { PairCard } from "./components/molecules/PairCard";
import { PairDialog } from "./components/organisms/PairDialog";
import { AboutDialog } from "./components/organisms/AboutDialog";

function shuffle(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Marquee wrapper that eases the CSS animation's playbackRate toward 0 on
 * hover (and back to 1 on leave) so the strip decelerates smoothly instead
 * of freezing.
 */
function SmoothMarquee({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const target = useRef(1);

  useEffect(() => {
    let raf = 0;
    let rate = 1;
    const tick = () => {
      rate += (target.current - rate) * 0.055;
      const anim = trackRef.current?.getAnimations()[0];
      if (anim) anim.playbackRate = Math.max(0, rate);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Box
      onMouseEnter={() => { target.current = 0; }}
      onMouseLeave={() => { target.current = 1; }}
      sx={{
        width: "100vw",
        overflow: "hidden",
        mb: 4.5,
        maskImage:
          "linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)",
      }}
    >
      <Box
        ref={trackRef}
        sx={{
          display: "flex",
          width: "max-content",
          gap: { xs: 2.5, md: 4 },
          // the animated transform isolates blending, so the cream
          // backdrop must live on this element for multiply to work
          bgcolor: "background.default",
          animation: "hero-marquee 90s linear infinite",
          "@keyframes hero-marquee": {
            from: { transform: "translateX(0)" },
            to: { transform: "translateX(-50%)" },
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function App() {
  const { data, byIng } = usePairData();
  const [selected, setSelected] = useState<number | null>(null);
  const [weight, setWeight] = useState(0.35);
  const [dialogPartner, setDialogPartner] = useState<Partner | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  // fresh random picks on every page load
  const marquee = useMemo(
    () => (data ? shuffle(data.ingredients.length).slice(0, 20) : []),
    [data],
  );

  if (!data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 20 }}>
        <CircularProgress />
      </Box>
    );
  }

  const select = (i: number) => setSelected(i);

  const ing = selected !== null ? data.ingredients[selected] : null;
  const top = selected !== null
    ? topPartners(byIng, selected, weight, new Set([selected]))
    : [];
  const landing = selected === null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {landing ? (
        /* hero + search: centered in the space left above the footer, so
            the whole landing (footer included) fits in the first viewport */
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 3,
            pt: 4,
            pb: 10, // keeps the overlaid footer clear of the hero content
          }}
        >
          {/* clickable marquee of illustrations above the title, full-bleed
              with faded edges; decelerates smoothly on hover */}
          <SmoothMarquee>
            {[...marquee, ...marquee].map((i, k) => {
              const s = data.ingredients[i];
              return (
                <ButtonBase
                  key={k}
                  onClick={() => select(i)}
                  disableRipple
                  aria-label={`Explore ${s.en}`}
                  tabIndex={k < marquee.length ? 0 : -1}
                  sx={{
                    width: { xs: 150, md: 210 },
                    flexShrink: 0,
                    "&:hover img": { transform: "scale(1.07)" },
                  }}
                >
                  <Box sx={{ aspectRatio: "1 / 1", width: "100%" }}>
                    <IngredientImg ing={s} sizes="210px" />
                  </Box>
                </ButtonBase>
              );
            })}
          </SmoothMarquee>

          <Typography variant="h1" sx={{ fontSize: "clamp(52px, 8vw, 92px)" }}>
            Flavor Pairings
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 17.5, mt: 1.5, mb: 3.5, maxWidth: 580 }}>
            Find what goes with your ingredients:{" "}
            <Box component="span" sx={{ color: "secondary.main", fontWeight: 600 }}>500,000 recipes</Box>
            {" "}on one side,{" "}
            <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>aroma molecules</Box>
            {" "}on the other.
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 640 }}>
            <IngredientSearch ingredients={data.ingredients} onSelect={select} />
          </Box>

          <Button
            startIcon={<HelpOutlineIcon />}
            onClick={() => setAboutOpen(true)}
            sx={{ mt: 4, color: "text.secondary", fontWeight: 500 }}
          >
            How does it work?
          </Button>
        </Box>
      ) : (
        /* compact sticky header: title + search stay visible while scrolling */
        <>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: "appBar",
              bgcolor: "rgba(247, 241, 222, 0.92)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Container maxWidth="lg">
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems="center"
                spacing={{ xs: 1.5, sm: 4 }}
                sx={{ pt: 5, pb: 2.5 }}
              >
                <Typography
                  variant="h1"
                  onClick={() => setSelected(null)}
                  title="Back to home"
                  sx={{ fontSize: 30, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Flavor Pairings
                </Typography>
                <Box sx={{ flex: 1, width: "100%" }}>
                  <IngredientSearch ingredients={data.ingredients} onSelect={select} />
                </Box>
              </Stack>
            </Container>
          </Box>

          {/* selected-ingredient header: airy strip on the page background */}
          {ing && (
            <Container maxWidth="lg">
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems="center"
                justifyContent="space-between"
                spacing={{ xs: 3, md: 6 }}
                sx={{ pt: { xs: 2, md: 2.5 }, pb: 1 }}
              >
                {/* centered column on mobile, row on larger screens */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 2, sm: 3.5 }}
                  alignItems="center"
                  sx={{ minWidth: 0, textAlign: { xs: "center", sm: "left" } }}
                >
                  {/* frameless: the illustration background blends into the page */}
                  <Box sx={{ width: { xs: 184, md: 227 }, flexShrink: 0 }}>
                    <Box sx={{ aspectRatio: "1 / 1" }}>
                      <IngredientImg ing={ing} sizes="227px" />
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        color: "text.secondary",
                        mb: 0.25,
                      }}
                    >
                      Pairings for
                    </Typography>
                    <Typography
                      variant="h2"
                      sx={{ fontSize: { xs: 36, md: 48 }, lineHeight: 1.05, textTransform: "capitalize" }}
                    >
                      {ing.en}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ mt: 1, justifyContent: { xs: "center", sm: "flex-start" } }}
                    >
                      <Typography variant="body2" sx={{ color: "secondary.main", fontWeight: 600 }}>
                        {ing.nrec.toLocaleString("en-US")} recipes
                      </Typography>
                      <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600 }}>
                        {ing.nmol} molecules
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                {/* pairing-style mix: live percentages at both ends make the
                    trade-off readable at a glance */}
                <Box sx={{ width: { xs: "100%", md: 340 }, flexShrink: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ justifyContent: "center", mb: 0.75 }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        color: "text.secondary",
                      }}
                    >
                      Ranking mix
                    </Typography>
                    <Tooltip
                      arrow
                      placement="top"
                      title={
                        <>
                          Partners are ranked by blending two signals: <b>tradition</b> — how
                          often the pair appears together across 500,000 recipes — and{" "}
                          <b>chemistry</b> — how many aroma molecules the two ingredients share.
                          Drag the handle to change the blend.
                        </>
                      }
                    >
                      <InfoOutlinedIcon
                        sx={{ fontSize: 14, color: "text.secondary", cursor: "help" }}
                      />
                    </Tooltip>
                  </Stack>
                  {/* value is the tradition share so the green track on the
                      left visually matches the left-hand label; labels sit
                      below the rail so the slider width never depends on
                      the text length */}
                  <Slider
                    value={(1 - weight) * 100}
                    onChange={(_, v) => setWeight(1 - (v as number) / 100)}
                    aria-label="Ranking mix, share of tradition versus chemistry"
                    sx={{
                      py: 1.5,
                      "& .MuiSlider-rail": {
                        opacity: 1,
                        height: 6,
                        bgcolor: "primary.main",
                      },
                      "& .MuiSlider-track": {
                        height: 6,
                        border: "none",
                        bgcolor: "secondary.main",
                      },
                      "& .MuiSlider-thumb": {
                        width: 20,
                        height: 20,
                        bgcolor: "background.paper",
                        border: "3px solid",
                        borderColor: "text.primary",
                        boxShadow: "0 1px 4px rgba(70,45,20,.25)",
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 7px rgba(70,45,20,.1)",
                        },
                      },
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: -0.5 }}>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        whiteSpace: "nowrap",
                        color: "secondary.main",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {Math.round((1 - weight) * 100)}% tradition
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        whiteSpace: "nowrap",
                        color: "primary.main",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {Math.round(weight * 100)}% chemistry
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Container>
          )}
        </>
      )}

      <Container maxWidth="lg">
        {/* results */}
        {ing && selected !== null && (
          <Box sx={{ mt: 4.5 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(5, 1fr)",
                },
                gap: 3.5,
              }}
            >
              {top.map((p) => (
                <PairCard
                  key={p.other}
                  ing={data.ingredients[p.other]}
                  partner={p}
                  tags={data.tags}
                  onOpen={() => setDialogPartner(p)}
                />
              ))}
            </Box>
          </Box>
        )}
      </Container>

      {/* footer: overlaid at the bottom on landing so the hero stays truly
          centered in the viewport; normal flow otherwise */}
      <Box
        component="footer"
        sx={
          landing
            ? { position: "absolute", bottom: 0, left: 0, right: 0, pb: 4, px: 3 }
            : { mt: "auto", pt: 10, pb: 6, px: 3 }
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          A cooking experiment by{" "}
          <Link href="https://tfrere.com" target="_blank" rel="noopener">Thibaud Frere</Link>
        </Typography>
      </Box>

      <AboutDialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        nIngredients={data.ingredients.length}
        nPairs={data.pairs.length}
      />

      <PairDialog
        a={ing}
        partner={dialogPartner}
        data={data}
        onClose={() => setDialogPartner(null)}
        onExplore={select}
      />

    </Box>
  );
}
