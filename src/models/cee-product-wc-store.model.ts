import {Model, model, property} from '@loopback/repository';

@model()
export class CeeProductWcStore extends Model {

  @property() sku: string;
  @property() name: string;
  @property() type: string;
  @property() regular_price: string;
  @property() description: string;
  @property() virtual: boolean;
  @property() images: Array<Object>;
  @property() attributes: Array<Object>;

  constructor(data?: Partial<CeeProductWcStore>) {
    super(data);
  }
}

export interface CeeProductWcStoreRelations {
  // describe navigational properties here
}

export type CeeProductWcStoreWithRelations = CeeProductWcStore & CeeProductWcStoreRelations;
