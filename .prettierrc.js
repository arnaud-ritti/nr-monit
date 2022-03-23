const fabric = require('@umijs/fabric');

module.exports = {
  ...fabric.prettier,
  arrowParens: 'avoid',
  tabWidth: 2,
  useTabs: false
};
