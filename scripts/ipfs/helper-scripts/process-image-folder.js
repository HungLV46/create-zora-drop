const { getFilenameWithoutExtension, ValidationError } = require('../../util');
const _ = require('lodash');

const MAX_FILE_SIZE = 10000000;

const validateImages = (imageFilename, csvFilenameData) => {
  if (!csvFilenameData) return;

  if (imageFilename.length !== csvFilenameData.size) {
    throw new ValidationError(
      'Images and CSV mismatch',
      `
      Number of images (${imageFilename.length}) must be equal to number of data row in metadata CSV file (${
        csvFilenameData.size
      }).
      If number of images is correct please check all file extensions are supported and have size <= ${
        MAX_FILE_SIZE / 1000000
      } MB.
      `
    );
  }

  const mismatchNames = [];
  imageFilename.forEach((name) => {
    if (!csvFilenameData.has(getFilenameWithoutExtension(name))) {
      mismatchNames.push(name);
    }
  });
  if (!_.isEmpty(mismatchNames)) {
    throw new ValidationError(
      'Images and CSV mismatch',
      `Image names [${mismatchNames}] mismatch with metadata CSV content.`
    );
  }
};

module.exports = { validateImages }
