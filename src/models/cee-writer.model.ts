import {Entity, model, property} from '@loopback/repository';

@model()
export class CeeWriter extends Entity {
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
    required: true,
  })
  email: string;

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

  constructor(data?: Partial<CeeWriter>) {
    super(data);
  }
}

export interface CeeWriterRelations {
  // describe navigational properties here
}

export type CeeWriterWithRelations = CeeWriter & CeeWriterRelations;
