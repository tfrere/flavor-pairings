import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme/theme";
import { revealSplash } from "./splash";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

// App reveals the splash once data + fonts are ready; this is only a
// backstop so a failed fetch can't leave the spinner up forever
setTimeout(revealSplash, 6000);
