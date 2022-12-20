interface NegatableOption {
  value: string;
  negated: boolean;
}

export interface FullRequestSpec {
  graph_type: string;

  aggregation: string;

  site: string; // done

  host_name?: string;
  host_name_regex: NegatableOption;
  host_in_group: NegatableOption;
  host_labels: string[];
  host_tags: [TagValue, TagValue, TagValue];

  service: string | undefined;
  service_regex: NegatableOption;
  service_in_group: NegatableOption;

  graph?: string;
}

export interface TagValue {
  group?: string;
  tag?: string;
  operator?: string;
}

export type Aggregation = 'lines' | 'sum' | 'average' | 'min' | 'max';

export type RequestSpec = Partial<FullRequestSpec>;

export type RequestSpecStringKeys = 'host_name' | 'site' | 'service' | 'graph' | 'graph_type' | 'aggregation';

export type RequestSpecNegatableOptionKeys = 'host_name_regex' | 'service_regex' | 'host_in_group' | 'service_in_group';

export const defaultRequestSpec: RequestSpec = {
  aggregation: 'lines',
  graph_type: 'template',
};

export function dependsOnNothing(): unknown[] {
  return [];
}

export function dependsOnSite(rq: RequestSpec): unknown[] {
  return [rq.site];
}

export function dependsOnHost(rq: RequestSpec): unknown[] {
  return dependsOnSite(rq).concat([rq.host_name, rq.host_name_regex, rq.host_in_group, rq.host_tags, rq.host_labels]);
}

export function dependsOnService(rq: RequestSpec): unknown[] {
  return dependsOnHost(rq).concat([rq.service, rq.service_regex, rq.service_in_group]);
}

export function dependsOn(rq: RequestSpec): unknown[] {
  return Object.values(rq);
}

export function dependsOnAll(...values: unknown[]): unknown[] {
  return values.flat(99); // hopefully nobody will nest suff deeper than 99 levels
}
