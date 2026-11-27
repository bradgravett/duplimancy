import { BUILTIN_FRAME } from '@duplimancy/shared';

/**
 * Frames available in the editor. Today only the built-in placeholder; designer kits
 * (Typst bundles, docs/kit-spec.md) will be listed from the API once uploads exist.
 */
export interface FrameInfo {
  id: string;
  name: string;
  /** CSS class applied to the HTML/CSS preview. */
  className: string;
}

export const FRAMES: FrameInfo[] = [{ id: BUILTIN_FRAME, name: 'Plain (built-in)', className: 'frame-plain' }];

export function frameFor(id: string): FrameInfo {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0]!;
}
