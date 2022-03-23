const core = require('@actions/core');
const _ = require('lodash');
const { parseMonitors } = require('./utils/config');
const NewRelic = require('./utils/newrelic');
const path = require('path');

function run(config) {
  try {
    const configPath = path.dirname(config);
    parseMonitors(config).then(montitorConfig => {
      _.each(montitorConfig.monitors, async monitor => {
        const instance = new NewRelic(
          core.getInput('api_key') ?? '',
          monitor.policy_id ?? '',
          core.getInput('eu_server') ?? false,
        );
        const monitorId = await instance.createOrUpdate(monitor);
        if (monitorId) {
          if (
            (monitor.type == 'SCRIPT_BROWSER' || monitor.type == 'SCRIPT_API') &&
            monitor.options.scriptfile
          ) {
            await instance.attachScript(
              monitorId,
              path.join(configPath, monitor.options.scriptfile),
            );
          }
          await instance.addToPolicy(monitorId);
        }
      });
    });
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run(core.getInput('config'));
