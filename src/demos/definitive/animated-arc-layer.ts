// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { ArcLayer } from "@deck.gl/layers";
import type { DefaultProps } from "@deck.gl/core";

import type { ShaderModule } from "@luma.gl/shadertools";

const uniformBlock = `\
uniform tripsUniforms {
  vec2 timeRange;
} trips;
`;

export type TripsProps = {
  timeRange: [number, number];
};

export const tripsUniforms = {
  name: "trips",
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    timeRange: "vec2<f32>",
  },
} as const satisfies ShaderModule<TripsProps>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnimatedArcLayerProps<DataT = any> = _AnimatedArcLayerProps<DataT>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _AnimatedArcLayerProps<DataT = any> = {
  getSourceTimestamp?: (d: DataT) => number;
  getTargetTimestamp?: (d: DataT) => number;
  getProgress?: (d: DataT) => number;
  timeRange?: [number, number];
};

const defaultProps = {
  getSourceTimestamp: { type: "accessor", value: 0 },
  getTargetTimestamp: { type: "accessor", value: 1 },
  getProgress: { type: "accessor", value: 0 },
  timeRange: { type: "array", compare: true, value: [0, 1] },
} as DefaultProps<_AnimatedArcLayerProps>;

export default class AnimatedArcLayer<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DataT = any,
  ExtraProps = Record<string, unknown>
> extends ArcLayer<DataT, ExtraProps & Required<_AnimatedArcLayerProps>> {
  layerName = "AnimatedArcLayer";
  defaultProps = defaultProps;

  getShaders() {
    const shaders = super.getShaders();
    shaders.inject = {
      "vs:#decl": `\
in float instanceSourceTimestamp;
in float instanceTargetTimestamp;
in float instanceProgress;
out float vTimestamp;
out float vProgress;
out float vSegmentRatio;
`,
      "vs:#main-end": `\
vTimestamp = mix(instanceSourceTimestamp, instanceTargetTimestamp, segmentRatio);
vProgress = instanceProgress / 100.0;
vSegmentRatio = segmentRatio;
`,
      "fs:#decl": `\
in float vTimestamp;
in float vProgress;
in float vSegmentRatio;
`,
      "fs:#main-start": `\
if (vTimestamp < trips.timeRange.x || vTimestamp > trips.timeRange.y) {
  discard;
}
`,
      "fs:DECKGL_FILTER_COLOR": `\
color.a *= (vTimestamp - trips.timeRange.x) / (trips.timeRange.y - trips.timeRange.x);

if (abs(vSegmentRatio - vProgress) < 0.03) {
  color.rgb = vec3(1.0, 0.0, 0.0);
}
`,
    };
    shaders.modules = [...shaders.modules, tripsUniforms];
    return shaders;
  }

  initializeState() {
    super.initializeState();
    const attributeManager = this.getAttributeManager();
    if (attributeManager) {
      attributeManager.addInstanced({
        instanceSourceTimestamp: {
          size: 1,
          accessor: "getSourceTimestamp",
        },
        instanceTargetTimestamp: {
          size: 1,
          accessor: "getTargetTimestamp",
        },
        instanceProgress: {
          size: 1,
          accessor: "getProgress",
        },
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draw(params: any) {
    const { timeRange } = this.props;
    const tripsProps: TripsProps = { timeRange };
    const model = this.state.model;
    if (model) {
      model.shaderInputs.setProps({ trips: tripsProps });
    }
    super.draw(params);
  }
}
