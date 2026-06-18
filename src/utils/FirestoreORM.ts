import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import type { WhereFilterOp, DocumentData } from 'firebase/firestore';
import { db } from './firebase';

export interface FindOptions {
  where?: Record<string, any> | [string, WhereFilterOp, any][];
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
}

export class FirestoreModel<T extends DocumentData> {
  private pathTemplate: string;

  constructor(pathTemplate: string) {
    this.pathTemplate = pathTemplate;
  }

  private resolvePath(pathParams?: Record<string, string>): string {
    let path = this.pathTemplate;
    if (pathParams) {
      Object.entries(pathParams).forEach(([key, val]) => {
        path = path.replace(`:${key}`, val);
      });
    }
    return path;
  }

  /**
   * Finds a document by ID
   */
  async findById(id: string, pathParams?: Record<string, string>): Promise<T | null> {
    const path = this.resolvePath(pathParams);
    const docRef = doc(db, path, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
    return null;
  }

  /**
   * Finds documents matching options
   */
  async find(options?: FindOptions, pathParams?: Record<string, string>): Promise<(T & { id: string })[]> {
    const path = this.resolvePath(pathParams);
    const colRef = collection(db, path);
    const constraints: any[] = [];

    if (options?.where) {
      if (Array.isArray(options.where)) {
        options.where.forEach(([field, op, val]) => {
          constraints.push(where(field, op, val));
        });
      } else {
        Object.entries(options.where).forEach(([field, val]) => {
          constraints.push(where(field, '==', val));
        });
      }
    }

    if (options?.orderBy) {
      options.orderBy.forEach(([field, direction]) => {
        constraints.push(orderBy(field, direction));
      });
    }

    if (options?.limit !== undefined) {
      constraints.push(limit(options.limit));
    }

    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const querySnapshot = await getDocs(q);
    const results: (T & { id: string })[] = [];
    
    querySnapshot.forEach((docSnap) => {
      results.push({
        id: docSnap.id,
        ...docSnap.data()
      } as T & { id: string });
    });
    
    return results;
  }

  /**
   * Creates a new document. If id is provided, uses setDoc, otherwise uses addDoc.
   */
  async create(data: Omit<T, 'id'> | T | Record<string, any>, id?: string, pathParams?: Record<string, string>): Promise<string> {
    const path = this.resolvePath(pathParams);
    if (id) {
      const docRef = doc(db, path, id);
      await setDoc(docRef as any, data as any);
      return id;
    } else {
      const colRef = collection(db, path);
      const docRef = await addDoc(colRef, data as any);
      return docRef.id;
    }
  }

  /**
   * Sets/creates a document with merge option
   */
  async set(id: string, data: Partial<T> | Record<string, any>, options?: { merge: boolean }, pathParams?: Record<string, string>): Promise<void> {
    const path = this.resolvePath(pathParams);
    const docRef = doc(db, path, id);
    await setDoc(docRef as any, data as any, options || { merge: true });
  }

  /**
   * Updates fields on a document
   */
  async update(id: string, data: Partial<T> | Record<string, any>, pathParams?: Record<string, string>): Promise<void> {
    const path = this.resolvePath(pathParams);
    const docRef = doc(db, path, id);
    await updateDoc(docRef as any, data as any);
  }

  /**
   * Deletes a document
   */
  async delete(id: string, pathParams?: Record<string, string>): Promise<void> {
    const path = this.resolvePath(pathParams);
    const docRef = doc(db, path, id);
    await deleteDoc(docRef as any);
  }
}
