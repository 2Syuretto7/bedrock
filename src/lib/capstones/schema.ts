import { z } from "zod";
import { block, type Question } from "../lessons/schema";

/**
 * A mini-capstone closes a cluster. It is one small project, built in stages,
 * that needs several of the cluster's lessons at once. It teaches nothing new.
 */
export const capstone = z.strictObject({
  /** The cluster this closes, for example S0. One mini-capstone per cluster. */
  cluster: z.string().regex(/^[A-Z][0-9]+$/),
  title: z.string().min(1),
  minutes: z.number().int().min(15).max(240),
  /** One sentence: what the learner will have built or shown by the end. */
  claim: z.string().min(1),
  /** The project as a whole, before any stage: what is being built and why it needs the cluster. */
  brief: z.string().min(1),
  starter: z.string().optional(),
  stages: z
    .array(z.strictObject({ title: z.string().min(1), blocks: z.array(block).min(1) }))
    .min(3)
    .max(8),
  /** Shown once every stage is solved: what was built, and which lessons each piece came from. */
  review: z.string().min(1),
});
export type Capstone = z.infer<typeof capstone>;

/** Progress on a mini-capstone is stored like a lesson's, under this id. It can never be a concept id. */
export const capstoneId = (cluster: string) => `capstone.${cluster.toLowerCase()}`;
export const isCapstoneId = (id: string) => id.startsWith("capstone.");
export const capstoneCluster = (id: string) => id.slice("capstone.".length).toUpperCase();

export function capstoneQuestions(capstone: Capstone): Question[] {
  return capstone.stages.flatMap((stage) => stage.blocks.flatMap((block) => ("question" in block ? [block.question] : [])));
}
