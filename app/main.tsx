import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import SevenPrototype from "./SevenPrototype";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SevenPrototype />
  </StrictMode>,
);
