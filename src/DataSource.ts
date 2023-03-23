import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MetricFindValue,
} from '@grafana/data';
import { FetchResponse } from '@grafana/runtime';
import { replaceVariables } from 'utils';

import { MetricFindQuery, RequestSpec } from './RequestSpec';
import RestApiBackend from './backend/rest';
import { Backend } from './backend/types';
import WebApiBackend from './backend/web';
import { Backend as BackendType, CmkQuery, DataSourceOptions, Edition, ResponseDataAutocomplete } from './types';
import { AutoCompleteParams } from './ui/autocomplete';
import { createCmkContext } from './utils';
import { WebApiResponse } from './webapi';

export class DataSource extends DataSourceApi<CmkQuery> {
  webBackend: WebApiBackend;
  restBackend: RestApiBackend;

  constructor(private instanceSettings: DataSourceInstanceSettings<DataSourceOptions>) {
    super(instanceSettings);
    this.webBackend = new WebApiBackend(this);
    this.restBackend = new RestApiBackend(this);
  }

  async query(dataQueryRequest: DataQueryRequest<CmkQuery>): Promise<DataQueryResponse> {
    for (const target of dataQueryRequest.targets) {
      target.requestSpec = replaceVariables(target.requestSpec, dataQueryRequest.scopedVars);
    }
    return this.getBackend().query(dataQueryRequest);
  }

  async metricFindQuery(query: MetricFindQuery, options?: any): Promise<MetricFindValue[]> {
    if (query.objectType === 'site') {
      // rest-api site endpoint were added in 2.2.0 so we have to use the web-api here
      // TODO: clean up (remove filterSites from Backend) with end of 2.1.0
      return await this.getBackend().listSites();
    }
    // we use the rest backend for both web and rest backend, because those endpoints are already implement in 2.1.0
    return await this.restBackend.metricFindQuery(query);
  }

  async testDatasource(): Promise<unknown> {
    return this.getBackend().testDatasource();
  }

  async autocompleterRequest<T>(api_url: string, data: unknown): Promise<FetchResponse<WebApiResponse<T>>> {
    return this.webBackend.autocompleterRequest(api_url, data);
  }

  async contextAutocomplete(
    ident: string,
    partialRequestSpec: Partial<RequestSpec>,
    prefix: string,
    params: Partial<AutoCompleteParams>
  ): Promise<Array<{ value: string; label: string; isDisabled: boolean }>> {
    if (ident === 'label' && this.getBackendType() === 'web') {
      // we have a 2.1.0 version without werk #15074 so label autocompleter is a special edge case
      // can be removed after we stop supporting 2.1.0
      const response = await this.autocompleterRequest<Array<{ value: string }>>('ajax_autocomplete_labels.py', {
        world: params.world,
        search_label: prefix,
      });
      return response.data.result.map((val: { value: string }) => ({
        value: val.value,
        label: val.value,
        isDisabled: false,
      }));
    }
    const context = createCmkContext(
      replaceVariables(partialRequestSpec),
      this.getBackendType() === 'rest' ? 'latest' : '2.1.0'
    );
    const response = await this.autocompleterRequest<ResponseDataAutocomplete>('ajax_vs_autocomplete.py', {
      ident,
      value: prefix,
      params: {
        ...params,
        context,
      },
    });
    return response.data.result.choices.map(([value, label]: [string, string]) => ({
      value,
      label,
      isDisabled: value === null,
    }));
  }

  getUrl(): string | undefined {
    return this.instanceSettings.url;
  }

  // TODO: Move config default values to a central place instead of scattering it in getEdition and getBackendType

  getEdition(): Edition {
    return this.instanceSettings.jsonData.edition ?? 'RAW';
  }

  getBackendType(): BackendType {
    return this.instanceSettings.jsonData.backend ?? 'rest';
  }

  getBackend(): Backend {
    if (this.getBackendType() === 'web') {
      return this.webBackend;
    }
    return this.restBackend;
  }

  getUsername(): string {
    const username = this.instanceSettings.jsonData.username;
    if (typeof username === 'string') {
      return username;
    }
    throw Error('Impossible');
  }
}
