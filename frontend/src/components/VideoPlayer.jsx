import { forwardRef, useImperativeHandle, useRef } from "react";

// forwardRef so the parent (Review page) can call seekTo() when a
// comment marker or list item is clicked. `children` renders inside the
// shell on top of the video — used for the draw/markup overlay.
const VideoPlayer = forwardRef(function VideoPlayer({ src, onTimeUpdate, onDuration, children }, ref) {
  const videoRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play();
      }
    },
    getCurrentTime() {
      return videoRef.current?.currentTime ?? 0;
    },
    pause() {
      videoRef.current?.pause();
    },
  }));

  return (
    <div className="video-shell">
      <video
        ref={videoRef}
        src={src}
        controls
        onTimeUpdate={(e) => onTimeUpdate?.(e.target.currentTime)}
        onLoadedMetadata={(e) => onDuration?.(e.target.duration)}
      />
      {children}
    </div>
  );
});

export default VideoPlayer;
