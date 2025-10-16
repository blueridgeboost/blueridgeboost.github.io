// import FormData from 'form-data';
// import fs from 'fs';
// import path from 'path';

export const CLASSES_ID = 175340602;
export const SUBSCRIPTIONS_ID = 187846124;
export const SESSIONS_ID = 187846125;
export const SINGLE_ID = 187847129;

export const ROBOTICS_ID = 175336104;
export const CODING_ID = 175336105;
export const GAME_DEV_ID = 187847606;
export const MATH_ID = 175336109;
export const SCIENCE_ID = 177442108;
export const AI_ID = 187847627;

export const IN_PROGRESS_ID = 187846081;
export const STARTING_SOON_ID = 187846083;
export const ON_DEMAND_ID = 187847569;

export const getAllClasses= async () => {
    return await getCatalog([CLASSES_ID]);
}

export const getAttributeValue = (item, name) => {
    const attribute = item.attributes?.find(attr => attr.name === name);
    return attribute ? attribute.value : undefined;
}

export const getCatalog = async (categoryIds=[], enabledOnly=true, top=100) => {
    const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products`;
    const params =  enabledOnly ? 
        new URLSearchParams({ categories: categoryIds.join(','), enabled: true, limit: top }) : 
        new URLSearchParams({ categories: categoryIds.join(','), limit: top });
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
      }
    };
    try { 
      const response = await fetch(`${url}?${params.toString()}`, options);
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }
      const responseJson = await response.json();
    //   console.log(`Response ${JSON.stringify(responseJson)}`);
      return responseJson.items;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };


// export  async function getCategoryId(name) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/categories`;
//     const params = new URLSearchParams({ keyword: name });
//     const options = {
//         method: 'GET',
//         headers: {
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         }
//     };
//     console.log(`${url}?${params.toString()}`);
//     console.log(`Options ${JSON.stringify(options)}`);
//     try {
//         const response = await fetch(`${url}?${params.toString()}`, options);
//         if (!response.ok) {
//             throw new Error(`Failed to fetch product: ${response.statusText}`);
//         }
//         const responseJson = await response.json();
//         const inventory = responseJson.items;
//         if (inventory.length !== 1) {
//             throw new Error(`Category error: ${responseJson.total}`);
//         }
//         if ( inventory.length === 0) {
//             return -1;
//         }
//         return inventory[0].id;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }

// export  async function getCategories() {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/categories`;
//     const options = {
//         method: 'GET',
//         headers: {
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         }
//     };
//     const params = new URLSearchParams({ withSubcategories: true });
//     try {
//         const response = await fetch(`${url}?${params.toString()}`, options);
//         if (!response.ok) {
//             throw new Error(`Failed to fetch product: ${response.statusText}`);
//         }
//         const responseJson = await response.json();
//         return responseJson.items;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }

// export async function getProductById(productId) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products/${productId}`;
//     const options = {
//         method: 'GET',
//         headers: {
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         }
//     };
//     console.log(url)
//     try {
//         const response = await fetch(`${url}`, options);
//         if (!response.ok) {
//             throw new Error(`Failed to fetch product: ${response.statusText}`);
//         }
//         const responseJson = await response.json();
//         return responseJson;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }

// export async function getProductByStartDate(categoryId, startDate) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products`;
//     const params = new URLSearchParams({ 
//         attribute_start_date: startDate,
//         category: categoryId });
//     const options = {
//         method: 'GET',
//         headers: {
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         }
//     };

//     try {
//         const response = await fetch(`${url}?${params.toString()}`, options);
//         if (!response.ok) {
//             throw new Error(`Failed to fetch product: ${response.statusText}`);
//         }
//         const responseJson = await response.json();
//         return responseJson.items;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }

