interface ScreenshotProps {
  imageUrl: string;
  onDelete?: () => void;
}

export function Screenshot({ imageUrl, onDelete }: ScreenshotProps) {
  // Return rounded corners image that is 200x200 and centered
  // with drop shadow
  // image conents centered but not stretch to fit
  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt="Screenshot"
        className="rounded-lg w-20 h-20 drop-shadow-lg object-cover"
      />
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
          aria-label="Delete screenshot"
        >
          ×
        </button>
      )}
    </div>
  );
}
