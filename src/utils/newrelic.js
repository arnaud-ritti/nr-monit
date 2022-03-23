const axios = require('axios');
const { object, string, number, boolean, mixed, lazy, array } = require('yup');
const parseHeaderLink = require('parse-link-header');
const _ = require('lodash');
const FS = require('fs');

const ENDPOINTS = {
  SYNTHETICS: {
    US: 'https://synthetics.newrelic.com/synthetics/api',
    EU: 'https://synthetics.eu.newrelic.com/synthetics/api',
  },
  NERD: {
    US: 'https://api.newrelic.com/graphiql',
    EU: 'https://api.eu.newrelic.com/graphiql',
  },
  ALERTS: {
    US: 'https://api.newrelic.com/v2/alerts_location_failure_conditions',
    EU: 'https://api.eu.newrelic.com/v2/alerts_location_failure_conditions',
  },
};

const monitorSchema = object({
  name: string().required(),
  type: string().required().oneOf(['SIMPLE', 'BROWSER', 'SCRIPT_API', 'SCRIPT_BROWSER']),
  frequency: number().required().positive().integer().oneOf([1, 5, 10, 15, 30, 60, 360, 720, 1440]),
  uri: string()
    .url()
    .when('type', {
      is: val => val == 'SIMPLE' || val == 'BROWSER',
      then: schema => schema.required(),
      otherwise: schema => schema.strip(),
    }),
  locations: lazy(value => {
    switch (typeof value) {
      case 'array':
        return array().of(string()).min(1);
      case 'number':
        return number().positive().integer().min(1).default(1);
      default:
        return mixed();
    }
  }),
  status: string().required().oneOf(['ENABLED', 'MUTED', 'DISABLED']),
  slaThreshold: number().nullable().default(7.0),
  options: object().when('type', type => {
    let fields = {};

    if (type == 'SIMPLE' || type == 'BROWSER') {
      fields.validationString = string().nullable();
      fields.verifySSL = boolean().default(false).required();
    } else {
      fields.validationString = string().strip();
      fields.verifySSL = string().strip();
    }
    if (type == 'SIMPLE') {
      fields.bypassHEADRequest = boolean().default(false).required();
      fields.treatRedirectAsFailure = boolean().default(false).required();
    } else {
      fields.bypassHEADRequest = string().strip();
      fields.treatRedirectAsFailure = string().strip();
    }

    if (type == 'SCRIPT_BROWSER' || type == 'SCRIPT_API') {
      fields.scriptfile = string().required();
    } else {
      fields.scriptfile = string().strip();
    }

    return object(fields);
  }),
});

const difference = (object, base) => {
  return _.reduce(
    object,
    (result, value, key) => {
      if (!_.isEqual(value, base[key])) {
        result[key] =
          _.isObject(value) && _.isObject(base[key]) ? difference(value, base[key]) : value;
      }
      return result;
    },
    {},
  );
};

module.exports = class NewRelic {
  constructor(key, policyId, EUserver = false) {
    this.apiKey = key;
    this.policyId = policyId;
    this.server = EUserver ? 'EU' : 'US';
    if (!this.apiKey) {
      throw new Error('API key is missing');
    }
  }

  async createOrUpdate(config) {
    try {
      let monitor = await monitorSchema.validate(config);
      const currentMonitors = await this.getMonitors();
      const locations = await this.getLocations();
      let currentMonitor = null;

      currentMonitor = _.find(currentMonitors, { uri: monitor.uri, type: monitor.type });
      if (!currentMonitor) {
        currentMonitor = _.find(currentMonitors, { name: monitor.name, type: monitor.type });
      }
      if (!currentMonitor) {
        currentMonitor = _.find(currentMonitors, { name: monitor.name });
      }

      if (currentMonitor) {
        if (!Array.isArray(monitor.locations)) {
          if (monitor.locations != currentMonitor.locations.length)
            monitor.locations = _.sampleSize(
              _.map(locations, 'name'),
              Math.min(monitor.locations, 2),
            );
          else {
            monitor.locations = currentMonitor.locations;
          }
        }

        const diffs = difference(monitor, currentMonitor);
        if (!_.isEmpty(diffs)) {
          const result = await axios.patch(
            `${ENDPOINTS.SYNTHETICS[this.server]}/v3/monitors/${currentMonitor.id}`,
            diffs,
            {
              headers: {
                'Api-Key': this.apiKey,
              },
            },
          );
          if (result.status == 204) {
            return currentMonitor.id;
          }
        }
      } else {
        if (!Array.isArray(monitor.locations)) {
          monitor.locations = _.sampleSize(
            _.map(locations, 'name'),
            Math.min(monitor.locations, 2),
          );
        }
        const result = await axios.post(
          `${ENDPOINTS.SYNTHETICS[this.server]}/v3/monitors`,
          monitor,
          {
            headers: {
              'Api-Key': this.apiKey,
            },
          },
        );
        console.log(result);
        if (result.status == 201) {
          const newSynthPath = result.headers.location;
          return newSynthPath.split('/').pop();
        }
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async attachScript(entityId, scriptfile) {
    try {
      if (FS.existsSync(scriptfile)) {
        const buff = Buffer.from(FS.readFileSync(scriptfile, 'utf8'), 'utf-8');
        await axios.put(
          `${ENDPOINTS.SYNTHETICS[this.server]}/v3/monitors/${entityId}/script`,
          {
            scriptText: buff.toString('base64'),
          },
          {
            headers: {
              'Api-Key': this.apiKey,
            },
          },
        );
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async addToPolicy(entityId) {
    if (this.policyId) {
      try {
        let { data } = await axios.get(
          `${ENDPOINTS.ALERTS[this.server]}/policies/${this.policyId}.json`,
          {
            headers: {
              'Api-Key': this.apiKey,
            },
          },
        );
        data.location_failure_conditions = _.each(
          data.location_failure_conditions,
          async condition => {
            if (_.indexOf(condition.entities, entityId) == -1) {
              condition.entities.push(entityId);

              let updatePayload = {
                location_failure_condition: condition,
              };

              await axios.put(
                `${ENDPOINTS.ALERTS[this.server]}/${condition.id}.json`,
                updatePayload,
                {
                  headers: {
                    'Api-Key': this.apiKey,
                  },
                },
              );
            }
          },
        );
      } catch (error) {
        throw new Error(error.message);
      }
    }
  }

  async getLocations() {
    try {
      const { data } = await axios.get(`${ENDPOINTS.SYNTHETICS[this.server]}/v1/locations`, {
        headers: {
          'Api-Key': this.apiKey,
        },
      });
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getMonitors() {
    try {
      let monitors = [];
      let path = `${ENDPOINTS.SYNTHETICS[this.server]}/v3/monitors`;
      while (path != false) {
        const { data, headers } = await axios.get(path, {
          headers: {
            'Api-Key': this.apiKey,
          },
        });
        monitors = [...monitors, ...data.monitors];
        const links = parseHeaderLink(headers.link);
        path = links.next ?? false;
      }
      return monitors;
    } catch (error) {
      throw new Error(error.message);
    }
  }
};
