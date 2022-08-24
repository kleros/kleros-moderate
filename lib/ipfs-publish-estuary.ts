import fetch from 'node-fetch';

/**
 * Send file to IPFS network via the Kleros IPFS node
 * @param {string} fileName - The name that will be used to store the file. This is useful to preserve extension type.
 * @param {ArrayBuffer} data - The raw data from the file to upload.
 * @return {string} URL of the stored item.
 */
 const ipfsPublish = async (fileName, data): Promise<string> => {
    const buffer = await Buffer.from(data)
    return await ipfsPublishBuffer(fileName, buffer);
}

const ipfsPublishBuffer = async (fileName, buffer): Promise<string> => {
    var FormData = require('form-data');
    var form_data = new FormData();

    form_data.append('data', buffer, { filename: fileName});

    const response = await fetch('https://shuttle-4.estuary.tech/content/add', {
        method: 'POST',
        body: form_data,
        headers: {
            "Authorization": `${process.env.ESTUARY_API_KEY}`
        }
    });

    const body = await response.json();
    return `/ipfs/${body.cid}`
}

export {ipfsPublish, ipfsPublishBuffer};