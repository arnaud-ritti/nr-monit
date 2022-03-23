const YAML = require('yaml');
const FS = require('fs');

module.exports.parseMonitors = path => {
  return new Promise(resolve => {
    try {
      if (FS.existsSync(path)) {
        resolve(YAML.parse(FS.readFileSync(path, 'utf8')));
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      if (error instanceof Error) throw new Error(error.message);

      throw new Error('An error occured');
    }
  });
};
