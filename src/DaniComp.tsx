import React from 'react';
import { AbsoluteFill, Video, staticFile, Series } from 'remotion';

const VideoSegment: React.FC<{
  src: string;
  text: string;
  durationInFrames: number;
}> = ({ src, text, durationInFrames }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Video
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end', // Align to bottom
          alignItems: 'center', // Center horizontally
          padding: '0 80px',
          paddingBottom: '240px', // Proper TikTok caption height
        }}
      >
        <div
          style={{
            display: 'grid', // Use grid to stack layers perfectly center-to-center
            gridTemplateRows: '1fr',
            gridTemplateColumns: '1fr',
            textAlign: 'center',
            fontSize: '92px',
            fontWeight: 500,
            fontFamily: '"SF Pro Display", "Inter", "system-ui", sans-serif',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            transform: 'rotate(-1deg)',
            width: '100%',
          }}
        >
          {/* Layer 1: The black border outline */}
          <div
            style={{
              gridRow: 1,
              gridColumn: 1,
              color: 'black',
              WebkitTextStroke: '16px black',
              zIndex: 1,
            }}
          >
            {text}
          </div>

          {/* Layer 2: The white fill */}
          <div
            style={{
              gridRow: 1,
              gridColumn: 1,
              position: 'relative',
              color: 'white',
              zIndex: 2,
              textShadow: 'rgba(0, 0, 0, 0.4) 0px 4px 10px',
            }}
          >
            {text}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DaniComp: React.FC = () => {
  return (
    <Series>
      {/* 0. Intro reaction - 4.5s (135 frames) */}
      <Series.Sequence durationInFrames={135}>
        <VideoSegment
          src="video-assets/reactions/001.mp4"
          text="POV: you figured out why everyone's deleting chatgpt 💀"
          durationInFrames={135}
        />
      </Series.Sequence>

      {/* 1. Upload your PDF - ~1.37s (41 frames) */}
      <Series.Sequence durationInFrames={41}>
        <VideoSegment
          src="video-assets/demo/upload/001.mp4"
          text="upload your pdf 😊"
          durationInFrames={41}
        />
      </Series.Sequence>

      {/* 2. Unlimited Quizz - ~1.81s (54 frames) */}
      <Series.Sequence durationInFrames={54}>
        <VideoSegment
          src="video-assets/demo/quiz/001.mp4"
          text="unlimited quizz 🔥"
          durationInFrames={54}
        />
      </Series.Sequence>

      {/* 3. Unlimited Flashcard - ~1.6s (48 frames) */}
      <Series.Sequence durationInFrames={48}>
        <VideoSegment
          src="video-assets/demo/flashcard/001.mp4"
          text="unlimited flashcard 🔥"
          durationInFrames={48}
        />
      </Series.Sequence>

      {/* 4. Mindmap - ~1.37s (41 frames) */}
      <Series.Sequence durationInFrames={41}>
        <VideoSegment
          src="video-assets/demo/mindmap/001.mp4"
          text="mindmap"
          durationInFrames={41}
        />
      </Series.Sequence>

      {/* 5. Feynman Technique - ~1.45s (43 frames) */}
      <Series.Sequence durationInFrames={43}>
        <VideoSegment
          src="video-assets/demo/feynman/feynman.mp4"
          text="feynman technique 🔥🔥🔥"
          durationInFrames={43}
        />
      </Series.Sequence>

      {/* 6. Print your note, quizz, flashcard - ~1.4s (42 frames) */}
      <Series.Sequence durationInFrames={42}>
        <VideoSegment
          src="video-assets/demo/printable-flashcard/001.mp4"
          text="print your note, quizz, flashcard 🔥"
          durationInFrames={42}
        />
      </Series.Sequence>
    </Series>
  );
};
