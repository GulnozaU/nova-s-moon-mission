/**
 * Picture-first card media: NASA still on top, credit line beneath (SPEC 4.5).
 * Does not use the NASA logo/insignia. Does not claim NASA endorsement.
 */

import type { EventImage } from "../types";
import { cardImageProps, type ImageSlot } from "../content/images";

type Props = {
  slot?: ImageSlot;
  image?: EventImage;
  className?: string;
};

export function CardNasaImage({ slot, image, className }: Props) {
  const resolved = image
    ? {
        src: image.src,
        alt: image.alt,
        credit: image.credit,
        nasaId: image.nasaId,
      }
    : slot
      ? (() => {
          const p = cardImageProps(slot);
          return {
            src: p.src,
            alt: p.alt,
            credit: p.credit,
            nasaId: p.nasaId,
          };
        })()
      : null;

  if (!resolved?.src) return null;

  return (
    <figure className={className} data-nasa-id={resolved.nasaId}>
      <img src={resolved.src} alt={resolved.alt} loading="lazy" />
      <figcaption>{resolved.credit}</figcaption>
    </figure>
  );
}
