require('dotenv').config();

const { create } = require('ipfs-http-client');
const { validateThenConvertCsv } = require('./helper-scripts/process-metadata-csv');
const { validateImages } = require('./helper-scripts/process-image-folder');
const { validateAnimations } = require('./helper-scripts/process-animation-folder');
const fs = require('fs');
const _ = require('lodash');
const { getFilenameWithoutExtension, createProcessBar } = require('../util');

const ipfsClient = create({ url: process.env.IPFS_GATEWAY, timeout: 60000 });

const uploadLocalFolderToIpfs = async (localFolderPath, ipfsFolderPath, chunkSize = 10) => {
  const filenames = fs.readdirSync(localFolderPath);

  if(_.isEmpty(filenames)) return {};

  await ipfsClient.files.mkdir(ipfsFolderPath);
  const processBar = createProcessBar(`Upload local folder (${localFolderPath}) to IPFS`, filenames.length / chunkSize);
  for (let i = 0; i < filenames.length; i += chunkSize) {
    const uploadPromisses = filenames.slice(i, i + chunkSize).map((filename) => {
      const ipfsFilePath = `${ipfsFolderPath}/${filename}`;
      const content = fs.readFileSync(`${localFolderPath}/${filename}`);
      return ipfsClient.files.write(ipfsFilePath, content, { create: true });
    });
    await Promise.all(uploadPromisses);
    processBar.increment();
  }

  const folderCid = (await ipfsClient.files.stat(ipfsFolderPath)).cid.toString();

  console.log(`\nUploaded local folder (${localFolderPath}). CID: ${folderCid}`);
  return { 
    cid: folderCid, 
    filenames: filenames.sort((i1, i2) => i1.localeCompare(i2, undefined, { sensitivity: 'variant', numeric: true }))
  };
};

const uploadMetadataObjectToIPFS = async (metadataObjects, ipfsFolderPath, chunkSize = 10) => {
  await ipfsClient.files.mkdir(ipfsFolderPath);

  const processBar = createProcessBar(`Upload metadata to IPFS`, metadataObjects.length / chunkSize);
  for (let i = 0; i < metadataObjects.length; i += chunkSize) {
    const uploadPromisses = metadataObjects.slice(i, i + chunkSize).map((metadataObject) => {
      let ipfsPath;
      let content;

      ipfsPath = `${ipfsFolderPath}/${metadataObject.token_id}`;
      content = JSON.stringify(_.omit(metadataObject, ['filename', 'token_id']));

      return ipfsClient.files.write(ipfsPath, content, { create: true });
    });
    await Promise.all(uploadPromisses);
    processBar.increment();
  }

  const folderCid = (await ipfsClient.files.stat(ipfsFolderPath)).cid.toString();
  return folderCid;
};

const uploadToIPFS = async (metadataObjects, localImageFolderPath, localAnimationFolderPath, ipfsFoldername, overwrite = false) => {
  if (!ipfsFoldername || _.isEmpty(metadataObjects) || _.isEmpty(localImageFolderPath)) throw new Error('Not enough data to perform upload');

  // 0. create collection folder, overwrite if it exists
  if (overwrite) {
    await ipfsClient.files.rm(`/${ipfsFoldername}`, { recursive: true });
    await ipfsClient.files.mkdir(`/${ipfsFoldername}`);
  }

  // 1. upload all images & animations to 1 IPFS folder
  const { cid:imageFolderCid, filenames:imageFilenames } = await uploadLocalFolderToIpfs(localImageFolderPath, `/${ipfsFoldername}/images`);
  const { cid:animationFolderCid, filenames:animationFilenames } = !_.isEmpty(localAnimationFolderPath) ? await uploadLocalFolderToIpfs(localAnimationFolderPath, `/${ipfsFoldername}/animations`) : undefined;

  // 2. add image & animation IPFS links to metadata objects
  for (let i = 0, j = 0; i < metadataObjects.length && j < imageFilenames.length; i++) {
    const metadataObject = metadataObjects[i];
    let imageFilename = getFilenameWithoutExtension(imageFilenames[j]);
    // j index is used as a counter for quantity in case of one to many
    // remember that metadataObject, images & animations all are sorted based on filename with the same order
    if (metadataObject.filename && metadataObject.filename !== imageFilename) {
      imageFilename = imageFilenames[++j];
    }

    metadataObject.image = `ipfs://${imageFolderCid}/${imageFilenames[j]}`;
    if (!_.isEmpty(animationFilenames) && animationFolderCid) {
      metadataObject.animation_url = `ipfs://${animationFolderCid}/${animationFilenames[j]}`;
    }
  }

  // 3 .upload all metadata objects to files in 1 IPFS folder
  const medatadaFolderCid = await uploadMetadataObjectToIPFS(metadataObjects, `/${ipfsFoldername}/metadata`);

  console.log(`\n\nUploaded metadata. Link: ${process.env.IPFS_LINK_PREFIX}${medatadaFolderCid}`);
  const collectionFolderCid = (await ipfsClient.files.stat(`/${ipfsFoldername}`)).cid.toString();
  console.log("Collection folder CID ", collectionFolderCid);
};

async function main() {
  const ipfsFoldername = process.argv[2];
  const overwrite = process.argv[3] || false;

  if(!ipfsFoldername) throw new Exception(`Name of folder (used as IPFS upload destination) must be specified as the first argument of the script`);


  const metadataCSVFilePath = './scripts/ipfs/tokens-metadata.csv';
  const imagesFolderPath = './scripts/ipfs/images';
  const animationsFolderPath = './scripts/ipfs/animations';

  const { metadataObjects, filenames } = await validateThenConvertCsv(metadataCSVFilePath, undefined, { reservedTokenIds: [], maxSupply: 50})
  
  const imageFilenames = fs.readdirSync(imagesFolderPath);
  validateImages(imageFilenames, filenames);
  
  const animationFilenames = fs.readdirSync(animationsFolderPath);
  if(!_.isEmpty(animationFilenames)) {
    validateAnimations(animationFilenames, filenames);
  }

  await uploadToIPFS(metadataObjects, imagesFolderPath, animationsFolderPath, ipfsFoldername, overwrite);
}

main()
  .then(() => process.exit(0))
  .catch(error => { console.error("\x1b[31m", error.toString()); throw error; });
