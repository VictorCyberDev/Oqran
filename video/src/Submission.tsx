import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { C, s } from "./theme";
import { Ch0Problem, CH0_FRAMES } from "./scenes/ch0-problem";
import { Ch1Citizen, CH1_FRAMES, Ch2Government, CH2_FRAMES } from "./scenes/ch1-stakeholders";
import { Ch3Bank, CH3_FRAMES, Ch4BusinessOwner, CH4_FRAMES } from "./scenes/ch3-bank-biz";
import { Ch5Core, CH5_FRAMES } from "./scenes/ch5-core";
import { Ch6Engineering, CH6_FRAMES, MapLimitation } from "./scenes/ch6-engineering";
import { Ch7Failures, CH7_FRAMES } from "./scenes/ch7-failures";
import { Ch8Close, CH8_FRAMES } from "./scenes/ch8-close";

const MAP_LIMIT_FRAMES = s(12);

export const TOTAL_FRAMES =
  CH0_FRAMES +
  CH1_FRAMES +
  CH2_FRAMES +
  CH3_FRAMES +
  CH4_FRAMES +
  CH5_FRAMES +
  CH6_FRAMES +
  MAP_LIMIT_FRAMES +
  CH7_FRAMES +
  CH8_FRAMES;

export const Submission: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Series>
      <Series.Sequence durationInFrames={CH0_FRAMES}><Ch0Problem /></Series.Sequence>
      <Series.Sequence durationInFrames={CH1_FRAMES}><Ch1Citizen /></Series.Sequence>
      <Series.Sequence durationInFrames={CH2_FRAMES}><Ch2Government /></Series.Sequence>
      <Series.Sequence durationInFrames={CH3_FRAMES}><Ch3Bank /></Series.Sequence>
      <Series.Sequence durationInFrames={CH4_FRAMES}><Ch4BusinessOwner /></Series.Sequence>
      <Series.Sequence durationInFrames={CH5_FRAMES}><Ch5Core /></Series.Sequence>
      <Series.Sequence durationInFrames={CH6_FRAMES}><Ch6Engineering /></Series.Sequence>
      <Series.Sequence durationInFrames={MAP_LIMIT_FRAMES}><MapLimitation /></Series.Sequence>
      <Series.Sequence durationInFrames={CH7_FRAMES}><Ch7Failures /></Series.Sequence>
      <Series.Sequence durationInFrames={CH8_FRAMES}><Ch8Close /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
