import { addDoc, updateDoc, deleteDoc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { app, db } from './app';
import { useCollection, useFirestore, useMemoFirebase } from './hooks';

// Wrapper for addDoc that returns the document reference
export async function addDocumentNonBlocking(collectionRef: CollectionReference, data: any) {
  const docRef = await addDoc(collectionRef, data);
  return docRef;
}

// Wrapper for updateDoc
export async function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  await updateDoc(docRef, data);
}

// Wrapper for deleteDoc
export async function deleteDocumentNonBlocking(docRef: DocumentReference) {
  await deleteDoc(docRef);
}

export { useCollection, useFirestore, useMemoFirebase, app, db };
