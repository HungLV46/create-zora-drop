const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFilenameWithoutExtension(filename) {
  return filename.split('.').slice(0, -1).join('.');
};

async function readCSV(filepath) {
  let dataHeaders;
  const content = [];

  // process csv synchronously
  await new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
    .pipe(csv())
    .on('headers', (headers) => { 
      content.push(headers); 
      dataHeaders = headers; 
    })
    .on('data', (data) => { 
      if(_.isEmpty(dataHeaders)) { 
        throw new Error("CSV body is read before it's header");
      }

      content.push(dataHeaders.map(header => data[header]));
    })
    .on('end', () => { resolve(); })
    .on('error', reject);
  });

  return content;
}

function createProcessBar(barname, total) {
  const pbar = new cliProgress.SingleBar(
    {
      format: `${colors.cyan(`${barname}`)} | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Chunks`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );
  pbar.start(total, 0);
  return pbar;
}

class ValidationError extends Error {
  constructor(name = 'UnexpectedInput', message) {
    super(message);
    this.name = name;
    this.stack = (new Error()).stack;
  }
}

module.exports = {
  sleep,
  getFilenameWithoutExtension,
  readCSV,
  createProcessBar,
  ValidationError
}
