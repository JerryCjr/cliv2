const inquirer = require('inquirer');

module.exports = {
  async chooseTemplate() {
    const author = 'JerryCjr';
    const branch = 'dev';
    const { action } = await inquirer.prompt({
      name: 'action',
      type: 'list',
      message: 'Please pick a template:',
      choices: [
        {
          name: 'web-library-template',
          value: 'web-library-template',
        },
        {
          name: 'node-library-template',
          value: 'node-library-template',
        },
      ],
    });
    if (action) {
      return Promise.resolve(`${author}/${action}#${branch}`);
    }
  },
};
