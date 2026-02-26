// ─── Types ────────────────────────────────────────────────────────────────────
export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: BarItem[];
  title?: string;
  /** Cor padrão das barras */
  defaultColor?: string;
  ariaLabel?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function HorizontalBarChart({
  data,
  title,
  defaultColor = '#0d9488',
  ariaLabel,
}: HorizontalBarChartProps) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  const LABEL_W  = 180;
  const VALUE_W  = 36;
  const BAR_H    = 26;
  const GAP      = 10;
  const PAD_R    = 16;
  const W        = 560;
  const BAR_W    = W - LABEL_W - VALUE_W - PAD_R;

  const H = data.length * (BAR_H + GAP) + GAP;

  const accessibleSummary = ariaLabel ??
    `Gráfico de barras${title ? `: ${title}` : ''}. ` +
    data.map(d => `${d.label}: ${d.value}`).join(', ') + '.';

  return (
    <figure>
      {title && (
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
          {title}
        </p>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        aria-label={accessibleSummary}
        role="img"
      >
        {data.map((item, i) => {
          const y       = GAP + i * (BAR_H + GAP);
          const barLen  = (item.value / maxVal) * BAR_W;
          const color   = item.color ?? defaultColor;

          return (
            <g key={item.label}>
              {/* Label */}
              <text
                x={LABEL_W - 8}
                y={y + BAR_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="#475569"
              >
                {item.label.length > 26 ? item.label.slice(0, 26) + '…' : item.label}
              </text>

              {/* Fundo da barra */}
              <rect
                x={LABEL_W} y={y}
                width={BAR_W} height={BAR_H}
                rx="6" fill="#f1f5f9"
              />

              {/* Barra colorida */}
              <rect
                x={LABEL_W} y={y}
                width={barLen} height={BAR_H}
                rx="6" fill={color}
                opacity="0.9"
              />

              {/* Valor */}
              <text
                x={LABEL_W + BAR_W + 6}
                y={y + BAR_H / 2}
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="600"
                fill="#334155"
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legenda acessível (tabela oculta visualmente) */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr><th>Tipo</th><th>Quantidade</th></tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
