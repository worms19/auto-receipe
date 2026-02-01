import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as Crypto from 'expo-crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Crypto.randomUUID();
}
