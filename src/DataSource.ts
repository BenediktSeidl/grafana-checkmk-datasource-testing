import { defaults, zip } from 'lodash';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';

const error = (message: string) => ({
  status: 'error',
  title: 'Error',
  message,
});

const buildUrlWithParams = (url: string, params: any) =>
  url + Object.keys(params).reduce((string, param) => `${string}${string ? '&' : '?'}${param}=${params[param]}`, '');

const buildRequestBody = (data: any) => `request=${JSON.stringify(data)}`;

function buildMetricDataFrame(response: any, query: MyQuery) {
  if (response.data.result_code !== 0) {
    throw new Error(`${response.data.result}`);
  }
  const { start_time, step, curves } = response.data.result;

  const frame = new MutableDataFrame({
    refId: query.refId,
    fields: [{ name: 'Time', type: FieldType.time }].concat(
      curves.map((x: any) => {
        return { name: x.title, type: FieldType.number };
      })
    ),
  });
  zip(...curves.map((x: any) => x.rrddata)).forEach((d: any, i: number) =>
    frame.appendRow([(start_time + i * step) * 1000, ...d])
  );
  return frame;
}

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  rawUrl: string;
  _username: string;
  _secret: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.rawUrl = instanceSettings.jsonData.url || '';
    this._username = instanceSettings.jsonData.username || '';
    this._secret = instanceSettings.jsonData.secret || 'undefined';
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.unix();
    const to = range!.to.unix();

    const recipe = buildRequestBody({
      specification: [
        'template',
        {
          site: 'heute',
          host_name: 'heute',
          service_description: 'CPU load',
          graph_index: 0,
        },
      ],
      data_range: {
        time_range: [from, to],
      },
    });
    let ret = await this.sitesQuery(options.targets[0]);
    console.log(ret);
    let datasource = this; // defined to be reachable on the next closure

    const promises = options.targets.map(target => {
      const query = defaults(target, defaultQuery);

      return datasource.getGraphQuery(recipe, query);
    });
    return Promise.all(promises).then(data => ({ data }));
  }

  sitesQuery(options: MyQuery) {
    return this.doRequest({ ...options, params: { action: 'get_user_sites' } }).then(function(response) {
      return response.data.result;
    });
  }
  getGraphQuery(data: string, query: MyQuery) {
    return this.doRequest({ ...query, params: { action: 'get_graph' }, data: data }).then(response =>
      buildMetricDataFrame(response, query)
    );
  }

  async testDatasource() {
    const urlValidationRegex = /^https?:\/\/[^/]*\/[^/]*\/$/;
    if (!urlValidationRegex.test(this.rawUrl)) {
      return error(
        'Invalid URL format. Please make sure to include protocol and trailing slash. Example: https://checkmk.server/site/'
      );
    }
    return this.doRequest({ params: { action: 'get_host_names' }, refId: 'testDatasource' }).then(response => {
      if (response.status !== 200) {
        return error('Could not connect to provided URL');
      } else if (!response.data.result) {
        return error(response.data);
      } else {
        return {
          status: 'success',
          message: 'Data source is working',
          title: 'Success',
        };
      }
    });
  }

  async doRequest(options: MyQuery) {
    const result = await getBackendSrv()
      .datasourceRequest({
        method: options.data == null ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        url: buildUrlWithParams(
          `${this.rawUrl}check_mk/webapi.py`,
          Object.assign(
            {
              _username: this._username,
              _secret: this._secret,
              output_format: 'json',
            },
            options.params
          )
        ),
        data: options.data,
      })
      .catch(({ cancelled }) =>
        cancelled
          ? error(
              `API request was cancelled. This has either happened because no 'Access-Control-Allow-Origin' header is present, or because of a ssl protocol error. Make sure you are running at least Checkmk version 2.0.`
            )
          : error('Could not read API response, make sure the URL you provided is correct.')
      );

    return result;
  }
}