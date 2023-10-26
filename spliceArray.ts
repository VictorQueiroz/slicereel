/**
 * cleans up an array by splicing it, and returning a new array with the same elements, but
 * the original array now has no elements
 * @param list array to be spliced
 * @returns a new array with the same elements as the original
 */
export default function spliceArray<T>(list: Array<T>): T[] {
  return list.splice(0, list.length);
}
