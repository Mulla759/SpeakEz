// Web stand-in for expo-secure-store: plain localStorage (the demo has no secrets to protect here).
const ok = () => { try { return typeof window !== "undefined" && !!window.localStorage; } catch { return false; } };
export async function getItemAsync(key) { return ok() ? window.localStorage.getItem(key) : null; }
export async function setItemAsync(key, value) { if (ok()) window.localStorage.setItem(key, value); }
export async function deleteItemAsync(key) { if (ok()) window.localStorage.removeItem(key); }
export const AFTER_FIRST_UNLOCK = 0;
export const WHEN_UNLOCKED = 1;
export default { getItemAsync, setItemAsync, deleteItemAsync };
