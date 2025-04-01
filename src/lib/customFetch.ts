// This custom fetch function massages OpenRouter API responses
// to something that the AI SDK frontend can handle.
// We use this because we don't have a backend.
export const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const options = init || {};
  const parsedBody = JSON.parse(options.body as string);
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
      model: "google/gemini-2.5-pro-exp-03-25:free",
      // model: "google/gemini-2.0-flash-exp:free",
      messages: processedMessages,
      stream: true,
    }),
  })
    .then(async (response) => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is null");
      }
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
