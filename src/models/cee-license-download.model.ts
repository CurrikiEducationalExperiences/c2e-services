import {Entity, model, property} from '@loopback/repository';

@model()
export class CeeLicenseDownload extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuid',
    required: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeLicenseId: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeId: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  downloadDate?: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt?: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  updatedAt?: string;

  constructor(data?: Partial<CeeLicenseDownload>) {
    super(data);
  }
}

export interface CeeLicenseDownloadRelations {
  // describe navigational properties here
}

export type CeeLicenseDownloadWithRelations = CeeLicenseDownload & CeeLicenseDownloadRelations;
