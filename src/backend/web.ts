import { DataQueryRequest, DataQueryResponse, FieldType, MutableDataFrame } from '@grafana/data';
import { BackendSrvRequest, FetchResponse, getBackendSrv } from '@grafana/runtime';
import { defaults, get, isUndefined, zip } from 'lodash';

import { CmkQuery, defaultQuery } from '../types';
import {
  WebAPiGetGraphResult,
  WebApiResponse,
  buildRequestBody,
  buildUrlWithParams,
  createWebApiRequestBody,
  createWebApiRequestSpecification,
  updateQuery,
} from './../webapi';
import { Backend, DatasourceOptions } from './types';

export default class WebApiBackend implements Backend {
  datasource: DatasourceOptions;

  constructor(datasource: DatasourceOptions) {
    this.datasource = datasource;
  }
  async testDatasource(): Promise<unknown> {
    return this.cmkRequest<unknown>({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      url: buildUrlWithParams(`${this.datasource.getUrl()}/cmk/check_mk/webapi.py`, {
        action: 'get_combined_graph_identifications',
      }),
      data: buildRequestBody({
        context: { host: { host: 'ARANDOMNAME' } },
        single_infos: ['host'],
        datasource: 'services',
      }),
    })
      .catch((error) => {
        const firstLineOfError = error.message.split('\n')[0];
        if (firstLineOfError === 'Checkmk exception: Currently not supported with this Checkmk Edition') {
          if (this.datasource.getEdition() === 'CEE') {
            // edition dropdown = cee, so seeing this error means that we speak with a raw edition
            throw new Error('Mismatch between selected Checkmk edition and monitoring site edition');
          } else {
            // edition dropdown = raw, so seeing this error is expected (but auth worked, so we are fine)
            return;
          }
        }
        throw error;
      })
      .then(() => {
        return {
          status: 'success',
          message: 'Data source is working',
          title: 'Success',
        };
      });
  }
  async query(options: DataQueryRequest<CmkQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range.from.unix();
    const to = range.to.unix();

    const promises = options.targets
      .filter((target) => !target.hide)
      .map((target) => {
        // TODO: check if the defaults call is still necessary.
        const query = defaults(target, defaultQuery);
        return this.getGraphQuery([from, to], query);
      });
    return Promise.all(promises).then((data) => ({ data }));
  }

  async autocompleterRequest<T>(api_url: string, data: unknown): Promise<FetchResponse<WebApiResponse<T>>> {
    return this.cmkRequest<T>({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      url: `${this.datasource.getUrl()}/cmk/check_mk/${api_url}`,
      data: buildRequestBody(data),
    });
  }
  async cmkRequest<T>(request: BackendSrvRequest): Promise<FetchResponse<WebApiResponse<T>>> {
    const result = await getBackendSrv()
      .fetch<WebApiResponse<T>>(request)
      .toPromise()
      .catch((error) => {
        if (error.cancelled) {
          throw new Error(
            `API request was cancelled. This has either happened because no 'Access-Control-Allow-Origin' header is present, or because of a ssl protocol error. Make sure you are running at least Checkmk version 2.0.`
          );
        } else {
          throw new Error('Could not read API response, make sure the URL you provided is correct.');
        }
      });

    if (result === undefined) {
      throw new Error('Got undefined result');
    }
    if (typeof result.data === 'string') {
      throw new Error(`${result.data}`);
    } else if (result.data.result_code !== 0) {
      let message = `${result.data}`;
      if (result.data.result !== undefined) {
        message = `${result.data.result}`;
      }
      throw new Error(message);
    } else {
      return result;
    }
  }

  getGraphQuery = async (range: number[], query: CmkQuery): Promise<MutableDataFrame<unknown>> => {
    updateQuery(query);
    const graph = get(query, 'requestSpec.graph');
    if (isUndefined(graph) || graph === '') {
      return Promise.resolve(new MutableDataFrame());
    }

    const response = (
      await getBackendSrv()
        .fetch({
          url:
            `${this.datasource.getUrl()}/cmk/check_mk/webapi.py?` +
            new URLSearchParams({ action: 'get_graph' }).toString(),
          data: buildRequestBody(
            createWebApiRequestBody(
              createWebApiRequestSpecification(query.requestSpec, this.datasource.getEdition()),
              range
            )
          ),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          method: 'POST',
        })
        .toPromise()
    )?.data as WebApiResponse<WebAPiGetGraphResult>;

    if (response.result_code !== 0) {
      throw new Error(`${response.result}`);
    }
    const { start_time, step, curves } = response.result;

    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [
        { name: 'Time', type: FieldType.time },
        ...curves.map((x: { title: string }) => ({ name: x.title, type: FieldType.number })),
      ],
    });

    //TODO: uncomplicate this.
    zip(...curves.map((x: { rrddata: Array<{ i: number; d: Record<string, unknown> }> }) => x.rrddata)).forEach(
      (d, i) => frame.appendRow([(start_time + i * step) * 1000, ...d])
    );

    return frame;
  };
}
