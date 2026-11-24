export function normalizeProductMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];

  return metrics.flatMap((metric) => {
    if (typeof metric === "string") {
      const value = metric.trim();
      return value ? [value] : [];
    }
    if (!metric || typeof metric !== "object" || Array.isArray(metric)) return [];

    const label = typeof metric.label === "string" ? metric.label.trim() : "";
    const value = typeof metric.value === "string" ? metric.value.trim() : "";
    return label && value ? [{ label, value }] : [];
  });
}
