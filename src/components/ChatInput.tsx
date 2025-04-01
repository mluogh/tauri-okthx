import { useChatInput, useChatUI } from "@llamaindex/chat-ui";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";

interface ChatInputFieldProps {
  className?: string;
  type?: "input" | "textarea";
  placeholder?: string;
}

function ChatInputField(props: ChatInputFieldProps) {
  const { input, setInput } = useChatUI();
  const { handleKeyDown, setIsComposing } = useChatInput();
  const type = props.type ?? "textarea";

  interface ChatInputFieldProps {
    className?: string;
    type?: "input" | "textarea";
    placeholder?: string;
  }

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
    <Textarea
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
