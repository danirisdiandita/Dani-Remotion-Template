import React from 'react';
import {
  AbsoluteFill,
  staticFile,
  Series,
  useCurrentFrame,
  spring,
  interpolate,
  Audio,
  Sequence,
} from 'remotion';
import {
  Book,
  FileQuestion,
  Diamond,
  FileText,
  MessageCircle,
  ArrowLeft,
  Ellipsis,
  RefreshCcw,
  Shuffle,
} from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

// ============================================================
// NeoBrutalist Button
// ============================================================
const NeoButton: React.FC<{
  width: number;
  height: number;
  borderRadius: number;
  shadowColor: string;
  faceColor: string;
  borderColor: string;
  borderWidth?: number;
  children: React.ReactNode;
}> = ({
  width,
  height,
  borderRadius,
  shadowColor,
  faceColor,
  borderColor,
  borderWidth = 4,
  children,
}) => (
  <div style={{ position: 'relative', width, height }}>
    <div
      style={{
        position: 'absolute',
        top: 3,
        left: 0,
        right: 0,
        bottom: -3,
        backgroundColor: shadowColor,
        borderRadius,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: faceColor,
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  </div>
);

// ============================================================
// Tab Bar — light mode, Lucide icons
// ============================================================
const iconProps = { size: 38, strokeWidth: 2.5 } as const;

const renderTabIcon = (tab: string, color: string) => {
  const p = { ...iconProps, color };
  switch (tab) {
    case 'note':
      return <Book {...p} />;
    case 'quiz':
      return <FileQuestion {...p} />;
    case 'flashcard':
      return <Diamond {...p} />;
    case 'transcript':
      return <FileText {...p} />;
    case 'chat':
      return <MessageCircle {...p} />;
    default:
      return null;
  }
};

const TabBar: React.FC<{ selected: string }> = ({ selected }) => {
  const tabs = [
    { id: 'note', label: 'Note' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'flashcard', label: 'Flashcard' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        borderTop: '5px solid #E5E5E5',
        paddingTop: 26,
        paddingBottom: 65,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'flex-start',
      }}
    >
      {tabs.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <div
            key={tab.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <NeoButton
              width={96}
              height={96}
              borderRadius={26}
              shadowColor={isSelected ? '#D1A521' : '#E5E5E5'}
              faceColor={isSelected ? '#F4CA4C' : '#FFF'}
              borderColor={isSelected ? '#D1A521' : '#E5E5E5'}
            >
              {renderTabIcon(tab.id, isSelected ? '#000' : '#888')}
            </NeoButton>
            <span
              style={{
                fontSize: 24,
                fontWeight: '800',
                fontFamily: '"Montserrat", "Inter", sans-serif',
                color: isSelected ? '#000' : '#888',
              }}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Navbar — light mode, buttons 1.3x bigger
// ============================================================
const Navbar: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 160,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingLeft: 40,
      paddingRight: 40,
      paddingBottom: 24,
      zIndex: 20,
    }}
  >
    <NeoButton
      width={80}
      height={80}
      borderRadius={22}
      shadowColor="#E5E5E5"
      faceColor="#FFF"
      borderColor="#E5E5E5"
    >
      <ArrowLeft size={38} strokeWidth={2.5} color="#000" />
    </NeoButton>

    <span
      style={{
        fontSize: 38,
        fontWeight: '700',
        fontFamily: '"Montserrat", "Inter", sans-serif',
        color: '#111827',
        textTransform: 'capitalize',
        letterSpacing: '-0.3px',
      }}
    >
      {title}
    </span>

    <NeoButton
      width={80}
      height={80}
      borderRadius={22}
      shadowColor="#E5E5E5"
      faceColor="#FFF"
      borderColor="#E5E5E5"
    >
      <Ellipsis size={40} strokeWidth={2.5} color="#000" />
    </NeoButton>
  </div>
);

// ============================================================

// QuizSegment
// ============================================================
const QuizSegment: React.FC<{
  question: string;
  options: string[];
  correctIndex: number;
  simulatedTapIndex: number;
  durationInFrames: number;
  waitPeriodMs: number;
  audioSrc: string;
  questionIndex: number;
  totalQuestions: number;
}> = ({
  question,
  options,
  correctIndex,
  simulatedTapIndex,
  durationInFrames,
  waitPeriodMs,
  audioSrc,
  questionIndex,
  totalQuestions,
}) => {
  const frame = useCurrentFrame();
  const fps = 30;

  const hasCountdown = waitPeriodMs > 0;
  const countdownStart = hasCountdown
    ? Math.floor(waitPeriodMs / (1000 / fps))
    : -1;
  const countdownDuration = 150; // 5s at 30fps
  const tapFrame = hasCountdown
    ? countdownStart + countdownDuration
    : Math.max(Math.floor(durationInFrames * 0.5) - 12, 10);
  const revealFrame = hasCountdown
    ? countdownStart + countdownDuration + 12
    : Math.floor(durationInFrames * 0.5);
  const tapped = frame >= tapFrame;
  const correctRevealed = frame >= revealFrame;
  const isCorrectTap = simulatedTapIndex === correctIndex && tapped;

  const cardSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: 18,
  });

  const countdownFrame = frame - countdownStart;
  const countdownNumber = hasCountdown && countdownFrame >= 0 && countdownFrame < countdownDuration
    ? 5 - Math.floor(countdownFrame / 30)
    : null;

  const badgeScale = correctRevealed
    ? spring({
        frame: frame - revealFrame,
        fps,
        config: { damping: 10, stiffness: 200 },
        durationInFrames: 16,
      })
    : 0;

  const optionOpacity = (i: number) =>
    interpolate(frame, [8 + i * 7, 8 + i * 7 + 8], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const getOptionBg = (i: number) => {
    if (!tapped && !correctRevealed) return '#F3F4F6';
    if (correctRevealed && i === correctIndex) return '#DCFCE7';
    if (
      (tapped && !correctRevealed && i === simulatedTapIndex && !isCorrectTap) ||
      (correctRevealed && i === simulatedTapIndex && !isCorrectTap)
    )
      return '#FEE2E2';
    return '#F3F4F6';
  };

  const getOptionBorder = (i: number) => {
    if (correctRevealed && i === correctIndex) return '#16a34a';
    if (
      (tapped && !correctRevealed && i === simulatedTapIndex && !isCorrectTap) ||
      (correctRevealed && i === simulatedTapIndex && !isCorrectTap)
    )
      return '#FF3B30';
    return '#e4f6a9';
  };

  const getLabelColor = (i: number) => {
    if (!tapped && !correctRevealed) return '#374151';
    if (correctRevealed && i === correctIndex) return '#16a34a';
    if (
      (tapped && i === simulatedTapIndex && !isCorrectTap) ||
      (correctRevealed && i === simulatedTapIndex && !isCorrectTap)
    )
      return '#FF3B30';
    return '#374151';
  };

  const getTextColor = (i: number) => {
    if (!tapped && !correctRevealed) return '#374151';
    if (correctRevealed && i === correctIndex) return '#166534';
    if (
      (tapped && i === simulatedTapIndex && !isCorrectTap) ||
      (correctRevealed && i === simulatedTapIndex && !isCorrectTap)
    )
      return '#991B1B';
    return '#374151';
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F5F7' }}>
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

      <Navbar title="quiz" />

      {audioSrc && <Audio src={staticFile(audioSrc)} />}

      {hasCountdown && countdownNumber !== null && (
        <>
          <Sequence from={countdownStart}><Audio src={staticFile("assets/timer5s.mp3")} /></Sequence>
          <AbsoluteFill
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              zIndex: 30,
              pointerEvents: 'none',
              padding: '0 110px 280px 0',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 220,
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="220"
                height="220"
                style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
              >
                <circle
                  cx="110"
                  cy="110"
                  r="100"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="100"
                  fill="none"
                  stroke="#000"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 100}
                  strokeDashoffset={2 * Math.PI * 100 * (1 - ((countdownFrame % 30) / 30))}
                  style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                />
              </svg>
              <div
                key={countdownNumber}
                style={{
                  fontSize: 150,
                  fontWeight: 800,
                  fontFamily: '"Montserrat", "Inter", sans-serif',
                  color: '#000',
                  lineHeight: 1,
                  transform: `scale(${spring({
                    frame: countdownFrame % 30,
                    fps: 30,
                    config: { damping: 10, stiffness: 200 },
                    durationInFrames: 10,
                  })})`,
                }}
              >
                {countdownNumber}
              </div>
            </div>
          </AbsoluteFill>
        </>
      )}

      <Sequence from={revealFrame}>
        <Audio src={staticFile("assets/correct.mp3")} />
      </Sequence>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          top: 172,
          left: 40,
          right: 40,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#E5E7EB',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
            backgroundColor: '#84fb42',
            borderRadius: '0 5px 5px 0',
          }}
        />
      </div>

      {/* Controls row — 1.3x bigger */}
      <div
        style={{
          position: 'absolute',
          top: 204,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 22,
          zIndex: 10,
        }}
      >
        {([
            { label: 'Reset', icon: <RefreshCcw size={26} strokeWidth={2.5} />, isMore: false },
            { label: 'Shuffle', icon: <Shuffle size={26} strokeWidth={2.5} />, isMore: false },
            { label: 'More', icon: <span style={{ fontSize: 28, lineHeight: 1 }}>✨</span>, isMore: true },
          ] as const).map(({ label, icon, isMore }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: '18px 32px',
                borderRadius: 24,
                border: '3px solid',
                backgroundColor: isMore ? '#FFF' : '#F4CA4C',
                borderColor: isMore ? '#e4f6a9' : '#D1A521',
                fontSize: 26,
                fontWeight: '700',
                fontFamily: '"Montserrat", "Inter", sans-serif',
                color: '#000',
              }}
            >
              {icon}
              {label}
            </div>
          ))}
      </div>

      {/* Content area */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 48px',
          paddingTop: 140,
          paddingBottom: 260,
        }}
      >
        {/* Question card */}
        <div
          style={{
            width: '100%',
            maxWidth: 960,
            backgroundColor: '#FFF',
            borderRadius: 36,
            border: '5px solid #e4f6a9',
            padding: '56px 56px 64px 56px',
            transform: `scale(${cardSpring})`,
            opacity: cardSpring,
          }}
        >
          {/* Question number */}
          <div
            style={{
              fontSize: 34,
              fontWeight: '700',
              fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
              color: '#6B7280',
              marginBottom: 24,
              letterSpacing: '0.3px',
            }}
          >
            Question {questionIndex + 1}
          </div>

          {/* Question text */}
          <div
            style={{
              fontSize: 62,
              fontWeight: '600',
              fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
              color: '#111827',
              lineHeight: 1.25,
              marginBottom: 52,
              letterSpacing: '-0.5px',
            }}
          >
            {question}
          </div>

          {/* Options */}
          {options.slice(0, 4).map((option, i) => {
            const label = OPTION_LABELS[i];
            const badgeColor =
              correctRevealed && i === correctIndex ? '#16a34a' : '#FF3B30';
            const badgeIcon =
              correctRevealed && i === correctIndex ? '✓' : '✗';
            const badgeLabel =
              correctRevealed && i === correctIndex ? 'Correct!' : 'Incorrect';
            const showBadge =
              (correctRevealed && i === correctIndex) ||
              (tapped && !correctRevealed && i === simulatedTapIndex) ||
              (correctRevealed && i === simulatedTapIndex && !isCorrectTap);

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '26px 36px',
                  borderRadius: 24,
                  border: '4px solid',
                  marginBottom: i < options.length - 1 ? 16 : 0,
                  opacity: optionOpacity(i),
                  backgroundColor: getOptionBg(i),
                  borderColor: getOptionBorder(i),
                  minHeight: 76,
                }}
              >
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: '700',
                    fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
                    color: getLabelColor(i),
                    marginRight: 22,
                    minWidth: 48,
                  }}
                >
                  {label}.
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 42,
                    fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
                    color: getTextColor(i),
                    lineHeight: 1.3,
                  }}
                >
                  {option}
                </span>
                {showBadge && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginLeft: 16,
                      transform: `scale(${badgeScale})`,
                    }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <circle cx="20" cy="20" r="18" fill={badgeColor} />
                      {badgeIcon === '✓' ? (
                        <path
                          d="M11 20l6 7 12-14"
                          stroke="#fff"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <path
                          d="M13 13l14 14M27 13L13 27"
                          stroke="#fff"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: '800',
                        fontFamily: '"Montserrat", "Inter", "Noto Color Emoji", sans-serif',
                        color: badgeColor,
                      }}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress text */}
        <div
          style={{
            fontSize: 26,
            fontWeight: '600',
            fontFamily: '"Montserrat", "Inter", sans-serif',
            color: '#111827',
            marginTop: 32,
            letterSpacing: '0.2px',
          }}
        >
          Question {questionIndex + 1} of {totalQuestions}
        </div>
      </AbsoluteFill>

      <TabBar selected="quiz" />
    </AbsoluteFill>
  );
};


