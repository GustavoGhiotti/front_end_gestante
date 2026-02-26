import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LineDataset {
  label: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  datasets: LineDataset[];
  /** Labels do eixo X (datas) */
  labels: string[];
  /** Título exibido acima */
  title?: string;
  height?: number;
  /** Descrição acessível para screen readers */
  ariaLabel?: string;
}

// ─── Constantes do SVG ────────────────────────────────────────────────────────
const W  = 640;
const PAD = { top: 20, right: 20, bottom: 38, left: 48 };

// ─── Componente ───────────────────────────────────────────────────────────────
export function LineChart({
  datasets,
  labels,
  title,
  height = 200,
  ariaLabel,
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);

  const plotW = W  - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const allValues = datasets.flatMap(d => d.values);
  const maxVal = Math.max(...allValues, 1);
  const n = labels.length;

  function xPos(i: number) { return PAD.left + (i / Math.max(n - 1, 1)) * plotW; }
  function yPos(v: number) { return PAD.top + plotH - (v / maxVal) * plotH; }

  // Grid: 4 linhas horizontais
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const gridLines = gridSteps.map(f => ({
    v: Math.round(maxVal * f),
    y: yPos(maxVal * f),
  }));

  // Espaçamento de labels no eixo X
  const xStep = Math.ceil(n / 8);

  // Mouse move: encontrar ponto mais próximo
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const rawIdx = (svgX - PAD.left) / plotW * (n - 1);
    const idx = Math.max(0, Math.min(n - 1, Math.round(rawIdx)));
    setTooltip({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const accessibleSummary = ariaLabel ??
    `Gráfico de linha${title ? `: ${title}` : ''}. ${datasets.map(d => `${d.label}: mín ${Math.min(...d.values)}, máx ${Math.max(...d.values)}`).join('; ')}.`;

  return (
    <figure className="relative">
      {title && (
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
          {title}
        </p>
      )}

      <div
        className="relative"
        onMouseLeave={() => setTooltip(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="w-full"
          aria-label={accessibleSummary}
          role="img"
          onMouseMove={handleMouseMove}
        >
          {/* Grade */}
          {gridLines.map((gl, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={gl.y} x2={W - PAD.right} y2={gl.y}
                stroke="#e2e8f0" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={gl.y + 4}
                textAnchor="end" fontSize="10" fill="#94a3b8"
              >
                {gl.v}
              </text>
            </g>
          ))}

          {/* Labels eixo X */}
          {labels.map((label, i) => {
            if (i % xStep !== 0 && i !== n - 1) return null;
            return (
              <text
                key={i}
                x={xPos(i)} y={height - 6}
                textAnchor="middle" fontSize="10" fill="#94a3b8"
              >
                {label}
              </text>
            );
          })}

          {/* Linhas */}
          {datasets.map(ds => {
            const pts = ds.values.map((v, i) =>
              `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`
            ).join(' ');
            return (
              <polyline
                key={ds.label}
                points={pts}
                fill="none"
                stroke={ds.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Dots no último ponto */}
          {datasets.map(ds => {
            const last = ds.values[ds.values.length - 1];
            return (
              <circle
                key={ds.label}
                cx={xPos(n - 1)} cy={yPos(last)}
                r="3" fill={ds.color}
              />
            );
          })}

          {/* Linha vertical de hover */}
          {tooltip && (
            <line
              x1={xPos(tooltip.idx)} y1={PAD.top}
              x2={xPos(tooltip.idx)} y2={PAD.top + plotH}
              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 2"
            />
          )}
        </svg>

        {/* Tooltip flutuante */}
        {tooltip && (
          <div
            aria-live="polite"
            className="pointer-events-none absolute bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-modal"
            style={{
              left: Math.min(tooltip.x + 12, (W / 640) * 500),
              top: tooltip.y - 8,
              transform: 'translateY(-100%)',
              whiteSpace: 'nowrap',
            }}
          >
            <p className="text-slate-400 mb-1">{labels[tooltip.idx]}</p>
            {datasets.map(ds => (
              <p key={ds.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: ds.color }} />
                {ds.label}: <span className="font-semibold">{ds.values[tooltip.idx]}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      {datasets.length > 1 && (
        <figcaption className="flex flex-wrap gap-4 mt-3">
          {datasets.map(ds => (
            <div key={ds.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className="w-8 h-0.5 rounded-full inline-block"
                style={{ backgroundColor: ds.color }}
                aria-hidden="true"
              />
              {ds.label}
            </div>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
