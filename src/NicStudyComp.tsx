import React from 'react';
import { AbsoluteFill, staticFile, Series, Img } from 'remotion';

// ─── Shared Styles ───────────────────────────────────────────────────────────

const COLORS = {
  brown: '#5C3D2E',
  brownLight: '#8B6914',
  brownDark: '#3E2723',
  cream: '#FFF8F0',
  white: '#FFFFFF',
  warmGray: '#F5EDE4',
  accent: '#D4A574',
  textDark: '#2C1810',
  textMuted: '#6B5B4F',
};

const fontFaceStyles = `
  @font-face {
    font-family: 'Montserrat';
    src: url('${staticFile("Montserrat-ExtraBold.ttf")}') format('truetype');
    font-weight: 800;
  }
  @font-face {
    font-family: 'Playfair Display';
    src: url('${staticFile("PlayfairDisplay-BoldItalic.ttf")}') format('truetype');
    font-weight: 700;
    font-style: italic;
  }
  @font-face {
    font-family: 'Noto Color Emoji';
    src: url('${staticFile("NotoColorEmoji-Regular.ttf")}') format('truetype');
  }
`;

const fontFamily = '"Montserrat", "Inter", "Noto Color Emoji", sans-serif';

// ─── Plaid Background ────────────────────────────────────────────────────────

