/**
 * ============================================================================
 * UTILITY FUNCTIONS - Helper Functions Used Throughout the App
 * ============================================================================
 *
 * This module contains general-purpose utility functions.
 * These are small, reusable functions that help with common tasks.
 *
 * @module /lib/utils
 */

// clsx is a tiny utility for conditionally joining class names
// It lets you do: clsx('foo', condition && 'bar', { baz: true })
// Instead of: 'foo ' + (condition ? 'bar' : '') + ' baz'
import { clsx, type ClassValue } from "clsx";

// tailwind-merge merges duplicate Tailwind classes intelligently
// If you have 'bg-red-500 bg-blue-500', twMerge keeps only the last one
// This is crucial when you have dynamic classes that might conflict
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS class names
 *
 * WHAT IT DOES:
 * - Accepts any number of class values (strings, objects, arrays)
 * - Uses clsx to join them conditionally
 * - Uses twMerge to resolve duplicate/conflicting Tailwind classes
 *
 * WHY USE THIS?
 * - Tailwind classes can conflict (e.g., two background colors)
 * - twMerge ensures the LAST class takes precedence
 * - clsx makes it easy to build class strings conditionally
 *
 * USAGE EXAMPLES:
 * - cn('text-white', 'bg-blue-500')                           → 'text-white bg-blue-500'
 * - cn('text-white', isActive && 'bg-blue-500')                → conditional
 * - cn('p-4 p-6')                                              → 'p-6' (merges duplicates)
 * - cn('bg-red-500 bg-blue-500')                               → 'bg-blue-500' (last wins)
 *
 * @param {ClassValue[]} inputs - Any number of class values to merge
 * @returns {string} Merged class string with duplicates resolved
 *
 * @example
 * // In a React component:
 * <div className={cn('p-4', isCentered && 'text-center', 'p-6')}>
 * // Result: 'p-6 text-center' (p-4 and p-6 merged to p-6)
 */
export function cn(...inputs: ClassValue[]) {
  // clsx joins all inputs into a single string
  // twMerge handles Tailwind-specific merging of duplicate classes
  return twMerge(clsx(inputs));
}
