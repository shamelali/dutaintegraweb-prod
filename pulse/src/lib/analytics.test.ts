import { describe, it, expect } from 'vitest';
import { DEMO_ORDERS } from './demo-data';
import type { DemoOrder } from './demo-data';
import {
  computeWindow,
  filterOrders,
  formatMoney,
  paginate,
  selectDashboard,
} from './analytics';
import type { DashboardFilters } from './analytics';

const now = new Date(Date.UTC(2026, 10, 25, 12, 0, 0)); // 2026-11-25

const FIXTURE: DemoOrder[] = [
  {
    id: 'fixture-0001',
    date: '2026-11-20',
    customer: 'Alice Chen',
    email: 'alice@example.com',
    channel: 'direct',
    status: 'delivered',
    amount: 20000,
    items: [
      { product: 'Wireless Mouse', sku: 'MS-100', qty: 2, unitPrice: 7900 },
      { product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 4200 },
    ],
  },
  {
    id: 'fixture-0002',
    date: '2026-11-19',
    customer: 'Ben Lee',
    email: 'ben@example.com',
    channel: 'ads',
    status: 'pending',
    amount: 44900,
    items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }],
  },
  {
    id: 'fixture-0003',
    date: '2026-11-18',
    customer: 'Cara Tan',
    email: 'cara@example.com',
    channel: 'social',
    status: 'delivered',
    amount: 12900,
    items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 1, unitPrice: 12900 }],
  },
  {
    id: 'fixture-0004',
    date: '2026-11-17',
    customer: 'Dan Wong',
    email: 'dan@example.com',
    channel: 'direct',
    status: 'cancelled',
    amount: 89900,
    items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }],
  },
  {
    id: 'fixture-0005',
    date: '2026-11-16',
    customer: 'Eva Lim',
    email: 'eva@example.com',
    channel: 'email',
    status: 'shipped',
    amount: 52800,
    items: [
      { product: 'Wireless Mouse', sku: 'MS-100', qty: 1, unitPrice: 7900 },
      { product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 },
    ],
  },
];

const EMPTY_FILTERS: DashboardFilters = { range: '30d', channel: 'all', status: 'all', search: '' };

describe('formatMoney', () => {
  it('renders fen as two-decimal currency with thousands separators', () => {
    expect(formatMoney(0)).toBe('0.00');
    expect(formatMoney(7900)).toBe('79.00');
    expect(formatMoney(123456)).toBe('1,234.56');
    expect(formatMoney(1000000)).toBe('10,000.00');
  });
});

describe('computeWindow', () => {
  it('returns an inclusive UTC window per range, ending on today', () => {
    const windows: Array<[string, string]> = [
      ['7d', '2026-11-19'],
      ['30d', '2026-10-27'],
      ['90d', '2026-08-28'],
    ];
    for (const [range, expectedStart] of windows) {
      const { start, end } = computeWindow(range as (typeof EMPTY_FILTERS)['range'], now);
      expect(start).toBe(expectedStart);
      expect(end).toBe('2026-11-25');
    }
  });
});

describe('filterOrders', () => {
  it('includes both window bounds and excludes orders outside them', () => {
    const edge: DemoOrder[] = [
      { ...FIXTURE[0], id: 'edge-before', date: '2026-10-26' },
      { ...FIXTURE[0], id: 'edge-start', date: '2026-10-27' },
      { ...FIXTURE[0], id: 'edge-end', date: '2026-11-25' },
      { ...FIXTURE[0], id: 'edge-after', date: '2026-11-26' },
    ];
    const kept = filterOrders(edge, EMPTY_FILTERS, now);
    expect(kept.map(o => o.id)).toEqual(['edge-start', 'edge-end']);
  });

  it('filters by channel exactly, "all" keeps everything', () => {
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, channel: 'social' }, now).map(o => o.id)).toEqual(['fixture-0003']);
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, channel: 'all' }, now).map(o => o.id)).toEqual([
      'fixture-0001', 'fixture-0002', 'fixture-0003', 'fixture-0004', 'fixture-0005',
    ]);
  });

  it('filters by status exactly, "all" keeps everything', () => {
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, status: 'delivered' }, now).map(o => o.id)).toEqual([
      'fixture-0001', 'fixture-0003',
    ]);
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, status: 'all' }, now).map(o => o.id)).toEqual([
      'fixture-0001', 'fixture-0002', 'fixture-0003', 'fixture-0004', 'fixture-0005',
    ]);
  });

  it('searches customer and email case-insensitively', () => {
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, search: 'EVA' }, now).map(o => o.id)).toEqual(['fixture-0005']);
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, search: 'example.com' }, now).map(o => o.id)).toEqual([
      'fixture-0001', 'fixture-0002', 'fixture-0003', 'fixture-0004', 'fixture-0005',
    ]);
    expect(filterOrders(FIXTURE, { ...EMPTY_FILTERS, search: 'zzz' }, now)).toEqual([]);
  });

  it('combines all filters with AND', () => {
    const kept = filterOrders(
      FIXTURE,
      { ...EMPTY_FILTERS, range: '7d', channel: 'direct', status: 'delivered', search: 'alice' },
      now,
    );
    expect(kept.map(o => o.id)).toEqual(['fixture-0001']);
  });
});