const SlideBackground: React.FC<{ image?: string; darken?: boolean }> = ({ image, darken = true }) => {
  if (image) {
    const imgSrc = image.startsWith('http') || image.startsWith('data:') ? image : staticFile(image);
    return (
      <AbsoluteFill>
        <Img
          src={imgSrc}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {/* Dark overlay for contrast */}
        {darken && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
            }}
          />
        )}
      </AbsoluteFill>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          ${darken ? 'linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)),' : ''}
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 48px,
            rgba(92, 61, 46, 0.15) 48px,
            rgba(92, 61, 46, 0.15) 50px,
            transparent 50px,
            transparent 98px,
            rgba(92, 61, 46, 0.08) 98px,
            rgba(92, 61, 46, 0.08) 100px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 48px,
            rgba(92, 61, 46, 0.15) 48px,
            rgba(92, 61, 46, 0.15) 50px,
            transparent 50px,
            transparent 98px,
            rgba(92, 61, 46, 0.08) 98px,
            rgba(92, 61, 46, 0.08) 100px
          ),
          linear-gradient(135deg, #C4A882 0%, #B08D6A 30%, #A07B5A 60%, #8B6B4A 100%)
        `,
      }}
    />
  );
};

// ─── Watermark ───────────────────────────────────────────────────────────────

const Watermark: React.FC<{ handle: string }> = ({ handle }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 50,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        backgroundColor: COLORS.brownDark,
        padding: '16px 48px',
        borderRadius: 12,
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize: 42,
          fontWeight: 800,
          color: COLORS.cream,
          letterSpacing: 1,
        }}
      >
        {handle}
      </span>
    </div>
  </div>
);

// ─── Slide 1: Title + Description ────────────────────────────────────────────

const TitleSlide: React.FC<{
  title: string;
  description: string;
  handle: string;
  backgroundImage?: string;
}> = ({ title, description, handle, backgroundImage }) => (
  <AbsoluteFill>
    <style>{fontFaceStyles}</style>
    <SlideBackground image={backgroundImage} />
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 112,
          fontWeight: 700,
          fontStyle: 'italic',
          color: COLORS.white,
          textShadow: '0 2px 10px rgba(0,0,0,0.1)',
          margin: '0 0 60px 0',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      {/* Description with brown highlight */}
      <div
        style={{
          backgroundColor: COLORS.brownDark,
          padding: '12px 24px',
          borderRadius: 12,
          maxWidth: 900,
        }}
      >
        <p
          style={{
            fontFamily,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.cream,
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </div>
    <Watermark handle={handle} />
  </AbsoluteFill>
);

// ─── Slide 2: Tips / Bullet Points ───────────────────────────────────────────

const TipsSlide: React.FC<{
  tipsTitle: string;
  tips: string[];
  handle: string;
  backgroundImage?: string;
}> = ({ tipsTitle, tips, handle, backgroundImage }) => (
  <AbsoluteFill>
    <style>{fontFaceStyles}</style>
    <SlideBackground image={backgroundImage} />
    <div
      style={{
        position: 'absolute',
        top: 100,
        left: 60,
        right: 60,
        bottom: 140,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: '70px 70px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
      }}
    >
      {/* Section Title */}
      <div
        style={{
          backgroundColor: COLORS.brownDark,
          padding: '18px 44px',
          borderRadius: 8,
          alignSelf: 'flex-start',
          marginBottom: 50,
        }}
      >
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 64,
            fontWeight: 700,
            fontStyle: 'italic',
            color: COLORS.cream,
            margin: 0,
          }}
        >
          {tipsTitle}
        </h2>
      </div>
      {/* Bullet Points */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, justifyContent: 'center' }}>
        {tips.map((tip, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 24,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: COLORS.brown,
                flexShrink: 0,
                marginTop: 14,
              }}
            />
            <span
              style={{
                fontFamily,
                fontSize: 44,
                fontWeight: 600,
                color: COLORS.textDark,
                lineHeight: 1.4,
              }}
            >
              {tip}
            </span>
          </div>
        ))}
      </div>
    </div>
    <Watermark handle={handle} />
  </AbsoluteFill>
);

// ─── Slide 3: CTA (Hardcoded) ───────────────────────────────────────────────

const CtaSlide: React.FC<{ handle: string; backgroundImage?: string }> = ({ handle, backgroundImage }) => (
  <AbsoluteFill>
    <style>{fontFaceStyles}</style>
    <SlideBackground image={backgroundImage} darken={false} />
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px',
      }}
    >
      <p
        style={{
          fontFamily,
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.white,
          textShadow: `
            -2px -2px 0 #000,  
             2px -2px 0 #000,
            -2px  2px 0 #000,
             2px  2px 0 #000,
             0 4px 15px rgba(0,0,0,0.6)
          `,
          margin: '0 0 40px 0',
          textAlign: 'center',
        }}
      >
        I use this App
      </p>
      <div
        style={{
          backgroundColor: COLORS.brownDark,
          padding: '28px 60px',
          borderRadius: 16,
        }}
      >
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 100,
            fontWeight: 700,
            fontStyle: 'italic',
            color: COLORS.cream,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          NoteSpark AI
        </h2>
      </div>
    </div>
    <Watermark handle={handle} />
  </AbsoluteFill>
);

// ─── Main Composition ────────────────────────────────────────────────────────

export const NicStudyComp: React.FC<{
  title?: string;
  description?: string;
  tipsTitle?: string;
  tips?: string[];
  handle?: string;
  durationPerSlide?: number;
  titleImage?: string;
  tipsImage?: string;
  ctaImage?: string;
}> = ({
  title = 'Hari 1: Penalaran Umum (PU)',
  description = 'Fokus: Mengolah informasi secara logis, kritis, dan kuantitatif.',
  tipsTitle = 'Materi Wajib',
  tips = [
    'Logika (Ponens, Tollens, dan Silogisme)',
    'Memperkuat dan Memperlemah Pernyataan',
    'Pernyataan Pasti Benar dan Mungkin Benar',
    'Perbandingan',
    'Pola Bilangan',
    'Analisis Grafik/Tabel',
    'Logika Analitik',
  ],
  handle = '@nicstudy.id',
  durationPerSlide = 150,
  titleImage,
  tipsImage,
  ctaImage,
}) => {
    return (
      <Series>
        <Series.Sequence durationInFrames={durationPerSlide}>
          <TitleSlide title={title} description={description} handle={handle} backgroundImage={titleImage} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durationPerSlide}>
          <TipsSlide tipsTitle={tipsTitle} tips={tips} handle={handle} backgroundImage={tipsImage} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durationPerSlide}>
          <CtaSlide handle={handle} backgroundImage={ctaImage} />
        </Series.Sequence>
      </Series>
    );
  };
