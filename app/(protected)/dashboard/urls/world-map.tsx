import { VisSingleContainer, VisTooltip, VisTopoJSONMap } from "@unovis/react";
import { WorldMapTopoJSON } from "@unovis/ts/maps";

type WorldMapArea = {
  id: string;
};

type WorldMapTriggerDatum = {
  id: string;
};

type WorldMapTriggers = Record<string, (datum: WorldMapTriggerDatum) => string>;

export default function WorldMap({
  areaData,
  wrapperWidth,
  triggers,
}: {
  areaData: WorldMapArea[];
  wrapperWidth: number;
  triggers: WorldMapTriggers;
}) {
  return (
    <VisSingleContainer
      data={{ areas: areaData }}
      width={wrapperWidth * 0.99}
    >
      <VisTopoJSONMap topojson={WorldMapTopoJSON} />
      <VisTooltip triggers={triggers} />
    </VisSingleContainer>
  );
}
