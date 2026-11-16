import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { MONO } from '../theme.js'

function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function HistoryList({ items, onPick, onClear }) {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 1.5, fontSize: 13 }}>
        Questions and queries you run on this database will appear here.
      </Typography>
    )
  }
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 2 }}>
      {items.map((item) => (
        <ButtonBase
          key={item.id}
          onClick={() => onPick(item)}
          sx={{ display: 'block', width: '100%', textAlign: 'left', px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Box
            sx={{
              fontSize: item.question ? 13 : 12,
              fontFamily: item.question ? 'inherit' : MONO,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.question ?? item.sql}
          </Box>
          <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.25 }}>
            {item.question ? 'Question' : 'SQL'} · {item.rowCount} {item.rowCount === 1 ? 'row' : 'rows'} · {timeAgo(item.createdAt)}
          </Typography>
        </ButtonBase>
      ))}
      <Box sx={{ p: 1 }}>
        <Button size="small" color="inherit" onClick={onClear} sx={{ fontSize: 12, color: 'text.secondary' }}>
          Clear history
        </Button>
      </Box>
    </Box>
  )
}
