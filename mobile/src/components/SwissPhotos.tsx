// Sharper photos for the Swiss side of the Matterhorn: swisstopo's own aerial images (SWISSIMAGE,
// ~10 cm detail), free under the federal geodata terms ("© Data: swisstopo"). Laid over Mapbox's
// satellite layer only inside Switzerland near Zermatt, so the Italian side keeps Mapbox's photos.
import { RasterLayer, RasterSource } from '@rnmapbox/maps';
import { GRADE } from './mapLook';

const SWISSIMAGE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';

export function SwissPhotos({ id }: { id: string }) {
  return (
    <RasterSource id={`${id}-swissimage`} tileUrlTemplates={[SWISSIMAGE]} tileSize={256} minZoomLevel={8} maxZoomLevel={19}
      // West, south, east, north: the Zermatt valley down to the summit ridge.
      sourceBounds={[7.55, 45.977, 7.9, 46.15]} attribution="© Data: swisstopo">
      <RasterLayer id={`${id}-swissimage-layer`} style={GRADE} />
    </RasterSource>
  );
}
