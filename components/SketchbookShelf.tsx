"use client";

import { useState } from "react";
import Sketchbook, { type SketchbookLabels } from "@/components/Sketchbook";
import type { SketchVolume } from "@/content/content";

// Which volume is open. The book is keyed by volume, so picking another one
// remounts it and the whole opening (loader, riffle, home spread) plays again
// for the new pages — nothing inside the book has to be reset by hand.
export default function SketchbookShelf({
  volumes,
  labels,
}: {
  volumes: SketchVolume[];
  labels: SketchbookLabels;
}) {
  const [vol, setVol] = useState(0);

  return (
    <Sketchbook key={volumes[vol].id} volumes={volumes} vol={vol} onVol={setVol} labels={labels} />
  );
}
