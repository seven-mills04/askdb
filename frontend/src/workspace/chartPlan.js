const MAX_POINTS = 60
const TIME_LIKE = /date|day|week|month|year|hour|time/i

/**
 * Decides how to chart a result: the first text-like column becomes the labels (x axis)
 * and the first numeric column becomes the values. Returns null if that isn't possible.
 */
export function chartPlan(result) {
  const { columns, rows } = result
  if (rows.length < 2 || rows.length > MAX_POINTS || columns.length < 2) return null

  const isNumeric = columns.map((_, i) => rows.every((r) => r[i] === null || typeof r[i] === 'number'))
  let labelCol = isNumeric.findIndex((n) => !n)
  if (labelCol === -1) labelCol = 0 // all numeric (e.g. hour, plays): use the first column as labels
  const valueCol = isNumeric.findIndex((n, i) => n && i !== labelCol)
  if (valueCol === -1) return null

  return {
    labelKey: columns[labelCol],
    valueKey: columns[valueCol],
    kind: TIME_LIKE.test(columns[labelCol]) ? 'line' : 'bar',
    data: rows.map((r) => ({ [columns[labelCol]]: String(r[labelCol]), [columns[valueCol]]: r[valueCol] })),
  }
}

