import { DemoOrder } from './demo-data';

export type DateRange = '7d' | '30d' | '90d';

export interface DashboardFilters {
  range: DateRange;
  channel: string;
  status: string;
  search: string;
}

export const DEFAULT_FILTERS: Required<DashboardFilters> = {
  range: '30d',
  channel: 'all',
  status: 'all',
  search: '',
};

const RANGE_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

export interface DateWindow {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  label: string;
}

export interface MetricPoint {
  date: string; // YYYY-MM-DD
  revenue: number; // fen
  orders: number;
}

export interface ChannelAggregate {
  channel: string;
  revenue: number; // fen
  orders: number;
  share: number; // percent of orders, 1 decimal
}

export interface ProductAggregate {
  product: string;
  sku: string;
  revenue: number; // fen
  units: number;
  orders: number;
}

export interface DashboardMetrics {
  revenue: number; // fen
  orders: number;
  aov: number; // fen, rounded integer
  conversionRate: number; // percent of orders delivered, 1 decimal
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardSelection {
  filters: Required<DashboardFilters>;
  window: DateWindow;
  metrics: DashboardMetrics;
  trend: MetricPoint[];
  channels: ChannelAggregate[];
  products: ProductAggregate[];
  orders: readonly DemoOrder[];
}

export function computeWindow(range: DateRange, now: Date): DateWindow {
  const days = RANGE_DAYS[range];
  const end = startOfUtcDay(now);
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - (days - 1)),
  );
  return { start: formatUtcDate(start), end: formatUtcDate(end), label: `Last ${days} days` };
}

export function filterOrders(
  orders: readonly DemoOrder[],
  filters: DashboardFilters,
  now: Date,
): DemoOrder[] {
  const window = computeWindow(filters.range, now);
  const channel = filters.channel.toLowerCase();
  const status = filters.status.toLowerCase();
  const search = filters.search.toLowerCase();

  return orders.filter((order) => {
    if (order.date < window.start || order.date > window.end) return false;
    if (channel !== 'all' && order.channel !== channel) return false;
    if (status !== 'all' && order.status !== status) return false;
    if (
      search &&
      !order.customer.toLowerCase().includes(search) &&
      !order.email.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });
}

export function formatMoney(fen: number): string {
  const sign = fen < 0 ? '-' : '';
  return sign + Math.abs(fen / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): Page<T> {
  let p = Math.max(1, Math.trunc(page));
  let size = Math.max(1, Math.trunc(pageSize));
  const total = items.length;
  const totalPages = Math.ceil(total / size) || 1;
  if (p > totalPages) p = totalPages;
  const start = (p - 1) * size;
  return { items: items.slice(start, start + size), page: p, pageSize: size, total, totalPages };
}

export function selectDashboard(
  orders: readonly DemoOrder[],
  filters: DashboardFilters = DEFAULT_FILTERS,
  now: Date = new Date(),
): DashboardSelection {
  const window = computeWindow(filters.range, now);
  const filtered = filterOrders(orders, filters, now);

  const byDate = new Map<string, MetricPoint>();
  let cursor = new Date(window.start);
  const endMs = new Date(window.end).getTime();
  while (cursor.getTime() <= endMs) {
    byDate.set(formatUtcDate(cursor), { date: formatUtcDate(cursor), revenue: 0, orders: 0 });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }

  let revenue = 0;
  let delivered = 0;
  const channelMap = new Map<string, { revenue: number; orders: number }>();
  const productMap = new Map<
    string,
    { product: string; sku: string; revenue: number; units: number; orderIds: Set<string> }
  >();

  for (const order of filtered) {
    revenue += order.amount;
    if (order.status === 'delivered') delivered += 1;

    const point = byDate.get(order.date);
    if (point) {
      point.revenue += order.amount;
      point.orders += 1;
    }

    const channelKey = order.channel;
    const channelAcc = channelMap.get(channelKey) ?? { revenue: 0, orders: 0 };
    channelAcc.revenue += order.amount;
    channelAcc.orders += 1;
    channelMap.set(channelKey, channelAcc);

    for (const item of order.items) {
      const productAcc = productMap.get(item.sku) ?? {
        product: item.product,
        sku: item.sku,
        revenue: 0,
        units: 0,
        orderIds: new Set(),
      };
      productAcc.revenue += item.qty * item.unitPrice;
      productAcc.units += item.qty;
      productAcc.orderIds.add(order.id);
      productMap.set(item.sku, productAcc);
    }
  }

  const orderCount = filtered.length;
  const aov = orderCount ? Math.round(revenue / orderCount) : 0;
  const conversionRate = orderCount ? Math.round((delivered / orderCount) * 1000) / 10 : 0;

  const trend = [...byDate.values()];
  const channels = [...channelMap.entries()].map(([channel, v]) => ({
    channel,
    revenue: v.revenue,
    orders: v.orders,
    share: orderCount ? Math.round((v.orders / orderCount) * 1000) / 10 : 0,
  }));
  channels.sort((a, b) => b.revenue - a.revenue || a.channel.localeCompare(b.channel));

  const products = [...productMap.values()].map((p) => ({
    product: p.product,
    sku: p.sku,
    revenue: p.revenue,
    units: p.units,
    orders: p.orderIds.size,
  }));
  products.sort((a, b) => b.revenue - a.revenue || a.product.localeCompare(b.product));

  const sortedOrders = [...filtered].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id),
  );

  return {
    filters: { ...DEFAULT_FILTERS, ...filters },
    window,
    metrics: { revenue, orders: orderCount, aov, conversionRate },
    trend,
    channels,
    products,
    orders: sortedOrders,
  };
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
