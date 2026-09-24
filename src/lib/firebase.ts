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
  getDocFromServer,
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  throw new Error(JSON.stringify(errInfo));
}

// Test database connection at startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client is offline or initializing.");
    }
    return false;
  }
}

// Automatically trigger connection validation
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
      try {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      } catch {
        // Logged
      }
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
      try {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } catch {
        // Logged
      }
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
      try {
        handleFirestoreError(error, OperationType.LIST, 'sales');
      } catch {
        // Logged
      }
    }
  );
};

// Firestore CRUD operations: Every single record is saved directly to the database
export const addOrUpdateCategoryDb = async (category: Category) => {
  const path = `categories/${category.id}`;
  try {
    const catRef = doc(db, 'categories', category.id);
    await setDoc(catRef, category, { merge: true });
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
    const prodRef = doc(db, 'products', product.id);
    await setDoc(prodRef, product, { merge: true });
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

// Every transaction is stored directly in the database
export const addSaleTransactionDb = async (
  sale: SaleTransaction, 
  updatedProducts?: ClothingItem[]
) => {
  const path = `sales/${sale.id}`;
  try {
    const batch = writeBatch(db);
    
    // Save sale transaction record permanently in cloud database
    const saleRef = doc(db, 'sales', sale.id);
    batch.set(saleRef, sale);

    // Update product stock counts in cloud database
    if (updatedProducts && updatedProducts.length > 0) {
      for (const prod of updatedProducts) {
        const prodRef = doc(db, 'products', prod.id);
        batch.set(prodRef, prod, { merge: true });
      }
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
};

export const batchUpdateProductsDb = async (products: ClothingItem[]) => {
  try {
    const batch = writeBatch(db);
    for (const prod of products) {
      const prodRef = doc(db, 'products', prod.id);
      batch.set(prodRef, prod, { merge: true });
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
      const catRef = doc(db, 'categories', cat.id);
      batch.set(catRef, cat);
    }

    // Seed products directly into Firestore
    for (const prod of DEMO_PRODUCTS) {
      const prodRef = doc(db, 'products', prod.id);
      batch.set(prodRef, prod);
    }

    // Seed historical demo sales directly into Firestore
    for (const sale of DEMO_SALES) {
      const saleRef = doc(db, 'sales', sale.id);
      batch.set(saleRef, sale);
    }

    await batch.commit();
    return true;
  } catch (err) {
    console.error('Failed to seed default catalog into Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, 'seed');
  }
};
