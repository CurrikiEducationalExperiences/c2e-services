import axios from 'axios';
import FormData from 'form-data';
import fs, {ReadStream} from 'node:fs';
import path from 'path';
import {Cee} from '../../models';

export const protectCee = async (
  fileReadStream: ReadStream | Boolean,
  ceeRecord: Cee
): Promise<Boolean> => {
  const url = 'https://c2e-api.curriki.org/api/v1/c2e/encrypt';
  const form_data = new FormData();
  form_data.append("c2e", fileReadStream);
  const response = await axios.post(url, form_data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    responseType: 'arraybuffer'
  });

  const headers = response.headers;
  const contentDisposition = headers['content-disposition'];

  // Extract the filename from the content disposition header
  const filenameMatch = /filename="(.+)"/.exec(contentDisposition);
  const filename = filenameMatch ? filenameMatch[1] : 'downloaded_file';

  // Write the received data to a local file
  const c2eStoragePath = path.join(__dirname, '../../../public/c2e-storage');
  const c2ePath = path.join(c2eStoragePath, 'c2eid-' + ceeRecord.id + '.c2e');
  fs.writeFileSync(c2ePath, response.data, 'binary');
  return true;
}
