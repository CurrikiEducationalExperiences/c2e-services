import {Entity, model, property} from '@loopback/repository';

@model()
export class CeeStore extends Entity {
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
    type: 'string',
  })
  APIEndpoint?: string;

  @property({
    type: 'string',
  })
  APIConsumerKey?: string;

  @property({
    type: 'string',
  })
  APIConsumerSecret?: string;

  @property({
    type: 'string',
  })
  APIVersion?: string;

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

  constructor(data?: Partial<CeeStore>) {
    super(data);
  }
}

export interface CeeStoreRelations {
  // describe navigational properties here
}

export type CeeStoreWithRelations = CeeStore & CeeStoreRelations;
