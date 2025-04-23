import { useChatInput, useChatUI } from "@llamaindex/chat-ui";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { TextareaAutosize } from "./ui/textareaautosize";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

interface ChatInputFieldProps {
  className?: string;
  type?: "input" | "textarea";
  placeholder?: string;
}

function CustomChatInputField(props: ChatInputFieldProps) {
  const { input, setInput } = useChatUI();
  const { handleKeyDown, setIsComposing } = useChatInput();
  const type = props.type ?? "textarea";

  // We do this here instead of in Chat.tsx because
  // we can't use useChatUI in Chat.tsx bc its not in ChatProvider
  // don't want to mess around trying to figure that out
  useEffect(() => {
    const unlisten = listen("clipboard_change", (event) => {
      const text = event.payload as string;
      // Only handle text content
      if (typeof text === "string") {
        if (input.length > 0) {
          setInput(input + "\n\n" + text);
        } else {
          setInput(text);
        }
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [input]);

  if (type === "input") {
    return (
      <Input
        name="input"
        placeholder={props.placeholder ?? "Type a message"}
        className={cn(props.className, "min-h-0")}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
    );
  }

  return (
    <TextareaAutosize
      name="input"
      placeholder={props.placeholder ?? "Type a message"}
      className={cn(props.className, "h-[40px] min-h-0 flex-1")}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
    />
  );
}

export default CustomChatInputField;
