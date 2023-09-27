import {SchemaObject} from '@loopback/rest';

export const ceeCreateByMediaSchema: SchemaObject = {
  title: 'Create C2E by Media ID',
  type: 'object',
  required: ['ceeMediaId'],
  properties: {
    ceeMediaId: {
      type: 'string',
    },
    licensee: {
      type: 'object',
      required: ['name', 'email', 'url'],
      properties: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
        },
        url: {
          type: 'string',
        },
      }
    },
  }
};

export const ceeCreateByLicenseKeySchema: SchemaObject = {
  title: 'Create C2E by License Key',
  type: 'object',
  required: ['licenseKey'],
  properties: {
    licenseKey: {
      type: 'string',
    }
  }
};
