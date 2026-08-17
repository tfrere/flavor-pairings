import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { styled } from "@mui/material/styles";
import type { Ingredient, Partner, PairData } from "../../types";
import { IngredientImg } from "../molecules/IngredientVisual";

/* full-bleed hero: the two illustrations glued edge to edge across the dialog */
const Hero = styled("div")(({ theme }) => ({
  position: "relative",
  display: "flex",
  borderBottom: `1px solid ${theme.palette.divider}`,
  // slightly lighter than the page cream, but not white
  backgroundColor: "#fbf8eb",
}));

const Half = styled("span")(({ theme }) => ({
  width: "50%",
  aspectRatio: "5 / 4",
  display: "block",
  overflow: "hidden",
  "& + &": { borderLeft: `1px solid ${theme.palette.divider}` },
}));

const SectionLabel = styled(Typography)(({ theme }) => ({
  ...theme.typography.overline,
  color: theme.palette.text.secondary,
  display: "block",
  lineHeight: 2,
}));

/* score card: centered giant serif number, outlined but unfilled */
const ScoreBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 14,
  padding: theme.spacing(1.75, 2, 1.5),
  flex: 1,
  textAlign: "center",
}));

/* the "/100" denominator: quiet, serif, tinted like its score */
const OutOf = styled("span")({
  fontFamily: "'Fraunces', serif",
  fontSize: 15,
  fontWeight: 500,
  opacity: 0.45,
  marginLeft: 5,
  letterSpacing: "0.02em",
});

export function PairDialog({
  a,
  partner,
  data,
  onClose,
  onExplore,
}: {
  a: Ingredient | null;
  partner: Partner | null;
  data: PairData;
  onClose: () => void;
  onExplore: (index: number) => void;
}) {
  const open = a !== null && partner !== null;
  // retain the last shown pairing so content stays mounted during the
  // dialog's fade-out (otherwise the paper collapses empty mid-transition)
  const [retained, setRetained] = useState<{ a: Ingredient; partner: Partner } | null>(null);
  useEffect(() => {
    if (a && partner) setRetained({ a, partner });
  }, [a, partner]);
  const ra = a ?? retained?.a ?? null;
  const rp = partner ?? retained?.partner ?? null;
  const b = rp ? data.ingredients[rp.other] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(43, 33, 24, 0.35)",
            // blur lives on a pseudo-element that is never opacity-animated:
            // Chromium drops backdrop-filter after a transition ends on the
            // same element (the backdrop itself fades in/out)
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backdropFilter: "blur(7px)",
            },
          },
        },
      }}
    >
      {ra && rp && b && (
        <DialogContent sx={{ p: 0 }}>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            size="small"
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 2,
              color: "text.secondary",
              bgcolor: "rgba(255,255,255,.85)",
              border: 1,
              borderColor: "divider",
              "&:hover": { bgcolor: "background.paper" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Hero>
            <Half>
              <IngredientImg ing={ra} sizes="300px" />
            </Half>
            <Half>
              <IngredientImg ing={b} sizes="300px" />
            </Half>
          </Hero>

          <Box sx={{ p: { xs: 2.5, sm: 3.5 }, pt: { xs: 2.5, sm: 3 } }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 26, sm: 32 },
                lineHeight: 1.2,
                textAlign: "center",
                mb: 2.5,
                textTransform: "capitalize",
              }}
            >
              {ra.en}
              <Box component="span" sx={{ color: "primary.main", mx: 1.2, fontWeight: 400 }}>×</Box>
              {b.en}
            </Typography>

            {/* what they share */}
            {rp.tags.length > 0 && (
              <Box sx={{ mb: 3, textAlign: "center" }}>
                <SectionLabel sx={{ mb: 0.75 }}>What they share</SectionLabel>
                <Stack
                  direction="row"
                  spacing={0.8}
                  useFlexGap
                  flexWrap="wrap"
                  justifyContent="center"
                >
                  {rp.tags.map((t) => (
                    <Chip
                      key={t}
                      label={data.tags[t].en}
                      size="small"
                      variant="outlined"
                      sx={{
                        textTransform: "capitalize",
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "rgba(70,45,20,.25)",
                        bgcolor: "background.default",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
              <ScoreBox>
                <SectionLabel sx={{ color: "secondary.main", fontWeight: 700 }}>Tradition</SectionLabel>
                <Typography
                  sx={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 40,
                    fontWeight: 600,
                    color: "secondary.main",
                    lineHeight: 1.1,
                  }}
                >
                  {Math.round(rp.r / 10)}
                  <OutOf>/ 100</OutOf>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {rp.cooc.toLocaleString("en-US")} recipes together
                </Typography>
              </ScoreBox>
              <ScoreBox>
                <SectionLabel sx={{ color: "primary.main", fontWeight: 700 }}>Chemistry</SectionLabel>
                <Typography
                  sx={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 40,
                    fontWeight: 600,
                    color: "primary.main",
                    lineHeight: 1.1,
                  }}
                >
                  {Math.round(rp.m / 10)}
                  <OutOf>/ 100</OutOf>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {rp.nShared} shared molecules
                </Typography>
              </ScoreBox>
            </Stack>

            {/* molecules: quiet fine print */}
            {rp.comps.length > 0 && (
              <Box sx={{ mb: 1, textAlign: "center" }}>
                <SectionLabel sx={{ fontSize: 10 }}>Distinctive shared molecules</SectionLabel>
                <Typography
                  sx={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 10.5,
                    color: "text.disabled",
                    lineHeight: 1.9,
                    maxWidth: 430,
                    mx: "auto",
                    mt: 0.25,
                  }}
                >
                  {rp.comps.map((c) => data.molecules[c]).join("  ·  ")}
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              size="large"
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => { onExplore(rp.other); onClose(); }}
              sx={{ mt: 1.5, py: 1.4, fontSize: 16 }}
            >
              Explore {b.en}
            </Button>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
}
