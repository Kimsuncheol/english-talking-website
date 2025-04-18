import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  UserCredential
} from "firebase/auth";
import { auth } from "@/firebase/firebase";

// User authentication functions
export const registerUser = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginUser = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async (): Promise<void> => {
  return signOut(auth);
};

// Profile management functions
export const updateUserProfile = async (displayName?: string, photoURL?: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  
  return updateProfile(user, {
    displayName: displayName || user.displayName,
    photoURL: photoURL || user.photoURL
  });
};

export const getUserProfile = (): User | null => {
  return auth.currentUser;
};

// Password management functions
export const changeUserPassword = async (
  currentPassword: string, 
  newPassword: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No user logged in or email undefined");
  
  // Re-authenticate the user first
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  
  // Then update the password
  return updatePassword(user, newPassword);
};

export const resetUserPassword = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

// Account management functions
export const deleteUserAccount = async (currentPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No user logged in or email undefined");
  
  // Re-authenticate the user first
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  
  // Then delete the account
  return deleteUser(user);
};
