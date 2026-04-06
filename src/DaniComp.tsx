import React from 'react';
import { AbsoluteFill, staticFile, Series, OffthreadVideo } from 'remotion';

const VideoSegment: React.FC<{
  src: string;
  text: string;
  durationInFrames: number;
}> = ({ src, text }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <style>
        {`
          @font-face {
            font-family: 'Montserrat';
            src: url('${staticFile("Montserrat-ExtraBold.ttf")}') format('truetype');
            font-weight: 800;
          }
          @font-face {
            font-family: 'Noto Color Emoji';
            src: url('${staticFile("NotoColorEmoji-Regular.ttf")}') format('truetype');
          }
        `}
      </style>
      <OffthreadVideo
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
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0 40px',
          paddingBottom: '360px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '92px',
            fontWeight: 800,
            fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
            color: 'white',
            // TikTok style crisp black border using massive omnidirectional text shadows.
            // This natively supports emojis without causing the 'hollow outline' glitch of WebkitTextStroke
            textShadow: `
              -6px -6px 0 #000,  0   -6px 0 #000,   6px -6px 0 #000,
               6px  0   0 #000,  6px  6px 0 #000,   0    6px 0 #000,
              -6px  6px 0 #000, -6px  0   0 #000,
              
              /* Inner layer for density */
              -3px -3px 0 #000,  0   -3px 0 #000,   3px -3px 0 #000,
               3px  0   0 #000,  3px  3px 0 #000,   0    3px 0 #000,
              -3px  3px 0 #000, -3px  0   0 #000,

              /* Master drop shadow to pop from background */
               0px 10px 30px rgba(0,0,0,0.8)
            `,
            width: '100%',
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DaniComp: React.FC<{
  segments?: {
    src: string;
    text: string;
    durationInFrames: number;
  }[];
}> = ({ segments = [] }) => {
  return (
    <Series>
      {segments.map((segment, index) => (
        <Series.Sequence
          key={index}
          durationInFrames={segment.durationInFrames}
        >
          <VideoSegment {...segment} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