describe('selectDashboard', () => {
  const result = selectDashboard(FIXTURE, EMPTY_FILTERS, now);

  it('computes aggregate metrics', () => {
    expect(result.metrics).toEqual({ revenue: 220500, orders: 5, aov: 44100, conversionRate: 40.0 });
  });

  it('fills every day of the window, zeros where nothing happened', () => {
    expect(result.trend).toHaveLength(30);
    const byDate = Object.fromEntries(result.trend.map(p => [p.date, p]));
    expect(byDate['2026-10-27']).toEqual({ date: '2026-10-27', revenue: 0, orders: 0 });
    expect(byDate['2026-11-16']).toEqual({ date: '2026-11-16', revenue: 52800, orders: 1 });
    expect(byDate['2026-11-17']).toEqual({ date: '2026-11-17', revenue: 89900, orders: 1 });
    expect(byDate['2026-11-18']).toEqual({ date: '2026-11-18', revenue: 12900, orders: 1 });
    expect(byDate['2026-11-19']).toEqual({ date: '2026-11-19', revenue: 44900, orders: 1 });
    expect(byDate['2026-11-20']).toEqual({ date: '2026-11-20', revenue: 20000, orders: 1 });
    expect(byDate['2026-11-25']).toEqual({ date: '2026-11-25', revenue: 0, orders: 0 });
  });

  it('ranks channels by revenue with order share', () => {
    expect(result.channels).toEqual([
      { channel: 'direct', revenue: 109900, orders: 2, share: 40.0 },
      { channel: 'email', revenue: 52800, orders: 1, share: 20.0 },
      { channel: 'ads', revenue: 44900, orders: 1, share: 20.0 },
      { channel: 'social', revenue: 12900, orders: 1, share: 20.0 },
    ]);
  });

  it('aggregates products across order items', () => {
    expect(result.products).toEqual([
      { product: '27-inch Monitor', sku: 'MN-400', revenue: 89900, units: 1, orders: 1 },
      { product: 'Mechanical Keyboard', sku: 'KB-200', revenue: 89800, units: 2, orders: 2 },
      { product: 'Wireless Mouse', sku: 'MS-100', revenue: 23700, units: 3, orders: 2 },
      { product: 'USB-C Hub', sku: 'HUB-300', revenue: 12900, units: 1, orders: 1 },
      { product: 'Desk Lamp', sku: 'DL-800', revenue: 4200, units: 1, orders: 1 },
    ]);
  });

  it('returns filtered orders newest first, before pagination', () => {
    expect(result.orders.map(o => o.id)).toEqual([
      'fixture-0001', 'fixture-0002', 'fixture-0003', 'fixture-0004', 'fixture-0005',
    ]);
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it('slices the requested page', () => {
    expect(paginate(items, 1, 3).items).toEqual([1, 2, 3]);
    expect(paginate(items, 2, 3).items).toEqual([4, 5, 6]);
    expect(paginate(items, 3, 3).items).toEqual([7]);
  });

  it('reports totals and clamps out-of-range pages', () => {
    const p1 = paginate(items, 1, 3);
    expect(p1.total).toBe(7);
    expect(p1.totalPages).toBe(3);
    expect(paginate(items, 9, 3).page).toBe(3);
    expect(paginate(items, 0, 3).page).toBe(1);
  });
});

describe('DEMO_ORDERS', () => {
  it('is deterministic and internally consistent', () => {
    expect(DEMO_ORDERS.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const order of DEMO_ORDERS) {
      ids.add(order.id);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(order.date)).toBe(true);
      expect(Number.isInteger(order.amount)).toBe(true);
      expect(order.amount).toBe(
        order.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
      );
    }
    expect(ids.size).toBe(DEMO_ORDERS.length);
  });
});
