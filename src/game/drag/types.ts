export type DragKind = "chip" | "material" | "water" | "nova";

export type DragPayload = {
  kind: DragKind;
  /** Chip/material units delivered on drop. */
  amount: number;
  /** Optional source id (e.g. tray cell index). */
  sourceId?: string;
};

export type DropAccept = DragKind | DragKind[];
