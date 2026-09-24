import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  writeBatch,
  getDoc,
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Category, ClothingItem, SaleTransaction } from '../types';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SALES } from '../mockData';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore using the specified firestoreDatabaseId
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(errMsg);
}

/**
 * Deep sanitization for Firestore.
 * Strips all `undefined` values and ensures nested objects/arrays
 * conform to valid Firestore data types.
 */
export function sanitizeForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof input === 'object' && !(input instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as unknown as T;
  }
  return input;
}

// Test database connection gracefully
export async function testConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error) {
    console.info('Firestore initial connectivity ping notice:', error);
    return false;
  }
}

// Automatically trigger connection check
testConnection();

// Real-time Firestore Listeners directly from the Cloud Database
export const subscribeCategories = (
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const colRef = collection(db, 'categories');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Category);
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (error) => {
      console.error('Categories cloud listener error:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeProducts = (
  onData: (products: ClothingItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const colRef = collection(db, 'products');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ClothingItem[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as ClothingItem);
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (error) => {
      console.error('Products cloud listener error:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeSales = (
  onData: (sales: SaleTransaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const colRef = collection(db, 'sales');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: SaleTransaction[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as SaleTransaction);
      });
      // Sort sales descending by timestamp (newest first)
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(list);
    },
    (error) => {
      console.error('Sales cloud listener error:', error);
      if (onError) onError(error);
    }
  );
};

// Firestore CRUD operations: Every single record is saved directly to the database
export const addOrUpdateCategoryDb = async (category: Category) => {
  const path = `categories/${category.id}`;
  try {
    const cleanCategory = sanitizeForFirestore(category);
    const catRef = doc(db, 'categories', category.id);
    await setDoc(catRef, cleanCategory, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteCategoryDb = async (categoryId: string) => {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const addOrUpdateProductDb = async (product: ClothingItem) => {
  const path = `products/${product.id}`;
  try {
    const cleanProduct = sanitizeForFirestore(product);
    const prodRef = doc(db, 'products', product.id);
    await setDoc(prodRef, cleanProduct, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteProductDb = async (productId: string) => {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

// Save transaction and automatically adjust inventory stock in Firestore database
export const addSaleTransactionDb = async (
  sale: SaleTransaction, 
  updatedProducts?: ClothingItem[]
) => {
  const path = `sales/${sale.id}`;
  const cleanSale = sanitizeForFirestore(sale);

  // Identify affected products only to optimize batch operations and avoid bulk writes
  const soldProductIds = new Set(sale.items.map((i) => i.productId));
  const affectedProducts = (updatedProducts || [])
    .filter((p) => soldProductIds.has(p.id))
    .map((p) => sanitizeForFirestore(p));

  try {
    const batch = writeBatch(db);
    
    // 1. Save the sale transaction record in Firestore
    const saleRef = doc(db, 'sales', sale.id);
    batch.set(saleRef, cleanSale);

    // 2. Update stock levels for affected products in Firestore
    for (const prod of affectedProducts) {
      const prodRef = doc(db, 'products', prod.id);
      batch.set(prodRef, prod, { merge: true });
    }

    await batch.commit();
    return true;
  } catch (batchErr) {
    console.warn('Batch write encountered an issue, running fallback document writes:', batchErr);
    
    try {
      // Fallback: Individual document writes with setDoc
      const saleRef = doc(db, 'sales', sale.id);
      await setDoc(saleRef, cleanSale);

      for (const prod of affectedProducts) {
        const prodRef = doc(db, 'products', prod.id);
        await setDoc(prodRef, prod, { merge: true });
      }
      return true;
    } catch (fallbackErr) {
      console.error('Both batch and individual writes failed for sale:', fallbackErr);
      handleFirestoreError(fallbackErr, OperationType.CREATE, path);
    }
  }
};

export const batchUpdateProductsDb = async (products: ClothingItem[]) => {
  try {
    const batch = writeBatch(db);
    for (const prod of products) {
      const cleanProduct = sanitizeForFirestore(prod);
      const prodRef = doc(db, 'products', prod.id);
      batch.set(prodRef, cleanProduct, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
};

// Seeds standard apparel catalog and categories directly into the Firestore database
export const seedDefaultDataToDatabase = async (): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    
    // Seed categories directly into Firestore
    for (const cat of DEMO_CATEGORIES) {
      const cleanCat = sanitizeForFirestore(cat);
      const catRef = doc(db, 'categories', cat.id);
      batch.set(catRef, cleanCat);
    }

    // Seed products directly into Firestore
    for (const prod of DEMO_PRODUCTS) {
      const cleanProd = sanitizeForFirestore(prod);
      const prodRef = doc(db, 'products', prod.id);
      batch.set(prodRef, cleanProd);
    }

    // Seed historical demo sales directly into Firestore
    for (const sale of DEMO_SALES) {
      const cleanSale = sanitizeForFirestore(sale);
      const saleRef = doc(db, 'sales', sale.id);
      batch.set(saleRef, cleanSale);
    }

    await batch.commit();
    return true;
  } catch (err) {
    console.error('Failed to seed default catalog into Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, 'seed');
  }
};
