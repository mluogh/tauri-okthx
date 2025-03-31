import React, { useState, useRef, useCallback, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

function Overlay() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const startPointRef = useRef({ x: 0, y: 0 });

  const reset = () => {
    setMousePosition({ x: -1000, y: -1000 });
    setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
    setIsSelecting(false);
  };

  useEffect(() => {
    const unlisten_start_screenshot = listen("start_screenshot", (event) => {
      reset();
    });

    return () => {
      unlisten_start_screenshot.then((f) => f());
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start selection
    setIsSelecting(true);
    const startPoint = { x: e.clientX, y: e.clientY };
    startPointRef.current = startPoint;
    setSelectionBox({ x: startPoint.x, y: startPoint.y, width: 0, height: 0 });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update mouse position for cursor ring
      setMousePosition({ x: e.clientX, y: e.clientY });

      if (!isSelecting) return;

      // Update selection box dimensions
      const startPoint = startPointRef.current;
      const width = e.clientX - startPoint.x;
      const height = e.clientY - startPoint.y;

      // Calculate the top-left corner of the box (handles negative width/height)
      const x = width >= 0 ? startPoint.x : e.clientX;
      const y = height >= 0 ? startPoint.y : e.clientY;

      // Set absolute values for width and height
      setSelectionBox({
        x,
        y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    },
    [isSelecting]
  );

  const handleMouseUp = useCallback(() => {
    // End selection
    const area = {
      x: selectionBox.x,
      y: selectionBox.y,
      width: selectionBox.width,
      height: selectionBox.height,
    };

    reset();

    invoke("switch_to_chat");

    invoke("screenshot", area).then((screenshot) => {
      console.log(screenshot);
    });
  }, [selectionBox]);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="transparent"
      cursor="crosshair"
      zIndex={9999}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Box
        position="absolute"
        top={`${mousePosition.y - 15}px`}
        left={`${mousePosition.x - 15}px`}
        width="30px"
        height="30px"
        borderRadius="50%"
        border="2px solid black"
        backgroundColor="white"
        pointerEvents="none"
      />

      {isSelecting && (
        <Box
          position="absolute"
          top={`${selectionBox.y}px`}
          left={`${selectionBox.x}px`}
          width={`${selectionBox.width}px`}
          height={`${selectionBox.height}px`}
          backgroundColor="rgba(128, 128, 128, 0.3)"
          border="1px solid rgba(0, 0, 0, 0.5)"
        />
      )}
    </Box>
  );
}

export default Overlay;
