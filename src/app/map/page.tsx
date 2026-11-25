import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TopBar } from "@/components/chrome";
import { MapView } from "@/components/map/map-view";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { buildMap } from "@/lib/learning/map";
import { completedCapstones, completedConcepts } from "@/lib/learning/service";
import { masteryByLesson } from "@/lib/learning/standing";
import { content } from "@/lib/lessons/content";

export const metadata: Metadata = { title: "Map" };

/**
 * The Map shows the whole curriculum and the order Learn follows through it.
 * It is for looking, not for choosing: Learn still decides the next lesson.
 */
async function Curriculum() {
  const user = await requireUser();
  const { graph, lessons, capstones } = content();
  const db = getDb();
  const [completed, capstonesDone, mastery] = await Promise.all([completedConcepts(db, user.id), completedCapstones(db, user.id), masteryByLesson(db, user.id)]);
  const titles = new Map([...capstones].map(([cluster, capstone]) => [cluster, capstone.title]));
  const map = buildMap(graph, new Set(lessons.keys()), completed, titles, capstonesDone);
  const { counts } = map;
  const now = map.path.find((step) => step.state === "now");
  const next = map.capstoneNow ? `Mini-capstone: ${titles.get(map.capstoneNow)}` : now ? now.title : null;
  const inCluster = graph.clusters.get(map.capstoneNow ?? now?.cluster ?? "")?.title;
  return (
    <>
      <div className="map-now">
        <div>
          <p className="label">{next ? "Next in Learn" : "All caught up"}</p>
          <p className="map-now-title">{next ?? "You have finished every lesson written so far."}</p>
          {inCluster ? <p className="map-now-cluster">{inCluster}</p> : null}
        </div>
        <Link href="/learn" className="btn btn-primary" prefetch={false}>
          Learn
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </Link>
      </div>
      <div className="map-progress">
        <progress value={counts.done} max={Math.max(counts.written, 1)} aria-label="Lessons done" />
        <p className="label">
          {counts.done} of {counts.written} lessons done
          {counts.capstones > 0 ? ` · ${counts.capstonesDone} of ${counts.capstones} mini-capstones` : ""}
          {counts.planned > 0 ? ` · ${counts.planned} more planned` : ""}
        </p>
      </div>
      <MapView map={map} mastery={mastery} />
    </>
  );
}

export default function MapPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar map />
      <main className="map-page">
        <p className="label">Map</p>
        <h1>Where you are, and what it leads to</h1>
        <Suspense
          fallback={
            <p className="label map-wait" role="status">
              Finding your place
            </p>
          }
        >
          <Curriculum />
        </Suspense>
      </main>
    </div>
  );
}
