/** The seven tracks, in the order the Map lists them. */
export const TRACKS = {
  F: "Foundations",
  S: "Software engineering",
  D: "Distributed systems and cloud",
  Q: "Data engineering",
  M: "MLOps",
  H: "Hardware and HPC",
  R: "Security and reliability",
} as const;
export type Track = keyof typeof TRACKS;
