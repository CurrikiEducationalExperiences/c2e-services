import {Entity, model, property} from '@loopback/repository';

@model()
export class Licenseview extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
    required: true,
  })
  description: string;

  @property({
    type: 'string',
    required: true,
  })
  licenseemail: string;

  @property({
    type: 'string',
    required: true,
  })
  breadcrumb: string;

  @property({
    type: 'string',
    required: true,
  })
  author: string;

  @property({
    type: 'string',
    required: true,
  })
  metadata: string;


  constructor(data?: Partial<Licenseview>) {
    super(data);
  }
}

export interface LicenseviewRelations {
  // describe navigational properties here
}

export type LicenseviewWithRelations = Licenseview & LicenseviewRelations;