// export async function updateEcwidCategory(category) {
//     const id = category.id;
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/categories/${id}`; 
//     const options = {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(category)
//     };
//     // console.log(`Url ${url}`);
//     // console.log(`Attributes ${JSON.stringify(product.attributes)}`);
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         await response.json();
//     } catch (error) {
//         console.error('Error updating products:', error);
//     }
// }

// export async function unassignCategory(categoryId, productIds) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/categories/${categoryId}/unassignProducts`;
//     console.log(productIds);
//     const options = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify({ productIds: productIds })
//     };
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`Failed to unassign products: ${response.statusText}`);
//         }
//         return await response.json();
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }

// export async function createVariation( productId, variation) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products/${productId}/combinations`; 
//     const options = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(variation)
//     };
//     // console.log(`Url ${url}`);
//     // console.log(`Attributes ${JSON.stringify(product.attributes)}`);
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         await response.json();
//     } catch (error) {
//         console.error('Error creating variant:', error);
//     }

// }


// export async function getProductVariations( productId) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products/${productId}/combinations`; 
//     const options = {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(variation)
//     };
//     // console.log(`Url ${url}`);
//     // console.log(`Attributes ${JSON.stringify(product.attributes)}`);
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Error creating variant:', error);
//     }

// }

// export async function createEcwidCategory(categoryName, parentCategoryId) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/categories`; 
//     const options = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(
//             {
//                 name: categoryName,
//                 enabled: true,
//                 parentId: parentCategoryId,
//             }
//         )
//     };
//     // console.log(`Url ${url}`);
//     // console.log(`Attributes ${JSON.stringify(product.attributes)}`);
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             console.log(JSON.stringify(response));
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         const result = await response.json();
//         return result.id;
//     } catch (error) {
//         console.error('Error updating products:', error);
//     }
// }

// // Helper to detect MIME type (simple extension-based)
// function detectMimeType(filePath) {
//   const ext = path.extname(filePath).toLowerCase();
//   switch (ext) {
//     case '.jpg':
//     case '.jpeg':
//       return 'image/jpeg';
//     case '.png':
//       return 'image/png';
//     case '.gif':
//       return 'image/gif';
//     case '.webp':
//       return 'image/webp';
//     default:
//       return 'application/octet-stream';
//   }
// }

// export async function updateProductMedia(productId, imagePath) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products/${productId}/image`; 
//      const form = new FormData();
//         // Append file. The field name should be 'file'
//         form.append('file', fs.createReadStream(imagePath), {
//             filename: path.basename(imagePath),
//             contentType: detectMimeType(imagePath), // optional but recommended
//         });

