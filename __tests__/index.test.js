const process = require('process');
const cp = require('child_process');
const path = require('path');
const {test} = require('@jest/globals');


// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
    process.env['INPUT_API_KEY'] = "NRAK-40XOUETFL8RMOYAG47M2BRH9N9L";
    process.env['INPUT_EU_SERVER'] = false;
    process.env['INPUT_CONFIG'] = path.join(__dirname, '..', 'example/_monitors.yml');
    const np = process.execPath;
    const ip = path.join(__dirname, '..', 'dist', 'index.js');
    const options = {
        env: process.env
    };
    console.log(cp.execFileSync(np, [ip], options).toString());
});