const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');

// 模板在本地操作系统的__根__路径
// 选择对应的模板之后, 存放的路径会追加模板名称
const _baseLocalSystemTemplatePath = path.join(home, '.babyfs-templates-v2');

module.exports = {
  /**
   * @function 选择模板
   * @description 选择对应模板, 返回仓库地址和本地操作系统对应的路径
   */
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
      return Promise.resolve({
        repository: `${author}/${action}#${branch}`,
        localSystemTemplatePath: `${_baseLocalSystemTemplatePath}/${action}`,
      });
    }
  },
};
