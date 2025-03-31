interface ScreenshotProps {
  imageUrl: string;
}

export function Screenshot({ imageUrl }: ScreenshotProps) {
  // Return rounded corners image that is 200x200 and centered
  // with drop shadow
  // image conents centered but not stretch to fit
  return (
    <img
      src={imageUrl}
      alt="Screenshot"
      className="rounded-lg w-20 h-20 drop-shadow-lg object-cover"
    />
  );
}
