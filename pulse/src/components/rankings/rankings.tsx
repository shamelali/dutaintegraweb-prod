import { useState } from "react";
import { formatMoney, type ChannelAggregate, type ProductAggregate } from "../../lib/analytics";

function ChannelRow({ channel, rank }: { channel: ChannelAggregate; rank: number }) {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <li
      className={highlighted ? "pulse-ranking-item pulse-ranking-item--highlight" : "pulse-ranking-item"}
      onMouseEnter={() => setHighlighted(true)}
      onMouseLeave={() => setHighlighted(false)}
    >
      <span className="pulse-ranking-rank">{rank}</span>
      <span className="pulse-ranking-name">{channel.channel}</span>
      <span className="pulse-ranking-value">{formatMoney(channel.revenue)}</span>
      <span className="pulse-ranking-meta">
        {channel.orders} orders · {channel.share}% share
      </span>
    </li>
  );
}

function ProductRow({ product, rank }: { product: ProductAggregate; rank: number }) {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <li
      className={highlighted ? "pulse-ranking-item pulse-ranking-item--highlight" : "pulse-ranking-item"}
      onMouseEnter={() => setHighlighted(true)}
      onMouseLeave={() => setHighlighted(false)}
    >
      <span className="pulse-ranking-rank">{rank}</span>
      <span className="pulse-ranking-name">{product.product}</span>
      <span className="pulse-ranking-value">{formatMoney(product.revenue)}</span>
      <span className="pulse-ranking-meta">
        {product.units} units · {product.orders} orders
      </span>
    </li>
  );
}

export function Rankings({
  channels,
  products,
}: {
  channels: readonly ChannelAggregate[];
  products: readonly ProductAggregate[];
}) {
  return (
    <section aria-label="Rankings" className="pulse-rankings">
      <section className="pulse-ranking-group">
        <h2 id="pulse-ranking-channels">Top channels</h2>
        <ol aria-labelledby="pulse-ranking-channels">
          {channels.map((channel, index) => (
            <ChannelRow key={channel.channel} channel={channel} rank={index + 1} />
          ))}
        </ol>
      </section>
      <section className="pulse-ranking-group">
        <h2 id="pulse-ranking-products">Top products</h2>
        <ol aria-labelledby="pulse-ranking-products">
          {products.map((product, index) => (
            <ProductRow key={product.sku} product={product} rank={index + 1} />
          ))}
        </ol>
      </section>
    </section>
  );
}
