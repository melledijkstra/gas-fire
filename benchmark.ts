const autoFillColumns = [1, 2, 3, 5, 6, 8];

function groupContiguous(arr: number[]): [number, number][] {
  if (arr.length === 0) return [];
  arr.sort((a, b) => a - b);
  const groups: [number, number][] = [];
  let start = arr[0];
  let count = 1;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) {
      count++;
    } else {
      groups.push([start, count]);
      start = arr[i];
      count = 1;
    }
  }
  groups.push([start, count]);
  return groups;
}

console.log(groupContiguous(autoFillColumns));