//     const options = {
//         method: 'POST',
//         headers: {
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`,
//             ...form.getHeaders(),
//         },
//         body: form,
//     }
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         await response.json();
//     } catch (error) {
//         console.error('Error updating product image:', error);
//     }
// }


// export function prettyJsonText(text, depth = 4, space = 2) {
//   // Try to parse JSON text; if it’s not JSON, just return the original text.
//   let obj;
//   try {
//     obj = JSON.parse(text);
//   } catch {
//     return text;
//   }

//   const seen = new WeakSet();

//   function truncate(value, currentDepth) {
//     if (currentDepth > depth) return '[…]';

//     if (value && typeof value === 'object') {
//       if (seen.has(value)) return '[Circular]';
//       seen.add(value);

//       if (Array.isArray(value)) {
//         return value.map(v => truncate(v, currentDepth + 1));
//       }

//       const out = {};
//       for (const [k, v] of Object.entries(value)) {
//         out[k] = truncate(v, currentDepth + 1);
//       }
//       return out;
//     }

//     return value;
//   }

//   try {
//     return JSON.stringify(truncate(obj, 1), null, space);
//   } catch {
//     // Fallback: if something goes wrong, return the original text
//     return text;
//   }
// }

// export async function updateEcwidProduct(product) {
//     const productId = product.id;
//     const { id, ...productWithoutId } = product || {};
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products/${productId}`; 
//     const options = {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(productWithoutId)
//     };
//     console.log(`Url ${url}`);
//     // console.log(`Attributes ${JSON.stringify(productWithoutId)}`);
//     // console.log('Attributes:', productWithoutId.options ? productWithoutId.options.map(opt => ({ name: opt.name, type: opt.type })) : []);
//     console.log(prettyJsonText(productWithoutId));
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP ${response.status} ${response.statusText}: ${prettyJsonText(await response.text())}`);
//         }
//     } catch (error) {
//         console.error('Error updating products:', prettyJsonText(error));
//     }
// }

// export async function createEcwidProduct(data) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products`; 
//     const options = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(data)
//     };
//     console.log(url);
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}\n ${await response.text()}`);
//         }
//         const responseData = await response.json();
//         return responseData.id;
//     } catch (error) {
//         console.error('Error creating product:', error);
//         throw error;
//     }
// }

// export async function getOrdersByProductId(id) {
//     let offset = 0;
//     let result = [];
//     let done = false;
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/orders`;
//     const options = {
//         method: 'GET',
//         headers: {
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         }
//     };
//     while (!done) {
//         const params = new URLSearchParams({ 
//             offset: offset,
//             productId: id,
//         });
//         try {
//             const response = await fetch(`${url}?${params.toString()}`, options);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch orders: ${response.statusText}`);
//             }
//             const responseJson = await response.json();
//             result = result.concat(responseJson.items);
//             offset += 100;
//             // console.log(`Offset ${offset} Total ${responseJson.total}`);
//             if (offset > responseJson.total) {
//                 done = true;
//             }
//         } catch (error) {
//             console.error(error);
//             throw error;
//         }
//     }
//     return result;
// }

// export async function getOrders() {
//     let offset = 0;
//     let result = [];
//     let done = false;
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/orders`;
//     const options = {
//         method: 'GET',
//         headers: {
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         }
//     };
//     console.log(`Getting orders from ${url}`);
//     while (!done) {
//         const params = new URLSearchParams({ 
//             offset: offset,
//         });
//         try {
//             const response = await fetch(`${url}?${params.toString()}`, options);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch orders: ${response.statusText}`);
//             }
//             const responseJson = await response.json();
//             result = result.concat(responseJson.items);
//             offset += 100;
//             console.log(`Offset ${offset} Total ${responseJson.total}`);
//             if (offset > responseJson.total) {
//                 done = true;
//             }
//         } catch (error) {
//             console.error(error);
//             throw error;
//         }
//     }
//     return result;
// }

// export async function updateEcwidCategoryProducts(categoryId, products) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/categories/${categoryId}/products`; 
//     const options = {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify({ productIds: products})
//     };
//     // console.log(`Url ${url}`);
//     // console.log(`Attributes ${JSON.stringify(product.attributes)}`);
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         await response.json();
//         console.log(`response ${response}`);
//     } catch (error) {
//         console.error('Error updating products:', error);
//     }
// }

// /*
// updates the order of products in a category. pass it the category id and the list of product ids 
// Example:
// const sortedIdsList = [753441358, 769854763, 753441362, 753436603]
// */
// export async function updateEcwidCategoryOrder(categoryId, sortedIdsList) {
//     const url = `https://app.ecwid.com/api/v3/${process.env.ECWID_STORE_ID}/products/sort?parentCategory=${categoryId}`; 
//     const options = {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             accept: 'application/json',
//             Authorization: `Bearer ${process.env.ECWID_REST_SECRET}`
//         },
//         body: JSON.stringify(
//             {
//                 sortedIds:sortedIdsList,
//             }
//         )
//     };
//     try {
//         const response = await fetch(url, options);
//         // console.log(response)
//         if (!response.ok) {
//             console.log(JSON.stringify(response));
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         //if the response is okay, the category products should be sorted
//         return true
//     } catch (error) {
//         console.error('Error updating products:', error);
//     }
// }