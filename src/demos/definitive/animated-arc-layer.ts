import type { DefaultProps, UpdateParameters } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { ArcLayer } from "@deck.gl/layers";
import type { ShaderModule } from "@luma.gl/shadertools";
import {
  isGroupVisible,
  sortAndGroup,
  type ArcsGroup,
} from "./helpers/layer-utils";

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

export type AnimatedArcLayerProps<DataT = unknown> =
  _AnimatedArcLayerProps<DataT>;

type _AnimatedArcLayerProps<DataT = unknown> = {
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

/**
 * Animated Arc Layer - Base implementation
 * Extends ArcLayer with time-based animation support
 */
export default class AnimatedArcLayer<
  DataT = unknown,
  ExtraProps = Record<string, unknown>
> extends ArcLayer<
  DataT,
  ExtraProps & Required<_AnimatedArcLayerProps<DataT>>
> {
  layerName = "AnimatedArcLayer";
  defaultProps = defaultProps;

  getShaders() {
    const shaders = super.getShaders();
    shaders.inject = {
      "vs:#decl": `\
in float instanceSourceTimestamp;
in float instanceTargetTimestamp;
out float vTimestamp;
`,
      "vs:#main-end": `\
vTimestamp = mix(instanceSourceTimestamp, instanceTargetTimestamp, segmentRatio);
`,
      "fs:#decl": `\
in float vTimestamp;
`,
      "fs:#main-start": `\
if (vTimestamp < trips.timeRange.x || vTimestamp > trips.timeRange.y) {
  discard;
}
`,
      "fs:DECKGL_FILTER_COLOR": `\
color.a *= (vTimestamp - trips.timeRange.x) / (trips.timeRange.y - trips.timeRange.x);
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

  draw(params: Parameters<ArcLayer<DataT>["draw"]>[0]): void {
    const { timeRange } = this.props;
    const tripsProps: TripsProps = { timeRange };
    const model = this.state.model;
    if (model) {
      model.shaderInputs.setProps({ trips: tripsProps });
    }
    super.draw(params);
  }
}

export class AnimatedArcGroupLayer<
  DataT = unknown,
  ExtraProps = Record<string, unknown>
> extends CompositeLayer<ExtraProps & Required<AnimatedArcLayerProps<DataT>>> {
  static layerName = "AnimatedArcGroupLayer";
  layerName = "AnimatedArcGroupLayer";
  defaultProps = AnimatedArcLayer.defaultProps;

  declare state: {
    groups: ArcsGroup<DataT>[];
  };

  updateState({ props, changeFlags }: UpdateParameters<this>): void {
    if (changeFlags.dataChanged) {
      const { data, getSourceTimestamp, getTargetTimestamp } = props;
      const groups = sortAndGroup(
        data as DataT[],
        getSourceTimestamp,
        getTargetTimestamp
      );
      this.setState({ groups });
    }
  }

  renderLayers(): AnimatedArcLayer<DataT>[] {
    const { timeRange } = this.props;
    const { groups = [] } = this.state;

    return groups.map(
      (group, index) =>
        new AnimatedArcLayer<DataT>(
          this.getSubLayerProps({
            id: index.toString(),
            data: group.data,
            visible: isGroupVisible(group, timeRange),
            timeRange,
          })
        )
    );
  }
}
