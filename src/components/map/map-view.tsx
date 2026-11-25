import type { LessonState, MapCluster, MapData } from "@/lib/learning/map";
import { TRACKS } from "@/lib/graph/tracks";

const STATE: Record<LessonState, string> = { done: "Done", now: "Now", written: "", planned: "Planned" };

const and = (names: string[]) => (names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/** One cluster: a line that says where the learner stands in it, which opens to show its lessons. */
function Stage({ cluster, needs, mastery }: { cluster: MapCluster; needs: string[]; mastery: Map<string, number> }) {
  const total = cluster.lessons.length;
  const done = cluster.lessons.filter((lesson) => lesson.state === "done").length;
  const count =
    cluster.state === "done" ? "Done" : done === total ? "Mini-capstone left" : done > 0 ? `${done} of ${total}` : `${total} ${total === 1 ? "lesson" : "lessons"}`;
  return (
    <li className="map-stage" data-state={cluster.state} aria-current={cluster.state === "now" ? "step" : undefined}>
      <details open={cluster.state === "now"}>
        <summary>
          <span className="map-dot" aria-hidden="true" />
          <span className="map-title">{cluster.title}</span>
          <span className="label">
            {TRACKS[cluster.track]} · {count}
          </span>
        </summary>
        <div className="map-body">
          {needs.length > 0 ? <p className="map-needs">Builds on {and(needs)}.</p> : null}
          <ol>
            {cluster.lessons.map((lesson) => (
              <li key={lesson.id} data-state={lesson.state}>
                <span>{lesson.title}</span>
                <span className="label">{lesson.state === "done" && mastery.has(lesson.id) ? `Mastery ${Math.round(mastery.get(lesson.id)! * 100)}%` : STATE[lesson.state]}</span>
              </li>
            ))}
            {cluster.capstone ? (
              <li data-state={cluster.capstone.state}>
                <span>Mini-capstone: {cluster.capstone.title}</span>
                <span className="label">{STATE[cluster.capstone.state]}</span>
              </li>
            ) : null}
          </ol>
        </div>
      </details>
    </li>
  );
}

/**
 * The curriculum as one route, read from the top: the clusters Learn reaches,
 * in the order it reaches them, each opening to its lessons, and after them
 * the names of the clusters still to be written.
 * Plain HTML: nothing here needs a script to draw or to open.
 */
export function MapView({ map, mastery }: { map: MapData; mastery: Map<string, number> }) {
  const byId = new Map(map.clusters.map((cluster) => [cluster.id, cluster]));
  const planned = map.ahead.map((id) => byId.get(id)!);
  return (
    <>
      <section aria-labelledby="map-route-title">
        <h2 id="map-route-title" className="label">
          Your route
        </h2>
        <ol className="map-route">
          {map.route.map((id) => (
            <Stage key={id} cluster={byId.get(id)!} needs={byId.get(id)!.requires.map((need) => byId.get(need)!.title)} mastery={mastery} />
          ))}
        </ol>
      </section>
      {planned.length > 0 ? (
        <section className="map-ahead" aria-labelledby="map-ahead-title">
          <h2 id="map-ahead-title" className="label">
            Further on, not written yet
          </h2>
          <div className="map-tracks">
            {(Object.keys(TRACKS) as (keyof typeof TRACKS)[])
              .filter((track) => planned.some((cluster) => cluster.track === track))
              .map((track) => (
                <div key={track}>
                  <h3>{TRACKS[track]}</h3>
                  <ol className="map-route">
                    {planned
                      .filter((cluster) => cluster.track === track)
                      .map((cluster) => (
                        <li key={cluster.id} className="map-stage" data-state="planned">
                          <div className="map-row">
                            <span className="map-dot" aria-hidden="true" />
                            <span className="map-title">{cluster.title}</span>
                            <span className="label">
                              {cluster.lessons.length} {cluster.lessons.length === 1 ? "lesson" : "lessons"}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