// ============================================================
// QuizIntro — loading screen before questions start
// ============================================================
const QuizIntro: React.FC<{ totalQuestions: number }> = ({ totalQuestions }) => {
  const frame = useCurrentFrame();

  // Text fade and slide up
  const textOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const textY = interpolate(frame, [15, 35], [20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  const dots = Math.floor(frame / 15) % 4;
  const loaderDots = ".".repeat(dots);

  return (
    <AbsoluteFill style={{ 
      background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 72,
    }}>
      
      {/* Decorative background blurs */}
      <div style={{
        position: 'absolute',
        width: 700,
        height: 700,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(228,246,169,0.5) 0%, rgba(228,246,169,0) 70%)',
        filter: 'blur(50px)',
      }} />

      <div
        style={{
          position: 'relative',
          width: 520,
          height: 180,
        }}
      >
        {/* Glowing border/backdrop */}
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: 48,
          background: `linear-gradient(45deg, #e4f6a9, #a3f6a9, #e4f6a9, #f6e4a9)`,
          filter: 'blur(16px)',
          opacity: 0.85,
        }} />
        
        {/* Main Logo Card */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 40,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255,255,255,1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 30px 60px rgba(0,0,0,0.12), inset 0 -4px 20px rgba(0,0,0,0.03), inset 0 4px 20px rgba(255,255,255,1)',
          }}
        >
          <img
            src={staticFile("assets/notesparkai.png")}
            style={{
              width: 440,
              height: 120,
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: '800',
            fontFamily: '"Montserrat", "Inter", sans-serif',
            color: '#0F172A',
            letterSpacing: '-0.03em',
            textAlign: 'center',
            textShadow: '0 4px 12px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            padding: '10px 20px',
          }}
        >
          is preparing your questions
          <span style={{ width: 40, textAlign: 'left', display: 'inline-block', WebkitTextFillColor: '#0F172A' }}>{loaderDots}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// QuizComp — series wrapper
// ============================================================
export const QuizComp: React.FC<{
  quizSequence?: {
    question: string;
    options: string[];
    correctIndex: number;
    simulatedTapIndex: number;
    durationInFrames: number;
    waitPeriodMs: number;
    audioSrc: string;
  }[];
}> = ({ quizSequence = [] }) => {
  return (
    <Series>
      <Series.Sequence durationInFrames={45}>
        <QuizIntro totalQuestions={quizSequence.length} />
      </Series.Sequence>
      {quizSequence.map((segment, index) => (
        <Series.Sequence
          key={index}
          durationInFrames={segment.durationInFrames}
        >
          <QuizSegment
            {...segment}
            questionIndex={index}
            totalQuestions={quizSequence.length}
          />
        </Series.Sequence>
      ))}
    </Series>
  );
};
