const { getFilenameWithoutExtension, ValidationError } = require("../../util");
const _ = require("lodash");

const MAX_FILE_SIZE = 10000000;

const validateAnimations = (animationFilenames, csvFilenameData) => {
  if (!csvFilenameData) return;

  if (animationFilenames.length !== csvFilenameData.size) {
    throw new ValidationError(
      "Animations and CSV mismatch",
      `
      Number of animations (${animationFilenames.length}) must be equal to number of data row in metadata CSV file (${
        csvFilenameData.size
      }).
      If number of animations is correct please check all file extensions are supported, and have size <= ${
        MAX_FILE_SIZE / 1000000
      } MB.
      `,
    );
  }

  const mismatchNames = [];
  animationFilenames.forEach((name) => {
    if (!csvFilenameData.has(getFilenameWithoutExtension(name))) {
      mismatchNames.push(name);
    }
  });
  if (!_.isEmpty(mismatchNames)) {
    throw new ValidationError(
      "Animations and CSV mismatch",
      `Animation names [${mismatchNames}] mismatch with metadata CSV content.`,
    );
  }
};

module.exports = { validateAnimations };
