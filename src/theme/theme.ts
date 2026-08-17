import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#b5691f" },
    secondary: { main: "#3d6b52" },
    // matches the cream background baked into the ingredient illustrations
    background: { default: "#f7f1de", paper: "#ffffff" },
    text: { primary: "#2b2118", secondary: "#8a7a68" },
    divider: "#eadfd2",
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
    h1: { fontFamily: "'Fraunces', serif", fontWeight: 400, letterSpacing: "-.015em" },
    h2: { fontFamily: "'Fraunces', serif", fontWeight: 450, letterSpacing: "-.01em" },
    h3: { fontFamily: "'Fraunces', serif", fontWeight: 450 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: [{ fontWeight: 500 }] } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});
