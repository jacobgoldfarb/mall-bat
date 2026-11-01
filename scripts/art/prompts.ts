import type { AssetSpec } from '../../art/assets';
import type { StyleParams } from './pixellab';

const PROP_SUFFIX = 'isometric pixel art game prop, 2004 american shopping mall, cozy quirky, light from upper left, transparent background, no text';
const CEILING_SUFFIX = `${PROP_SUFFIX}, scavenged, makeshift, lived-in`;
const CHARACTER_SUFFIX = 'pixel art game character, full body, 2004 fashion, cozy quirky';
const FLOOR_SUFFIX = 'top-down seamless floor texture, flat, no perspective, no objects, pixel art';
const ICON_SUFFIX = 'pixel art game ui icon, bold chunky readable silhouette, centered, fills the frame, 2004 shopping mall, quirky, light from upper left, transparent background, no text';

export const STYLE: Record<AssetSpec['category'], StyleParams> = {
  prop: { outline: 'selective outline', shading: 'medium shading', detail: 'medium detail', isometric: true },
  ceiling: { outline: 'selective outline', shading: 'medium shading', detail: 'medium detail', isometric: true },
  floor: { outline: 'lineless', shading: 'basic shading', detail: 'medium detail', view: 'high top-down', isometric: false },
  character: { outline: 'selective outline', detail: 'medium detail', view: 'low top-down' },
  icon: { outline: 'single color black outline', shading: 'medium shading', detail: 'medium detail', view: 'side', isometric: false },
};

export function promptFor(spec: AssetSpec): string {
  switch (spec.category) {
    case 'prop':
      return `${spec.subject}, ${spec.quirk}. ${PROP_SUFFIX}`;
    case 'ceiling':
      return `${spec.subject}, ${spec.quirk}. ${CEILING_SUFFIX}`;
    case 'floor':
      return `${spec.subject}. ${FLOOR_SUFFIX}`;
    case 'character':
      return `${spec.subject}. ${CHARACTER_SUFFIX}`;
    case 'icon':
      return `${spec.subject}. ${ICON_SUFFIX}`;
  }
}
