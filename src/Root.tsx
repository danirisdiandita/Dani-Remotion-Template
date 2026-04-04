import { Composition, staticFile } from "remotion";
import { getVideoMetadata } from "@remotion/media-utils";
import { z } from "zod";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { DaniComp } from "./DaniComp";

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
    </>
  );
};
