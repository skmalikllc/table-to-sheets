/* Injected after src/extract.js; its return value is what the popup receives. */
(() => {
  const matrices = collectTables(document);
  return {
    tables: matrices,
    meta: matrices.map((m, i) => describeTable(m, i)),
  };
})();
