import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { Figure } from "@/components/lesson/figures";
import { figurePlacements } from "@/lib/lessons/gallery";

export const metadata: Metadata = { title: "Figures" };

/**
 * Every figure in the course on one page, so that each can be checked at every screen size before it is merged.
 * Previews and local builds only: production has no gallery.
 */
export default function GalleryPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const placements = figurePlacements();
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="map-page">
        <p className="label">Figures</p>
        <h1>Every figure in the course</h1>
        <p className="gallery-count">
          {placements.length} {placements.length === 1 ? "placement" : "placements"}, in the order Learn teaches them. This page exists only in previews.
        </p>
        <article className="prose-lesson">
          {placements.map((placement) => (
            <div key={placement.key} className="gallery-item" data-figure={placement.name}>
              <p className="label">
                {placement.where} · {placement.name}
              </p>
              <Figure name={placement.name} props={placement.props} />
            </div>
          ))}
        </article>
      </main>
    </div>
  );
}
