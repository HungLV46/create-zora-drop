require('dotenv').config();

const fs = require('fs');
const { sleep, createProcessBar } = require('../util')
const { create } = require('ipfs-http-client');

const ipfs = create({ url: process.env.IPFS_GATEWAY });

async function uploadFileToIPFSFolder(localDirPath, filename, ipfsDirName) {
  const filedata = fs.readFileSync(`${localDirPath}/${filename}`);
  await ipfs.files.write(`/${ipfsDirName}/${filename}`, filedata, { create: true });
}

// WSL path to Window folder: e.g. /mnt/c/Users/.../Downloads/export_11/images
async function uploadFolder(localDirPath, ipfsDirName) {
  const filenames = fs.readdirSync(localDirPath);
  filenames.sort((i1, i2) => i1.localeCompare(i2, undefined, { sensitivity: 'variant', numeric: true }));
  const numberOfFile = filenames.length;

  console.log(`\nNumber of file:\t\t${numberOfFile}`);
  console.log(`First filename:\t\t${filenames[0]}`);

  const jump = 100;
  // create pbar
  const pbar = createProcessBar('upload files', numberOfFile/jump);
  for (let i = 0; i < numberOfFile; i += jump) {
    const uploadPromisses = filenames
      .slice(i, i + jump)
      .map((filename) =>
        uploadFileToIPFSFolder(localDirPath, filename, ipfsDirName));
    await Promise.all(uploadPromisses);
    await sleep(10000);
    pbar.increment();
  }

  const uploadResponse = await ipfs.files.stat(`/${ipfsDirName}`);
  uploadResponse.cid = uploadResponse.cid.toString();
  // verify that all files are uploaded
  if (uploadResponse.blocks !== numberOfFile) {
    console.log(`\nUpload response: ${JSON.stringify(uploadResponse, null, 2)}`);
    throw new Error(`Not all file uploaded. Only ${uploadResponse.blocks}/${numberOfFile} files uploaded`);
  }

  console.log(`\nSuccessfully uploaded to ${ipfsDirName} (cid: "${uploadResponse.cid}")\n`);
  return { folder_cid: uploadResponse.cid, uploaded_file_names: filenames };
}

uploadFolder('./metadata0/', '/Immersion_Aura_odyssey/metadata');
