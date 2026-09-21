import React from "react";
import { Composition } from "remotion";
import { FPS } from "./theme";
import { Submission, TOTAL_FRAMES } from "./Submission";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Submission"
    component={Submission}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
