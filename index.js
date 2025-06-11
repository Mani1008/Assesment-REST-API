// deliveryCostApi/index.js

const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Assumed warehouse stock
const warehouseStock = {
  C1: ["A", "B", "C", "G"],
  C2: ["B", "D", "E", "H", "I"],
  C3: ["C", "D", "F", "G", "H", "I"]
};

// Assumed distances (symmetric)
const distances = {
  C1: { L1: 10, C2: 15, C3: 35 },
  C2: { L1: 20, C1: 15, C3: 25 },
  C3: { L1: 30, C1: 35, C2: 25 }
};

// Calculate cost = distance * number of half-kg units
const cost = (from, to, items = 0) => distances[from][to] * items;

// Helper to get all required centers
const getRequiredCenters = (order) => {
  const centers = new Set();
  for (const [product, qty] of Object.entries(order)) {
    if (qty <= 0) continue;
    for (const [center, stock] of Object.entries(warehouseStock)) {
      if (stock.includes(product)) {
        centers.add(center);
        break; // pick first available center
      }
    }
  }
  return Array.from(centers);
};

// Total product units (assuming all 0.5kg)
const totalUnits = (order, center) => {
  const stock = warehouseStock[center];
  let total = 0;
  for (const [product, qty] of Object.entries(order)) {
    if (qty > 0 && stock.includes(product)) total += qty;
  }
  return total;
};

// Brute-force all possible routes
const findMinCost = (order) => {
  const centers = getRequiredCenters(order);
  const startPoints = ["C1", "C2", "C3"];

  let minCost = Infinity;

  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = permute(arr.slice(0, i).concat(arr.slice(i + 1)));
      for (const r of rest) result.push([arr[i], ...r]);
    }
    return result;
  };

  for (const start of startPoints) {
    for (const pickupOrder of permute(centers)) {
      if (!pickupOrder.includes(start)) continue;

      let path = [];
      let visited = new Set();
      let curr = start;
      let totalCost = 0;

      for (const center of pickupOrder) {
        if (!visited.has(center)) {
          const units = totalUnits(order, center);
          if (curr !== center) totalCost += cost(curr, center);
          totalCost += cost(center, "L1", units);
          curr = "L1";
          visited.add(center);
        }
      }

      if (totalCost < minCost) minCost = totalCost;
    }
  }

  return minCost;
};

app.get("/", (req, res) => {
  res.send("Delivery Cost API is running 🚚");
});

app.post("/calculate-delivery-cost", (req, res) => {
  const order = req.body;
  const minCost = findMinCost(order);
  res.json({ minimum_cost: minCost });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
