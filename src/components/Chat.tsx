import {
  ChatHandler,
  ChatSection,
  Message,
  ChatInput,
  ChatMessage,
  ChatMessages,
  useFile,
  useChatUI,
} from "@llamaindex/chat-ui";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { IoSend } from "react-icons/io5";
import { invoke } from "@tauri-apps/api/core";

import "@llamaindex/chat-ui/styles/markdown.css";
import { useEffect, useState } from "react";
import { CreateMessage, useChat } from "@ai-sdk/react";
import { customFetch } from "../lib/customFetch";
import CustomChatInputField from "./CustomChatInput";

import "./Chat.css";
import { Screenshot } from "./Screenshot";

interface ScreenshotItem {
  id: string;
  url: string;
  file: File;
}

export function Chat() {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);

  useEffect(() => {
    const unlisten_screenshot = listen("screenshot", (event) => {
      const uint8Array =
        event.payload instanceof Uint8Array
          ? event.payload
          : new Uint8Array(event.payload as number[]);
      const blob = new Blob([uint8Array], {
        type: "image/png",
      });

      const url = URL.createObjectURL(blob);
      const file = new File([blob], "screenshot.png", { type: "image/png" });

      // Generate a unique ID using timestamp
      const id = Date.now().toString();

      // Add to the list of screenshots instead of replacing
      setScreenshots((prev) => [...prev, { id, url, file }]);
    });

    const unlisten_reset = listen("reset_chat", (event) => {
      handler.setMessages([]);
      setScreenshots([]);
    });

    return () => {
      unlisten_screenshot.then((f) => f());
      unlisten_reset.then((f) => f());
    };
  }, []);

  // Use the custom fetch with useChat
  const handler = useChat({
    api: "/api/chat", // This can be any dummy URL, it's not actually used
    fetch: customFetch,
    streamProtocol: "text",
  });

  const originalAppend = handler.append;
  handler.append = (message: Message | CreateMessage) => {
    if (message.content.replace(/\s+/g, "") === "okthx") {
      invoke("hide_chat");
      return Promise.resolve(null);
    }

    const filelist = new DataTransfer();

    // Add all screenshots to the filelist
    screenshots.forEach((screenshot) => {
      filelist.items.add(screenshot.file);
    });

    // Clear screenshots after sending
    setScreenshots([]);

    return originalAppend(message, {
      experimental_attachments: filelist.files,
    });
  };

  // Handle deleting a screenshot
  const handleDeleteScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((screenshot) => screenshot.id !== id));
  };

  return (
    <div className="rounded-xl shadow-xl bg-background">
      <ChatSection handler={handler} className="gap-4">
        {handler.messages.length > 0 && (
          <div className="h-100 overflow-auto">
            <ChatMessages className="h-100 text-left"></ChatMessages>
          </div>
        )}
        <ChatInput className="outline outline-1 outline-gray-300">
          {screenshots.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2">
              {screenshots.map((screenshot) => (
                <Screenshot
                  key={screenshot.id}
                  imageUrl={screenshot.url}
                  onDelete={() => handleDeleteScreenshot(screenshot.id)}
                />
              ))}
            </div>
          )}
          <ChatInput.Form>
            {/* field should expand with input */}
            <CustomChatInputField className="flex-1" placeholder="" />
            <ChatInput.Submit>
              <IoSend />
            </ChatInput.Submit>
          </ChatInput.Form>
        </ChatInput>
      </ChatSection>
    </div>
  );
}

export default Chat;
