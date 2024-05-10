const { readCSV } = require('../../util');
const _ = require('lodash');

const METADATA_CSV_FORMAT = {
  ONE_TO_ONE: 'one_to_one',
  ONE_TO_MANY: 'one_to_many'
};

const validateEmptyHeaders = (headers) => {
  headers.forEach((header, index) => {
    if (_.isEmpty(header)) {
      throw new ValidationError('CSV header error', `Header (column: ${index + 1}) is empty`);
    }
  });
};

const validateOneToOneHeaders = (headers) => {
  if (
    headers[0].toLowerCase() !== 'filename' ||
    headers[1].toLowerCase() !== 'name' ||
    headers[2].toLowerCase() !== 'description'
  ) {
    throw new ValidationError(
      'CSV header error',
      `With CSV format "${METADATA_CSV_FORMAT.ONE_TO_ONE}",
      CSV headers must be: filename, name, description, <...attributes>`
    );
  }
};

const validateOneToManyHeaders = (headers) => {
  if (
    headers[0].toLowerCase() !== 'filename' ||
    headers[1].toLowerCase() !== 'quantity' ||
    headers[2].toLowerCase() !== 'description'
  ) {
    throw new ValidationError(
      'CSV header error',
      `With CSV format is "${METADATA_CSV_FORMAT.ONE_TO_MANY}", CSV headers must be: filename, quantity ,description, <...attributes>`
    );
  }
};

const validateAttributes = (attributes) => {
  attributes.forEach((attribute) => {
    if (_.isEmpty(attribute)) {
      throw new ValidationError('Attribute headers data error', "Attribute can't be empty.");
    }
  });
};

// unique & non-empty
const validateFilenames = (content) => {
  const filenames = content.map((row) => row[0]);
  const nameSet = new Set();
  const duplicateNames = new Set();
  filenames.forEach((name) => {
    if (_.isEmpty(name)) {
      throw new ValidationError('Data in row filename error', "Filename can't be empty.");
    }

    if (nameSet.has(name)) {
      duplicateNames.add(name);
    } else {
      nameSet.add(name);
    }
  });

  if (!_.isEmpty(duplicateNames)) {
    throw new ValidationError('Data in row filename error', `Duplicate filenames: [${Array.from(duplicateNames)}].`);
  }
};

const validateNames = (content) => {
  const nftnames = content.map((row) => row[1]);

  nftnames.forEach((name) => {
    if (_.isEmpty(name)) {
      throw new ValidationError('Data in row name error', "Name can't be empty.");
    }

    if (name.length > 100) {
      throw new ValidationError(
        'Data in row name error',
        "Name's length must be less than or equal to 100 characters."
      );
    }
  });
};

const validateMaxSupply = (content, maxSupply) => {
  if (maxSupply && maxSupply !== content.length) {
    throw new ValidationError(
      'Number of row error',
      `Number of non-empty content row ${content.length} must be equal to max supply (${maxSupply}) defined in collection information tab.`
    );
  }
};

const validateQuantities = (content, maxSupply) => {
  const quantities = content.map((row) => row[1]);
  quantities.forEach((quantity) => {
    if (isNaN(Number(quantity)) || parseInt(quantity) < 1) {
      throw new ValidationError('Data in row quantity error', 'Quantity must be Integer which is greater than 0.');
    }
  });
  const noMetadataObject = quantities.reduce(
    (partialSum, currentQuantity) => partialSum + parseInt(currentQuantity),
    0
  );
  if (noMetadataObject != maxSupply) {
    throw new ValidationError(
      'Number of row error',
      `Total number of quantity ${noMetadataObject} must be equal to max supply (${maxSupply}) defined in collection information tab.`
    );
  }
};

const validateDescriptions = (content) => {
  const descriptions = content.map((row) => row[2]);

  descriptions.forEach((description) => {
    if (!_.isEmpty(description) && description.length > 1000) {
      throw new ValidationError(
        'Data in row description error',
        'Description length must be less than or equal to 1000.'
      );
    }
  });
};

