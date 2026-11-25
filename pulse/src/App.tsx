import { useState } from "react";
import { DEMO_ORDERS } from "./lib/demo-data";
import { selectDashboard, formatMoney } from "./lib/analytics";
import { ChannelFilter } from "./components/channel-filter";
import { RangeSelector } from "./components/range-selector";
import { SearchFilter } from "./components/search-filter";
import { StatusFilter } from "./components/status-filter";
import { StatCard } from "./components/stat-card";
import { Sidebar } from "./components/sidebar";
import { TrendChart } from "./components/charts/trend-chart";
import { ChannelDonut } from "./components/charts/channel-donut";
import { ProductBar } from "./components/charts/product-bar";
import { OrdersTable } from "./components/orders-table";

type Range = "7d" | "30d" | "90d";

export function App({ now = new Date() }: { now?: Date } = {}) {
  const [range, setRange] = useState<Range>("30d");
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selection = selectDashboard(DEMO_ORDERS, { range, channel, status, search }, now);
  const { revenue, orders, aov, conversionRate } = selection.metrics;

  return (
    <main className="pulse-shell">
      <aside className="pulse-sidebar">
        <Sidebar />
      </aside>
      <div className="pulse-canvas">
        <section className="pulse-panel" aria-labelledby="pulse-title">
          <div className="pulse-heading-row">
            <div>
              <p className="pulse-kicker">Pulse</p>
              <h1 className="pulse-title" id="pulse-title">Business overview</h1>
              <p className="pulse-description">
                A clear view of revenue, orders, customers, and product performance.
              </p>
            </div>
            <span className="pulse-badge">Demo data</span>
          </div>
        </section>
        <section className="pulse-filters" aria-label="Filters">
          <RangeSelector value={range} onChange={setRange} />
          <ChannelFilter channel={channel} onChange={setChannel} />
          <StatusFilter status={status} onChange={setStatus} />
          <SearchFilter value={search} onChange={setSearch} />
        </section>
        <section className="pulse-metrics" aria-label="Key metrics">
          <StatCard title="Revenue" value={formatMoney(revenue)} />
          <StatCard title="Orders" value={orders} />
          <StatCard title="Average order value" value={formatMoney(aov)} />
          <StatCard title="Conversion rate" value={`${conversionRate}%`} />
        </section>
        <section className="pulse-charts" aria-label="Charts">
          <section className="pulse-panel pulse-chart-wide" aria-labelledby="trend-title">
            <h2 id="trend-title" className="pulse-chart-title">Revenue trend</h2>
            <TrendChart points={selection.trend} />
          </section>
          <section className="pulse-panel" aria-labelledby="channel-title">
            <h2 id="channel-title" className="pulse-chart-title">Channel distribution</h2>
            <ChannelDonut channels={selection.channels} />
          </section>
          <section className="pulse-panel" aria-labelledby="product-title">
            <h2 id="product-title" className="pulse-chart-title">Top products</h2>
            <ProductBar products={selection.products} />
          </section>
        </section>
        <OrdersTable
          orders={selection.orders}
          pageSize={10}
          selectedOrderId={selectedOrderId}
          onPageChange={() => {}}
          onSelect={setSelectedOrderId}
        />
      </div>
    </main>
  );
}

export default App;
