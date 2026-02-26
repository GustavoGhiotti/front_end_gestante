/**
 * Exporta um array de objetos para CSV e dispara o download no browser.
 * Inclui BOM (\uFEFF) para compatibilidade com Excel/pt-BR.
 */
export function exportToCsv(
  filename: string,
  rows: Record<string, string | number | undefined>[],
): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escape = (v: string | number | undefined): string => {
    const str = String(v ?? '');
    // Se contém vírgula, aspas ou quebra de linha, encapsula em aspas
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const csvLines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
