import {Entity, model, property} from '@loopback/repository';

@model()
export class CeeLicensee extends Entity {
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
  name: string;

  @property({
    type: 'string',
  })
  email?: string;

  @property({
    type: 'string',
  })
  url?: string;

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

  constructor(data?: Partial<CeeLicensee>) {
    super(data);
  }
}

export interface CeeLicenseeRelations {
  // describe navigational properties here
}

export type CeeLicenseeWithRelations = CeeLicensee & CeeLicenseeRelations;
