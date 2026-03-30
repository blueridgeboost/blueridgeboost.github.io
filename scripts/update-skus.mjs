import { deleteEcwidProduct, getAllProducts, getOrdersByProductId, getAttributeValue, updateEcwidProduct } from "./ecwid.js";
import path from 'path';
import dotenv from 'dotenv';
import { get } from "http";
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
console.log(`Loading environment variables from: ${envPath}`);
// Load the .env file
await dotenv.config({ path: envPath });

const products = await getAllProducts(false);

for (const product of products) {
    const orders = await getOrdersByProductId(product.id);
    if (orders.length === 0) {
        console.log(`Product ${product.name} (ID: ${product.id}) has no orders.`);
        await deleteEcwidProduct(product.id);
    } else {
        console.log(`Product ${product.name} (ID: ${product.id}) has ${orders.length} orders.`);
        if ( getAttributeValue(product, "brb_id") ) {
            console.log(`Product ${product.name} has brb_id ${getAttributeValue(product, "brb_id")}`);
            product.sku = getAttributeValue(product, "brb_id");
            await updateEcwidProduct(product);
            console.log(`Updated product ${product.name} (ID: ${product.id}) with SKU: ${product.sku}`);
        } else {
            product.sku = product.id.toString();
            await updateEcwidProduct(product);
            console.log(`Updated product ${product.name} (ID: ${product.id}) with SKU: ${product.sku}`);
        }
    }
}