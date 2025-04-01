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
import { useEffect, useState, useRef } from "react";
import { CreateMessage, useChat } from "@ai-sdk/react";
import { customFetch } from "../lib/customFetch";

import "./Chat.css";
import { Screenshot } from "./Screenshot";
import { ChatInputField } from "./ChatInput";

interface ScreenshotItem {
  id: string;
  url: string;
  file: File;
}

export function Chat() {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const { input, setInput } = useChatUI();

  const appendToInput = (text: string) => {
    const separator = input.length > 0 ? "\n" : "";
    setInput(input + separator + text);
  };

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

    const unlisten_clipboard = listen("clipboard_change", (event) => {
      const text = event.payload as string;
      // Only handle text content
      if (typeof text === "string") {
        appendToInput(text);
      }
    });

    return () => {
      unlisten_screenshot.then((f) => f());
      unlisten_reset.then((f) => f());
      unlisten_clipboard.then((f) => f());
    };
  }, [input, setInput]);

  // Use the custom fetch with useChat
  const handler = useChat({
    api: "/api/chat", // This can be any dummy URL, it's not actually used
    fetch: customFetch,
    streamProtocol: "text",
  });

  const originalAppend = handler.append;
  handler.append = (message: Message | CreateMessage) => {
    console.log("nick");
    console.log(message);
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

  const originalHandleSubmit = handler.handleSubmit;
  handler.handleSubmit = (event) => {
    console.log("handleSubmit", event);
    return originalHandleSubmit(event);
  };

  return (
    <div className="rounded-xl shadow-xl bg-background">
      <ChatSection handler={handler} className="gap-4">
        {handler.messages.length > 0 && (
          <div className="h-100">
            <ChatMessages className="h-100"></ChatMessages>
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
            <ChatInput.Field
              className="flex-1"
              placeholder=""
              onAppendText={appendToInput}
            />
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
