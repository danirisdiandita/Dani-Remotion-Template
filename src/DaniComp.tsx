import React from 'react';
import { AbsoluteFill, Video, staticFile } from 'remotion';

export const DaniComp: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Video
        src={staticFile('video-assets/reactions/001.mp4')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <AbsoluteFill
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 60px',
          paddingTop: '100%',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '92px',
            fontWeight: 500,
            fontFamily: '"SF Pro Display", "Inter", "system-ui", sans-serif',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            transform: 'rotate(-1deg)', // Keeping the tilt as requested earlier
            position: 'relative',
          }}
        >
          {/* Layer 1: The black border outline - made even bolder */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              color: 'black',
              WebkitTextStroke: '16px black',
              zIndex: 1,
            }}
          >
            POV: you figured out why everyone's deleting chatgpt 💀
          </div>

          {/* Layer 2: The white fill */}
          <div
            style={{
              position: 'relative',
              color: 'white',
              zIndex: 2,
              textShadow: 'rgba(0, 0, 0, 0.4) 0px 4px 10px',
            }}
          >
            POV: you figured out why everyone's deleting chatgpt 💀
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
