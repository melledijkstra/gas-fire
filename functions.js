function transpose(a) {
  return Object.keys(a[0]).map((c) => a.map((r) => r[c]));
}
