import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function ResultChart({ plan }) {
  const theme = useTheme()
  const color = theme.vars.palette.primary.main
  const axis = { fontSize: 11, fill: theme.vars.palette.text.secondary }
  const tooltipStyle = {
    background: theme.vars.palette.background.paper,
    border: `1px solid ${theme.vars.palette.divider}`,
    borderRadius: 6,
    fontSize: 12,
  }
  const Chart = plan.kind === 'line' ? LineChart : BarChart

  return (
    <Box sx={{ p: 2 }}>
      <Typography color="text.secondary" sx={{ fontSize: 12, mb: 1 }}>
        {plan.valueKey} by {plan.labelKey}
      </Typography>
      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={plan.data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke={theme.vars.palette.divider} />
            <XAxis dataKey={plan.labelKey} tick={axis} tickLine={false} axisLine={{ stroke: theme.vars.palette.divider }} interval="preserveStartEnd" />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={56} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.vars.palette.action.hover }} />
            {plan.kind === 'line' ? (
              <Line dataKey={plan.valueKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            ) : (
              <Bar dataKey={plan.valueKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} isAnimationActive={false} />
            )}
          </Chart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
