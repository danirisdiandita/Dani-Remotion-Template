import React from 'react';
import { AbsoluteFill, staticFile, Series, Img } from 'remotion';

const ImageSegment: React.FC<{
  src: string;
  title: string;
  description: string;
  durationInFrames: number;
}> = ({ src, title, description }) => {
  // If it's a temp asset in public/tmp, it might start with just a path, not http
  const imageSrc = src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

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
      <Img
        src={imageSrc}
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
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 80px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)'
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: '110px',
            fontWeight: 800,
            fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
            color: 'white',
            margin: '0 0 40px 0',
            textShadow: '0px 10px 30px rgba(0,0,0,0.8)',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: '60px',
            fontWeight: 600,
            fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
            color: 'white',
            margin: '0',
            textShadow: '0px 5px 20px rgba(0,0,0,0.8)',
            lineHeight: 1.3,
          }}
        >
          {description}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CarouselComp: React.FC<{
  carouselSequence?: {
    src: string;
    title: string;
    description: string;
    durationInFrames: number;
  }[];
}> = ({ carouselSequence = [] }) => {
  return (
    <Series>
      {carouselSequence.map((segment, index) => (
        <Series.Sequence
          key={index}
          durationInFrames={segment.durationInFrames}
        >
          <ImageSegment {...segment} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
