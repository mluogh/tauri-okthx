import useEscape from "./hooks/useEscape";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";

import SnipOverlay from "./components/SnipOverlay";
import Chat from "./components/Chat";

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
    <ChakraProvider theme={theme}>
      <div className="container">
        <HashRouter>
          <Routes>
            <Route path="/" element={<SnipOverlay />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </HashRouter>
      </div>
    </ChakraProvider>
  );
}

export default App;
