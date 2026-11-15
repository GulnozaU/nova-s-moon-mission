/**
 * Fixed NASA Image and Video Library picks (SPEC Section 4.5).
 * Credits come from each item's own record. No logo/insignia. No endorsement claim.
 */

import imagesFile from "./images.json";
import type { EventImage } from "../types";

export type ImageSlot =
  | "title"
  | "storm"
  | "southPole"
  | "equatorial"
  | "dust"
  | "greenhouse";

export type NasaImage = {
  slot: ImageSlot;
  id: string;
  title: string;
  credit: string;
  pageUrl: string;
  alt: string;
  /** Bundled path under /public (e.g. /images/storm-….jpg). */
  file: string;
  sourceUrl?: string;
};

type ImagesFile = {
  note?: string;
  images: NasaImage[];
};

const file = imagesFile as ImagesFile;

const bySlot = new Map<ImageSlot, NasaImage>(
  file.images.map((img) => [img.slot as ImageSlot, img]),
);

export function listNasaImages(): NasaImage[] {
  return [...file.images];
}

export function getNasaImage(slot: ImageSlot): NasaImage {
  const img = bySlot.get(slot);
  if (!img) {
    throw new Error(`Missing NASA image for slot: ${slot}`);
  }
  return img;
}

/** Props for showing a picture with credit under it (UI / cards). */
export type CardImageProps = {
  src: string;
  alt: string;
  credit: string;
  pageUrl: string;
  nasaId: string;
  title: string;
};

export function cardImageProps(slot: ImageSlot): CardImageProps {
  const img = getNasaImage(slot);
  return {
    src: img.file,
    alt: img.alt,
    credit: img.credit,
    pageUrl: img.pageUrl,
    nasaId: img.id,
    title: img.title,
  };
}

/** Attach to an Event so UI can render picture + credit under it. */
export function eventImageFor(slot: ImageSlot): EventImage {
  const img = getNasaImage(slot);
  return {
    slot: img.slot,
    nasaId: img.id,
    src: img.file,
    alt: img.alt,
    credit: img.credit,
    pageUrl: img.pageUrl,
  };
}

/** One-line References entries: every bundled NASA still + credit. */
export function nasaImageReferenceLines(): string[] {
  return listNasaImages().map(
    (img) => `${img.title} (${img.id}). ${img.credit}. ${img.pageUrl}`,
  );
}
