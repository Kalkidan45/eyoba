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
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Category, ClothingItem, SaleTransaction } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (support named database if specified in config)
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Real-time Firestore Listeners
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
      console.warn('Categories cloud listener notice:', error);
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
      console.warn('Products cloud listener notice:', error);
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
      console.warn('Sales cloud listener notice:', error);
      if (onError) onError(error);
    }
  );
};

// Firestore CRUD operations: Directly storing every record to Cloud Database
export const addOrUpdateCategoryDb = async (category: Category) => {
  try {
    const catRef = doc(db, 'categories', category.id);
    await setDoc(catRef, category, { merge: true });
  } catch (err) {
    console.error('Failed to store category in Firestore database:', err);
    throw err;
  }
};

export const deleteCategoryDb = async (categoryId: string) => {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    console.error('Failed to delete category in Firestore database:', err);
    throw err;
  }
};

export const addOrUpdateProductDb = async (product: ClothingItem) => {
  try {
    const prodRef = doc(db, 'products', product.id);
    await setDoc(prodRef, product, { merge: true });
  } catch (err) {
    console.error('Failed to store product in Firestore database:', err);
    throw err;
  }
};

export const deleteProductDb = async (productId: string) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    console.error('Failed to delete product from Firestore database:', err);
    throw err;
  }
};

export const addSaleTransactionDb = async (
  sale: SaleTransaction, 
  updatedProducts?: ClothingItem[]
) => {
  try {
    const batch = writeBatch(db);
    
    // Save sale transaction record
    const saleRef = doc(db, 'sales', sale.id);
    batch.set(saleRef, sale);

    // Update product stock counts in database
    if (updatedProducts && updatedProducts.length > 0) {
      for (const prod of updatedProducts) {
        const prodRef = doc(db, 'products', prod.id);
        batch.set(prodRef, prod, { merge: true });
      }
    }

    await batch.commit();
  } catch (err) {
    console.error('Failed to store sale transaction in Firestore database:', err);
    throw err;
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
    console.error('Failed to batch update products in Firestore database:', err);
    throw err;
  }
};

export const clearAllCloudData = async () => {
  try {
    // Clear categories
    const catSnap = await getDocs(collection(db, 'categories'));
    const catBatch = writeBatch(db);
    catSnap.forEach((d) => catBatch.delete(d.ref));
    await catBatch.commit();

    // Clear products
    const prodSnap = await getDocs(collection(db, 'products'));
    const prodBatch = writeBatch(db);
    prodSnap.forEach((d) => prodBatch.delete(d.ref));
    await prodBatch.commit();

    // Clear sales
    const salesSnap = await getDocs(collection(db, 'sales'));
    const salesBatch = writeBatch(db);
    salesSnap.forEach((d) => salesBatch.delete(d.ref));
    await salesBatch.commit();
  } catch (err) {
    console.error('Failed to clear cloud database:', err);
    throw err;
  }
};
