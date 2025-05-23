import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

import Chat from "./Chat";

import "@llamaindex/chat-ui/styles/markdown.css";
import "./Chat.css";
import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function ChatWrapper() {
  // const noDragSelector = "input, a, button, form, img"; // CSS selector
  const noDragSelector =
    "prose, p, input, a, button, form, img, *::-webkit-scrollbar, *::-webkit-scrollbar-thumb"; // CSS selector for non-draggable elements including scrollbars

  const chatContainerRef = useRef<HTMLDivElement>(null);

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

        invoke("set_chat_height", { height });
      }
    });

    resizeObserver.observe(chatContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className="rounded-xl shadow-xl bg-background"
      onMouseDown={handleMouseDown}
      ref={chatContainerRef}
    >
      <div className="flex justify-start ml-2 mt-2">
        <button
          className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-md mb-2"
          onClick={() => invoke("hide_chat")}
        >
          ok thx
        </button>
      </div>
      <Chat />
    </div>
  );
}

export default ChatWrapper;
