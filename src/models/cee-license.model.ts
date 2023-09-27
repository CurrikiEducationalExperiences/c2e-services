import {Entity, model, property} from '@loopback/repository';

@model()
export class CeeLicense extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuid',
    required: true,
  })
  id: string;

  @property({
    type: 'string',
  })
  licenseType?: string;

  @property({
    type: 'string',
    required: true,
  })
  licenseKey: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeListingId: string;

  @property({
    type: 'date',
  })
  licenseDate?: string;

  @property({
    type: 'date',
  })
  licenseEndDate?: string;

  @property({
    type: 'string',
  })
  licenseeId?: string;

  @property({
    type: 'string',
  })
  licenseTerms?: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeId?: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt?: string;

  @property({
    type: 'string',
  })
  orderKey?: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  updatedAt?: string;

  constructor(data?: Partial<CeeLicense>) {
    super(data);
  }
}

export interface CeeLicenseRelations {
  // describe navigational properties here
}

export type CeeLicenseWithRelations = CeeLicense & CeeLicenseRelations;
