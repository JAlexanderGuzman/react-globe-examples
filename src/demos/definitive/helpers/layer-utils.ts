/**
 * Utilities for animated arc layers
 */

export interface ArcsGroup<DataT> {
  startTime: number;
  endTime: number;
  data: DataT[];
}

const MAX_ARCS_PER_LAYER = 2500;

/**
 * Sort and group data by time range for performance optimization
 */
export function sortAndGroup<DataT>(
  data: DataT[],
  getStartTime: (d: DataT) => number,
  getEndTime: (d: DataT) => number,
  groupSize: number = MAX_ARCS_PER_LAYER,
): ArcsGroup<DataT>[] {
  const groups: ArcsGroup<DataT>[] = [];
  let group: ArcsGroup<DataT> | undefined;

  data.sort((d1, d2) => getStartTime(d1) - getStartTime(d2));

  for (const d of data) {
    if (!group || group.data.length >= groupSize) {
      group = {
        startTime: Infinity,
        endTime: -Infinity,
        data: [],
      };
      groups.push(group);
    }
    if (group) {
      group.data.push(d);
      group.startTime = Math.min(group.startTime, getStartTime(d));
      group.endTime = Math.max(group.endTime, getEndTime(d));
    }
  }
  return groups;
}

/**
 * Check if a group is visible within the time range
 */
export function isGroupVisible(
  group: ArcsGroup<unknown>,
  timeRange: [number, number],
): boolean {
  return group.startTime < timeRange[1] && group.endTime > timeRange[0];
}

