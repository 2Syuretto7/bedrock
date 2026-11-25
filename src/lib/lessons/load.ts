import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { capstone as capstoneSchema, type Capstone } from "../capstones/schema";
import { lesson as lessonSchema, PARTS, type Lesson, type Question } from "./schema";

/** Tests and browser tests point this at a small fixture curriculum. */
// Deployed copies of content/ and graph/ come from outputFileTracingIncludes in next.config.ts,
// so the bundler is told not to trace these run-time paths itself.
export const contentRoot = () => process.env.BEDROCK_CONTENT_DIR ?? process.cwd();
export const lessonsDir = (root = contentRoot()) => path.join(/* turbopackIgnore: true */ root, "content", "lessons");
export const capstonesDir = (root = contentRoot()) => path.join(/* turbopackIgnore: true */ root, "content", "capstones");
export const graphDir = (root = contentRoot()) => path.join(/* turbopackIgnore: true */ root, "graph");

export type LessonFile = { file: string; raw: unknown };

export function readLessonFiles(dir: string): LessonFile[] {
  const out: LessonFile[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current).sort()) {
      const full = path.join(/* turbopackIgnore: true */ current, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".yaml")) out.push({ file: path.relative(dir, full), raw: parse(readFileSync(full, "utf8")) });
    }
  };
  try {
    walk(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return out;
}

/** Lessons by concept id. Throws on a malformed lesson; CI stops those before they are merged. */
export function loadLessons(dir: string = lessonsDir()): Map<string, Lesson> {
  const lessons = new Map<string, Lesson>();
  for (const { file, raw } of readLessonFiles(dir)) {
    const parsed = lessonSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`${file}: ${parsed.error.issues[0]?.message}`);
    lessons.set(parsed.data.concept, parsed.data);
  }
  return lessons;
}

/** Mini-capstones by cluster id. Throws on a malformed one; CI stops those before they are merged. */
export function loadCapstones(dir: string = capstonesDir()): Map<string, Capstone> {
  const capstones = new Map<string, Capstone>();
  for (const { file, raw } of readLessonFiles(dir)) {
    const parsed = capstoneSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`${file}: ${parsed.error.issues[0]?.message}`);
    capstones.set(parsed.data.cluster, parsed.data);
  }
  return capstones;
}

export function questionsOf(lesson: Lesson): Question[] {
  return PARTS.flatMap((part) => lesson.parts[part].flatMap((block) => ("question" in block ? [block.question] : [])));
}

/** Python feature grants: which concept first teaches which feature. */
export function loadPythonFeatures(dir: string = graphDir()): Map<string, string[]> {
  try {
    const data = parse(readFileSync(path.join(/* turbopackIgnore: true */ dir, "python-features.yaml"), "utf8")) as Record<string, string[]> | null;
    return new Map(Object.entries(data ?? {}));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }
}
