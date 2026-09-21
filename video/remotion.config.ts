import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// Software rasterisation is all this machine has; ANGLE/SwiftShader is what
// Playwright reports, and Remotion needs to be told to use it too.
Config.setChromiumOpenGlRenderer("angle");
