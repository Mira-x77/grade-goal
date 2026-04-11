// Test calculation based on official report
// Testing BOTH formulas to see which gives 12.97
// Formula 1: (Interro + Dev + 2×Compo) / 4 (weighted)
// Formula 2: (Interro + Dev + Compo) / 3 (simple average)

const subjects = [
  // From the official report image
  { name: "Catéchèse", coef: 1.0, i: 19.50, d: 20.00, c: 14.50 },
  { name: "Français", coef: 2.0, i: 15.00, d: 13.00, c: 12.00 },
  { name: "Anglais", coef: 2.0, i: 17.00, d: 17.00, c: 17.00 },
  { name: "Histo-Géo", coef: 2.0, i: 9.00, d: 15.00, c: 16.00 },
  { name: "ECM", coef: 2.0, i: 16.00, d: 15.00, c: 17.00 },
  { name: "Philosophie", coef: 1.0, i: 10.00, d: 12.00, c: 15.00 },
  { name: "Mathématiques", coef: 4.0, i: 4.00, d: 10.00, c: 7.00 },
  { name: "Sciences Physiques", coef: 3.0, i: 10.00, d: 8.00, c: 7.00 },
  { name: "SVT", coef: 3.0, i: 12.00, d: 18.00, c: 18.00 },
  { name: "Dessin", coef: 1.0, i: 11.00, d: 13.50, c: 16.00 },
  { name: "Musique", coef: 1.0, i: 10.00, d: 19.00, c: 19.00 },
  { name: "EPS", coef: 1.0, i: null, d: 15.00, c: 18.00 },
  { name: "Allemand", coef: 1.0, i: 11.00, d: 16.00, c: 14.00 },
];

console.log("\n=== FORMULA 1: (I + D + 2×C) / 4 (WEIGHTED) ===\n");

let totalPoints1 = 0;
let totalCoef1 = 0;

subjects.forEach(sub => {
  let sum = 0;
  let weight = 0;
  
  if (sub.i !== null) { sum += sub.i * 1; weight += 1; }
  if (sub.d !== null) { sum += sub.d * 1; weight += 1; }
  if (sub.c !== null) { sum += sub.c * 2; weight += 2; }
  
  const avg = weight > 0 ? sum / weight : null;
  const points = avg * sub.coef;
  
  totalPoints1 += points;
  totalCoef1 += sub.coef;
  
  console.log(`${sub.name.padEnd(20)} | Avg: ${avg.toFixed(2)} | Points: ${points.toFixed(2)}`);
});

console.log(`\nTotal Points: ${totalPoints1.toFixed(2)}`);
console.log(`Total Coefficient: ${totalCoef1}`);
console.log(`Final Average: ${(totalPoints1 / totalCoef1).toFixed(2)}`);

console.log("\n\n=== FORMULA 2: (I + D + C) / 3 (SIMPLE AVERAGE) ===\n");

let totalPoints2 = 0;
let totalCoef2 = 0;

subjects.forEach(sub => {
  const marks = [sub.i, sub.d, sub.c].filter(m => m !== null);
  const avg = marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : null;
  const points = avg * sub.coef;
  
  totalPoints2 += points;
  totalCoef2 += sub.coef;
  
  console.log(`${sub.name.padEnd(20)} | Avg: ${avg.toFixed(2)} | Points: ${points.toFixed(2)}`);
});

console.log(`\nTotal Points: ${totalPoints2.toFixed(2)}`);
console.log(`Total Coefficient: ${totalCoef2}`);
console.log(`Final Average: ${(totalPoints2 / totalCoef2).toFixed(2)}`);

console.log("\n\n=== EXPECTED FROM REPORT: 12.97 ===");
