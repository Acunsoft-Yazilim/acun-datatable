// The rows of the test pages, the same on the server and in the browser.
const cities = ['İstanbul', 'Ankara', 'İzmir'];
export const orders = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  customer: `Müşteri ${String(i + 1).padStart(2, '0')}`,
  total: `${(i * 37) % 500}.50`,
  city: cities[i % 3],
}));
