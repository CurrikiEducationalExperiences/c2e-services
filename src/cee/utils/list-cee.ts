import {CeeProductWcStore} from '../../models';

export const listToStore = async (
  ceeStoreConfig: Object,
  ceeProductWcStore: CeeProductWcStore,
): Promise<Boolean> => {

  const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
  const api = new WooCommerceRestApi({...ceeStoreConfig});
  try {
    await api.post('products', {...ceeProductWcStore});
    return true;
  } catch (error) {
    console.log("Response Status:", error.response.status);
    console.log("Response Headers:", error.response.headers);
    console.log("Response Data:", error.response.data);
    return false;
  }
}
