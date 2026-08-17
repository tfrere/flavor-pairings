import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import GitHubIcon from "@mui/icons-material/GitHub";

const GITHUB_URL = "https://github.com/tfrere/flavor-pairings";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  nIngredients: number;
  nPairs: number;
}

function ScorePanel({
  color,
  title,
  subtitle,
  children,
}: {
  color: "primary.main" | "secondary.main";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 2.5,
        borderRadius: "10px",
        border: 1,
        borderColor: "divider",
        borderTop: 3,
        borderTopColor: color,
        bgcolor: "background.default",
      }}
    >
      <Typography
        sx={{
          fontFamily: "'Fraunces', serif",
          fontSize: 21,
          fontWeight: 600,
          color,
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "text.secondary",
          mb: 1,
        }}
      >
        {subtitle}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: "text.secondary",
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

export function AboutDialog({ open, onClose, nIngredients, nPairs }: AboutDialogProps) {
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
      <DialogContent sx={{ p: { xs: 3, sm: 4.5 } }}>
        <Typography variant="h2" sx={{ fontSize: 30 }}>
          How does it work?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Every pairing is scored with two independent signals, one cultural and
          one chemical. The slider lets you decide how much each one counts.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <ScorePanel
            color="secondary.main"
            title="Tradition"
            subtitle="What cooks already do"
          >
            How strongly two ingredients are associated across ~500,000 real
            recipes, using normalized co-occurrence (NPMI). The collective
            wisdom of home cooking.
          </ScorePanel>
          <ScorePanel
            color="primary.main"
            title="Chemistry"
            subtitle="What molecules suggest"
          >
            The share of aroma molecules two ingredients have in common,
            from lab-measured compounds. Ingredients that smell alike may
            work together, even if nobody has dared yet.
          </ScorePanel>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
          A pairing that scores high on <b>tradition</b> is a safe, proven
          match. A pairing that scores high on <b>chemistry</b> but low on
          tradition is uncharted territory: that is where the interesting
          experiments live.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2.5, sm: 4 }}>
          <Box sx={{ flex: 1 }}>
            <SectionTitle>Data</SectionTitle>
            <Typography variant="body2" color="text.secondary">
              {nIngredients} ingredients, {nPairs.toLocaleString("en-US")} scored
              pairs. Built from{" "}
              <Link href="https://huggingface.co/datasets/mbien/recipe_nlg" target="_blank" rel="noopener">RecipeNLG</Link>,{" "}
              <Link href="https://foodb.ca" target="_blank" rel="noopener">FooDB</Link>{" "}
              and{" "}
              <Link href="https://www.foodatlas.ai" target="_blank" rel="noopener">FoodAtlas</Link>.
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <SectionTitle>Open source</SectionTitle>
            <Typography variant="body2" color="text.secondary">
              This project is 100% open source: app, data pipeline and
              illustrations are all on{" "}
              <Link
                href={GITHUB_URL}
                target="_blank"
                rel="noopener"
                sx={{ whiteSpace: "nowrap" }}
              >
                <GitHubIcon sx={{ fontSize: 14, verticalAlign: "-2px", mr: 0.4 }} />
                GitHub
              </Link>
              .
            </Typography>
          </Box>
        </Stack>

        <Button fullWidth variant="contained" onClick={onClose} sx={{ mt: 3.5 }}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
