import React from 'react';
import { AbsoluteFill, staticFile, Series, OffthreadVideo } from 'remotion';

const VideoSegment: React.FC<{
  src: string;
  text: string;
  durationInFrames: number;
}> = ({ src, text }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
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
          padding: '0 80px',
          paddingBottom: '360px',
        }}
      >
        <div
          style={{
            display: 'grid',
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
