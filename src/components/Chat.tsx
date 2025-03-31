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
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { IoSend } from "react-icons/io5";

import "@llamaindex/chat-ui/styles/markdown.css";
import { useEffect, useState } from "react";
import { CreateMessage, useChat } from "@ai-sdk/react";

import "./Chat.css";
import { Screenshot } from "./Screenshot";

export function Chat() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

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

      const file = new File([blob], "screenshot.png", { type: "image/png" });

      setScreenshotFile(file);

      // // Create a binary string from the Uint8Array
      // const binaryString = Array.from(uint8Array)
      //   .map((byte) => String.fromCharCode(byte))
      //   .join("");

      // // Use btoa to convert the binary string to base64
      // const base64 = `data:image/png;base64,${btoa(binaryString)}`;

      // handler.setMessages((messages) => [
      //   ...messages,
      //   {
      //     id: "1",
      //     type: "image",
      //     content: base64,
      //     role: "user",
      //   },
      // ]);
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
  // const handler = useChat({
  //   api: "https://openrouter.ai/api/v1/chat/completions",
  //   headers: {
  //     Authorization:
  //       "Bearer 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",
  //     "X-Title": "okthx",
  //   },
  //   body: {
  //     model: "deepseek/deepseek-chat-v3-0324:free",
  //     stream: true,
  //   },
  //   streamProtocol: "text",
  // });

  // Custom fetch function for OpenRouter
  const customFetch = async (url, options) => {
    const parsedBody = JSON.parse(options.body);
    const messages = parsedBody.messages;

    // Process messages to handle image attachments
    const processedMessages = messages.map((message: any) => {
      // Check if the message has experimental_attachments
      if (
        message.experimental_attachments &&
        message.experimental_attachments.length > 0
      ) {
        // Create a new content array for the multimodal format
        const content: any[] = [
          // Add the text content first
          {
            type: "text",
            text: message.content,
          },
        ];

        // Add each attachment as an image_url entry
        message.experimental_attachments.forEach((attachment: any) => {
          content.push({
            type: "image_url",
            image_url: {
              url: attachment.url,
            },
          });
        });

        // Return the transformed message
        return {
          ...message,
          content,
        };
      }

      // Return the original message if no attachments
      return message;
    });

    console.log("Original messages:", messages);
    console.log("Processed messages:", processedMessages);

    // Create a ReadableStream to handle the SSE data
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Make the actual fetch request to OpenRouter
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:
          "Bearer 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",
        "Content-Type": "application/json",
        "X-Title": "okthx",
      },
      body: JSON.stringify({
        // model: "deepseek/deepseek-chat-v3-0324:free",
        // model: "google/gemini-2.5-pro-exp-03-25:free",
        model: "google/gemini-2.0-flash-exp:free",
        messages: processedMessages,
        stream: true,
      }),
    })
      .then(async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            writer.close();
            break;
          }

          // Decode the chunk and process it
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            // Skip processing lines if they don't have data
            if (!line.startsWith("data:")) continue;
            if (line.includes("[DONE]")) continue;
            if (line.includes("OPENROUTER PROCESSING")) continue;

            try {
              // Extract just the data part, removing 'data: ' prefix
              const jsonStr = line.substring(5).trim();
              const data = JSON.parse(jsonStr);

              // Extract just the text content
              const content = data.choices[0]?.delta?.content || "";

              // Write the content to our stream
              if (content) {
                writer.write(encoder.encode(content));
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        writer.abort(error);
      });

    return new Response(readable);
  };

  // Use the custom fetch with useChat
  const handler = useChat({
    api: "/api/chat", // This can be any dummy URL, it's not actually used
    fetch: customFetch,
    streamProtocol: "text",
  });

  const originalAppend = handler.append;
  handler.append = (event: Message | CreateMessage) => {
    console.log("nick");
    const filelist = new DataTransfer();
    if (screenshotFile) {
      filelist.items.add(screenshotFile);
    }

    setImageUrl(null);
    setScreenshotFile(null);

    return originalAppend(event, {
      experimental_attachments: filelist.files,
    });
  };

  const originalHandleSubmit = handler.handleSubmit;
  handler.handleSubmit = (event) => {
    console.log("handleSubmit", event);
    return originalHandleSubmit(event);
  };

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
