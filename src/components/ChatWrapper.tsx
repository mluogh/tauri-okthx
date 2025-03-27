import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

import Chat from "./Chat";

import "@llamaindex/chat-ui/styles/markdown.css";
import "./Chat.css";
import { useState, useRef, useEffect } from "react";

export function ChatWrapper() {
  const noDragSelector = "input, a, button, form, img"; // CSS selector
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (!e || !e.target || (e.target as HTMLElement).closest(noDragSelector))
      return; // a non-draggable element either in target or its ancestors
    await getCurrentWindow().startDragging();
  };

  // Add resize observer to watch for height changes
  useEffect(() => {
    if (!chatContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setContainerHeight(height);

        (async () => {
          const currentSize = await getCurrentWindow().innerSize();

          await getCurrentWindow().setSize(
            new LogicalSize(currentSize.width, height)
          );
        })();
      }
    });

    resizeObserver.observe(chatContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div onMouseDown={handleMouseDown} ref={chatContainerRef}>
      <Chat />
    </div>
  );
}

export default ChatWrapper;
