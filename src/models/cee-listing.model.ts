import {Entity, model, property} from '@loopback/repository';

@model()
export class CeeListing extends Entity {
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
  ceePreviewId: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeMasterId: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeWriterId: string;

  @property({
    type: 'string',
    required: true,
  })
  ceeStoreId: string;

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


  constructor(data?: Partial<CeeListing>) {
    super(data);
  }
}

export interface CeeListingRelations {
  // describe navigational properties here
}

export type CeeListingWithRelations = CeeListing & CeeListingRelations;
