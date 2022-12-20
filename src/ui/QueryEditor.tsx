import React from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../DataSource';
import { CmkQuery, DataSourceOptions, ResponseDataAutocomplete, GraphKind } from '../types';
import { VerticalGroup } from '@grafana/ui';
import { CheckMkSelect } from './components';
import { createAutocompleteConfig } from './autocomplete';
import { RequestSpec } from '../RequestSpec';
import { titleCase } from '../utils';

type Props = QueryEditorProps<DataSource, CmkQuery, DataSourceOptions>;

async function contextAutocomplete(
  datasource: DataSource,
  ident: string,
  partialRequestSpec: Partial<RequestSpec>,
  prefix: string
) {
  console.log('autocomplete', ident, prefix);
  const response = await datasource.autocompleterRequest<ResponseDataAutocomplete>(
    'ajax_vs_autocomplete.py',
    createAutocompleteConfig(partialRequestSpec, ident, prefix)
  );
  return response.data.result.choices.map(([value, label]: [string, string]) => ({
    value,
    label,
    isDisabled: value === null,
  }));
}

export const QueryEditor = (props: Props): JSX.Element => {
  const { onChange, onRunQuery, datasource, query } = props;
  const rs = query.requestSpec || {};
  const [qAggregation, _setQArregation] = React.useState(rs.aggregation || 'lines');
  const [qGraphType, setQGraphType] = React.useState(rs.graph_type || 'template');
  const [qSite, setQSite] = React.useState(rs.site);
  const [qHost, setQHost] = React.useState({
    host_name: rs.host_name,
    host_name_regex: rs.host_name_regex,
    host_in_group: rs.host_in_group,
    host_labels: rs.host_labels,
    host_tags: rs.host_tags,
  });
  const [qService, setQService] = React.useState({
    service: rs.service,
    service_regex: rs.service_regex,
    service_in_group: rs.service_in_group,
  });
  const [qGraph, setQGraph] = React.useState(rs.graph);

  const editionMode = datasource.getEdition();

  const requestSpec = {
    site: qSite,
    ...qHost,
    ...qService,
    graph_type: qGraphType,
    graph: qGraph,
    aggregation: qAggregation,
  };

  // TODO: not sure if this is a dirty hack or a great solution:
  // https://beta.reactjs.org/apis/react/useState#storing-information-from-previous-renders
  const [prevCount, setPrevCount] = React.useState(JSON.stringify(requestSpec));
  if (prevCount !== JSON.stringify(requestSpec)) {
    setPrevCount(JSON.stringify(requestSpec));
    onChange({ ...query, requestSpec: requestSpec });
    onRunQuery();
  }

  //  const labelAutocomplete = async (value: string) => {
  //    const response = await props.datasource.autocompleterRequest<Array<{ value: string }>>(
  //      'ajax_autocomplete_labels.py',
  //      {
  //        world: 'core',
  //        search_label: value,
  //      }
  //    );
  //    return response.data.result.map((val: { value: string }) => ({ value: val.value, label: val.value }));
  //  };

  //  const completeTagChoices = async (tagGroupId: string, value: string) => {
  //    const response = await props.datasource.autocompleterRequest<ResponseDataAutocomplete>('ajax_vs_autocomplete.py', {
  //      ident: 'tag_groups_opt',
  //      params: { group_id: tagGroupId, strict: true },
  //      value: value,
  //    });
  //    return response.data.result.choices.map(([value, label]: [string, string]) => ({
  //      value,
  //      label,
  //    }));
  //  };

  //  const presentationCompleter = async (): Promise<Array<SelectableValue<Presentation>>> => [
  //    { value: 'lines', label: 'Lines' },
  //    { value: 'sum', label: 'Sum' },
  //    { value: 'average', label: 'Average' },
  //    { value: 'min', label: 'Minimum' },
  //    { value: 'max', label: 'Maximum' },
  //  ];

  //  const update = (rq: RequestSpec, key: string, value: unknown) => {
  //    const newRequestSpec = { ...rq, [key]: value };
  //    setRequestSpec(newRequestSpec);
  //    onChange({ ...query, requestSpec: newRequestSpec });
  //    onRunQuery();
  //  };

  const graphTypeCompleter = async (): Promise<Array<SelectableValue<GraphKind>>> => [
    { value: 'template', label: 'Template' },
    { value: 'metric', label: 'Single metric' },
  ];

  const siteAutocompleter = React.useCallback(
    (prefix: string) => contextAutocomplete(datasource, 'sites', {}, prefix),
    [datasource]
  );
  const hostAutocompleter = React.useCallback(
    (prefix: string) => contextAutocomplete(datasource, 'monitored_hostname', { site: qSite }, prefix),
    [datasource, qSite]
  );
  const serviceAutocompleter = React.useCallback(
    (prefix: string) =>
      contextAutocomplete(datasource, 'monitored_service_description', { site: qSite, ...qHost }, prefix),
    [datasource, qSite, qHost]
  );
  const graphAutocompleter = React.useCallback(
    (prefix: string) => {
      const ident = qGraphType === 'metric' ? 'monitored_metrics' : 'available_graphs';
      return contextAutocomplete(
        datasource,
        ident,
        { site: qSite, ...qHost, ...qService, graph_type: qGraphType },
        prefix
      );
    },
    [datasource, qSite, qHost, qService, qGraphType]
  );

  if (editionMode === 'RAW') {
    return (
      <VerticalGroup>
        <CheckMkSelect label={'Site'} value={qSite} onChange={setQSite} autocompleter={siteAutocompleter} />
        <CheckMkSelect<'host_name'>
          label={'Host'}
          value={qHost.host_name}
          onChange={(host) => setQHost({ ...qHost, host_name: host })}
          autocompleter={hostAutocompleter}
        />
        <CheckMkSelect<'service'>
          label={'Service'}
          value={qService.service}
          onChange={(service) => setQService({ ...qService, service: service })}
          autocompleter={serviceAutocompleter}
        />
        <CheckMkSelect<'graph_type'>
          label={'Graph type'}
          value={qGraphType}
          onChange={setQGraphType}
          autocompleter={graphTypeCompleter}
        />
        <CheckMkSelect
          label={titleCase(qGraphType)}
          value={qGraph}
          onChange={setQGraph}
          autocompleter={graphAutocompleter}
        />
      </VerticalGroup>
    );
  } else {
    return <div></div>;
  }
};
