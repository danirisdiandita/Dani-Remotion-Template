import { Composition, staticFile } from "remotion";
import { getVideoMetadata } from "@remotion/media-utils";
import { z } from "zod";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { DaniComp } from "./DaniComp";
import { CarouselComp } from "./CarouselComp";
import { NicStudyComp } from "./NicStudyComp";

// 1. Define the schema for the video sequence
export const videoSequenceSchema = z.object({
  videoSequence: z.array(
    z.object({
      src: z.string(),
      text: z.string(),
    })
  ),
});

// 2. Default Configuration (used if no props are provided)
const defaultVideoSequence = [
  { src: "video-assets/reactions/001.mp4", text: "POV: you figured out why everyone's deleting chatgpt 💀" },
  { src: "video-assets/demo/upload/001.mp4", text: "upload your pdf 😊" },
  { src: "video-assets/demo/quiz/001.mp4", text: "unlimited quizz 🔥" },
  { src: "video-assets/demo/flashcard/001.mp4", text: "unlimited flashcard 🔥" },
  { src: "video-assets/demo/mindmap/001.mp4", text: "mindmap 🔥" },
  { src: "video-assets/demo/feynman/feynman.mp4", text: "feynman technique 🔥🔥🔥" },
  { src: "video-assets/demo/printable-flashcard/001.mp4", text: "print your note, quizz, flashcard 🔥" }
];

// 3. Define schema for the carousel sequence
export const carouselSequenceSchema = z.object({
  carouselSequence: z.array(
    z.object({
      src: z.string(),
      title: z.string(),
      description: z.string(),
      durationInFrames: z.number().optional().default(150),
    })
  ),
});

const defaultCarouselSequence = [
  { src: "video-assets/placeholder-image-1.jpg", title: "Amazing Product", description: "Discover the amazing features we just launched", durationInFrames: 150 },
  { src: "video-assets/placeholder-image-2.jpg", title: "Super Fast", description: "Everything happens in blink of an eye", durationInFrames: 150 },
];

// 4. Define schema for nicstudy
export const nicstudySchema = z.object({
  title: z.string().default('Hari 1: Penalaran Umum (PU)'),
  description: z.string().default('Fokus: Mengolah informasi secara logis, kritis, dan kuantitatif.'),
  tipsTitle: z.string().default('Materi Wajib'),
  tips: z.array(z.string()).default([
    'Logika (Ponens, Tollens, dan Silogisme)',
    'Memperkuat dan Memperlemah Pernyataan',
    'Pernyataan Pasti Benar dan Mungkin Benar',
    'Perbandingan',
    'Pola Bilangan',
    'Analisis Grafik/Tabel',
    'Logika Analitik',
  ]),
  handle: z.string().default('@nicstudy.id'),
  durationPerSlide: z.number().default(150),
  titleImage: z.string().optional(),
  tipsImage: z.string().optional(),
  ctaImage: z.string().optional(),
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={myCompSchema2}
        defaultProps={{
          logoColor1: "#91dAE2" as const,
          logoColor2: "#86A8E7" as const,
        }}
      />

      <Composition
        id="Dani"
        component={DaniComp}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSequenceSchema}
        defaultProps={{
          videoSequence: defaultVideoSequence,
        }}
        calculateMetadata={async ({ props }) => {
          const fps = 30;
          const sequence = props.videoSequence || defaultVideoSequence;

          const durations = await Promise.all(
            sequence.map(async (v) => {
              const metadata = await getVideoMetadata(staticFile(v.src));
              return Math.floor(metadata.durationInSeconds * fps);
            })
          );

          const totalDuration = durations.reduce((a, b) => a + b, 0);

          return {
            durationInFrames: totalDuration,
            props: {
              ...props,
              segments: sequence.map((v, i) => ({
                ...v,
                durationInFrames: durations[i]
              }))
            },
          };
        }}
      />

      <Composition
        id="Carousel"
        component={CarouselComp}
        fps={30}
        width={1080}
        height={1920}
        schema={carouselSequenceSchema}
        defaultProps={{
          carouselSequence: defaultCarouselSequence,
        }}
        calculateMetadata={async ({ props }) => {
          const sequence = props.carouselSequence || defaultCarouselSequence;
          
          const durations = sequence.map(v => v.durationInFrames || 150);
          const totalDuration = durations.reduce((a, b) => a + b, 0) || 150;

          return {
            durationInFrames: totalDuration,
            props: {
              ...props,
              carouselSequence: sequence.map((v, i) => ({
                ...v,
                durationInFrames: durations[i]
              }))
            },
          };
        }}
      />

      <Composition
        id="nicstudy"
        component={NicStudyComp}
        fps={30}
        width={1080}
        height={1910}
        schema={nicstudySchema}
        defaultProps={{
          title: 'Hari 1: Penalaran Umum (PU)',
          description: 'Fokus: Mengolah informasi secara logis, kritis, dan kuantitatif.',
          tipsTitle: 'Materi Wajib',
          tips: [
            'Logika (Ponens, Tollens, dan Silogisme)',
            'Memperkuat dan Memperlemah Pernyataan',
            'Pernyataan Pasti Benar dan Mungkin Benar',
            'Perbandingan',
            'Pola Bilangan',
            'Analisis Grafik/Tabel',
            'Logika Analitik',
          ],
          handle: '@nicstudy.id',
          durationPerSlide: 150,
          titleImage: undefined,
          tipsImage: undefined,
          ctaImage: undefined,
        }}
        calculateMetadata={async ({ props }) => {
          const perSlide = props.durationPerSlide || 150;
          return {
            durationInFrames: perSlide * 3,
          };
        }}
      />
    </>
  );
};
