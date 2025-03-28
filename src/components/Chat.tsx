import {
  ChatHandler,
  ChatSection,
  Message,
  ChatInput,
  ChatMessage,
  ChatMessages,
  useFile,
} from "@llamaindex/chat-ui";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IoSend } from "react-icons/io5";

import "@llamaindex/chat-ui/styles/markdown.css";
import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";

import "./Chat.css";
import { Screenshot } from "./Screenshot";

export function Chat() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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

      setImageUrl(url);
    });

    const unlisten_reset = listen("reset", (event) => {
      handler.setMessages([]);
    });

    return () => {
      unlisten_screenshot.then((f) => f());
      unlisten_reset.then((f) => f());
    };
  }, []);

  // You can replace the handler with a useChat hook from Vercel AI SDK
  const handler = useChat();
  return (
    <div className="rounded-xl shadow-xl">
      <ChatSection handler={handler} className="gap-4">
        {handler.messages.length > 0 && (
          <div className="h-100">
            <ChatMessages className="h-100"></ChatMessages>
          </div>
        )}
        <ChatInput className="outline outline-1 outline-gray-300">
          <div>{imageUrl ? <Screenshot imageUrl={imageUrl} /> : null}</div>
          <ChatInput.Form>
            {/* field should expand with input */}
            <ChatInput.Field className="flex-1" placeholder="" />
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
