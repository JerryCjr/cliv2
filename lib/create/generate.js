const path = require('path');
const Metalsmith = require('metalsmith');
// const Handlebars = require("handlebars");
const render = require('consolidate').handlebars.render;

const getOptions = require('./options');
const ask = require('./ask');
const async = require('async');

/**
 * Generate a template given a `src` and `dest`.
 *
 * @param {string} name
 * @param {string} src
 * @param {string} dest
 * @param {Function} done
 */
module.exports = function generate(name, src, dest, done) {
  const opts = getOptions(name, src);
  const metalsmith = Metalsmith(path.resolve(src));

  const data = Object.assign(metalsmith.metadata(), {
    destDirname: name,
    inPlace: dest === process.cwd(),
    noEscape: true,
  });

  metalsmith
    // prompt
    .use(askQuestions(opts.prompts))
    // render
    .use(renderTemplateFiles());

  metalsmith
    .clean(false)
    .source('.')
    .destination(dest)
    .build((err, files) => {
      done(err);
    });

  return data;
};

/**
 * Create a middleware for asking questions.
 *
 * @param {Object} prompts
 * @return {Function}
 */
function askQuestions(prompts) {
  return (files, metalsmith, done) => {
    ask(prompts, metalsmith.metadata(), done);
  };
}

/**
 * Template in place plugin.
 *
 * @param {Object} files
 * @param {Function} done
 */

function renderTemplateFiles() {
  return (files, metalsmith, done) => {
    const keys = Object.keys(files);
    const metalsmithMetadata = metalsmith.metadata();
    async.each(
      keys,
      (file, next) => {
        const str = files[file].contents.toString();
        // do not attempt to render files that do not have mustaches
        if (!/{{([^{}]+)}}/g.test(str)) {
          return next();
        }
        render(str, metalsmithMetadata, (err, res) => {
          if (err) {
            err.message = `[${file}] ${err.message}`;
            return next(err);
          }
          files[file].contents = Buffer.from(res);
          next();
        });
      },
      done,
    );
  };
}