const convertToMetadataOneToOne = (traitTypes, content, tokenIdInfo) => {
  let currentTokenId = tokenIdInfo.startTokenId ? tokenIdInfo.startTokenId : 1;
  return content.map((row) => {
    while (tokenIdInfo.reservedTokenIds && tokenIdInfo.reservedTokenIds.includes(currentTokenId)) {
      currentTokenId++;
    }
    const metadataObject = {
      token_id: currentTokenId,
      filename: row[0], // required for sorting before mapping metadata with image & animation URL
      name: row[1],
      description: row[2],
      attributes: row
        .slice(3) // in a row in a CSV file, attributes stored from the 4th record, onward
        .map((value, index) => ({
          trait_type: traitTypes[index],
          value
        }))
        .filter(({ value }) => !_.isEmpty(value))
    };
    currentTokenId++;
    return metadataObject;
  });
};

const convertToMetadataOneToMany = (traitTypes, content, tokenIdInfo) => {
  let currentTokenId = tokenIdInfo.startTokenId ? tokenIdInfo.startTokenId.toString() : '1';
  return content
    .map((row) => {
      const quantity = parseInt(row[1]);
      return range(1, quantity + 1).map((_, index) => {
        while (tokenIdInfo.reservedTokenIds && tokenIdInfo.reservedTokenIds.includes(currentTokenId)) {
          currentTokenId++;
        }
        const metadataObject = {
          token_id: currentTokenId,
          filename: `${row[0]}/${currentTokenId}`, // required for sorting before mapping metadata with image & animation URL
          name: `${row[0]} #${index + 1}`,
          description: row[2],
          attributes: row
            .slice(3) // in a row in a CSV file, attributes stored from the 4th record, onward
            .map((value, j) => ({
              trait_type: traitTypes[j],
              value
            }))
            .filter(({ value }) => !_.isEmpty(value))
        };
        currentTokenId++;
        return metadataObject;
      });
    })
    .flat();
};

const validateThenConvertCsv = async (metadataFilepath, format = METADATA_CSV_FORMAT.ONE_TO_ONE, tokenIdInfo) => {
  const data = await readCSV(metadataFilepath);

  const trimedData = data
    .map((row) => row.map((cell) => cell.trim()))
    // remove row contains only empty elements (this can remove empty line at the end of file)
    .filter((row) => row.some((cell) => !_.isEmpty(cell)));

  const headers = trimedData[0];
  const attributes = headers.slice(3);
  const content = trimedData.slice(1); // skip header at the first row

  validateEmptyHeaders(headers);
  validateFilenames(content);
  validateDescriptions(content);
  validateAttributes(attributes);

  let metadataObjects = [];
  switch (format) {
    case METADATA_CSV_FORMAT.ONE_TO_ONE: {
      validateOneToOneHeaders(headers);
      validateNames(content);
      validateMaxSupply(content, tokenIdInfo.maxSupply);
      metadataObjects = convertToMetadataOneToOne(attributes, content, tokenIdInfo);
      break;
    }
    case METADATA_CSV_FORMAT.ONE_TO_MANY: {
      validateOneToManyHeaders(headers);
      validateQuantities(content, tokenIdInfo.maxSupply);
      metadataObjects = convertToMetadataOneToMany(attributes, content, tokenIdInfo);
      break;
    }
    default:
      throw new ValidationError(`CSV format type: "${format}" is not supported!`);
  }
  metadataObjects.sort((o1, o2) => {
    if (!o1.filename || !o2.filename) return 0; // in reality, filename is guaranteed to exist
    return o1.filename.localeCompare(o2.filename, undefined, { sensitivity: 'variant', numeric: true });
  });

  return {
    metadataObjects,
    filenames: new Set(content.map((row) => row[0]))
  }
}

module.exports = { validateThenConvertCsv };

