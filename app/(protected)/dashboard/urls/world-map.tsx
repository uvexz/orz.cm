import { VisSingleContainer, VisTooltip, VisTopoJSONMap } from "@unovis/react";
import { WorldMapTopoJSON } from "@unovis/ts/maps";

export default function WorldMap({
  areaData,
  wrapperWidth,
  triggers,
}: {
  areaData: any;
  wrapperWidth: number;
  triggers: any;
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
