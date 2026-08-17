import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme/theme";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

// fade the splash out once fonts are ready so the serif never flickers in;
// the 2.5s cap keeps a slow font CDN from blocking the app
const splash = document.getElementById("splash");
if (splash) {
  const reveal = () => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 400);
  };
  Promise.race([
    document.fonts.ready,
    new Promise((r) => setTimeout(r, 2500)),
  ]).then(reveal);
}
