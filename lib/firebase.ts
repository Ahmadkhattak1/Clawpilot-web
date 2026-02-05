import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function subscribeEmail(email: string) {
  try {
    // Check for duplicate
    const q = query(collection(db, "subscribers"), where("email", "==", email))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      // Return the ID of the existing document
      return { success: true, id: querySnapshot.docs[0].id, isDuplicate: true }
    }

    const docRef = await addDoc(collection(db, "subscribers"), {
      email,
      subscribedAt: serverTimestamp(),
    })
    return { success: true, id: docRef.id, isDuplicate: false }
  } catch (error) {
    console.error("Error subscribing email:", error)
    return { success: false, error }
  }
}

export async function updateSubscriber(id: string, data: any) {
  try {
    const docRef = doc(db, "subscribers", id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error("Error updating subscriber:", error)
    return { success: false, error }
  }
}

export { db }
