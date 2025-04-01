import useEscape from "./hooks/useEscape";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";

import SnipOverlay from "./components/SnipOverlay";
import ChatWrapper from "./components/ChatWrapper";

import "./App.css";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { HashRouter, Routes, Route } from "react-router-dom";

const theme = extendTheme({
  styles: {
    global: (props: any) => ({
      body: {
        bg: "transparent", // Make body background transparent
      },
    }),
  },
  // Other theme customizations
});

function App() {
  useEscape();
  getCurrentWindow().setCursorIcon("crosshair");

  return (
    <div className="container rounded-xl overflow-hidden">
      <HashRouter>
        <Routes>
          <Route path="/" element={<SnipOverlay />} />
          <Route path="/chat" element={<ChatWrapper />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
