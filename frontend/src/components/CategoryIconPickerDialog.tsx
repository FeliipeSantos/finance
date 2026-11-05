import React, { useState } from 'react';
import { Box, Dialog, Grid, IconButton, TextField, Typography } from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import { CATEGORY_ICON_GROUPS } from '../utils/categoryIcons';

interface CategoryIconPickerDialogProps {
  open: boolean;
  onClose: () => void;
  value?: string;
  onSelect: (iconValue: string) => void;
  title?: string;
}

const CategoryIconPickerDialog: React.FC<CategoryIconPickerDialogProps> = ({
  open,
  onClose,
  value,
  onSelect,
  title = 'Selecionar Ícone',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const query = searchQuery.toLowerCase();
  const filteredGroups = CATEGORY_ICON_GROUPS
    .map((group) => ({
      group: group.group,
      icons: query
        ? group.icons.filter(
            (i) => i.label.toLowerCase().includes(query) || group.group.toLowerCase().includes(query)
          )
        : group.icons,
    }))
    .filter((group) => group.icons.length > 0);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      sx={{ zIndex: 1601 }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "var(--color-panel, #13141B)",
          borderRadius: '12px',
          border: "1px solid var(--color-border)",
          boxShadow: "0px 10px 45px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.65)",
          p: 1.5,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" px={1} pb={1.5} borderBottom="1px solid rgba(255,255,255,0.04)">
        <IconButton onClick={handleClose} sx={{ color: "var(--color-text-secondary, #6F768E)", p: 0.5 }}>
          <CloseIcon />
        </IconButton>
        <Typography component="h2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}>
          {title}
        </Typography>
        <Box sx={{ width: 32 }} />
      </Box>

      <Box px={1} pt={1.5}>
        <TextField
          fullWidth
          placeholder="Buscar ícone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: <SearchIcon sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '1.1rem', mr: 1 }} />,
            sx: {
              color: "var(--color-text-primary, #FFFFFF)",
              bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
              borderRadius: '12px',
              px: 2,
              py: 1,
              fontSize: '0.85rem',
            },
          }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          mt: 1,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: "4px" },
        }}
      >
        {filteredGroups.length === 0 && (
          <Typography sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
            Nenhum ícone encontrado.
          </Typography>
        )}
        {filteredGroups.map(({ group, icons }) => (
          <Box key={group} mb={2}>
            <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #6F768E)", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem', mb: 1, display: 'block' }}>
              {group}
            </Typography>
            <Grid container spacing={1.5}>
              {icons.map((ico) => (
                <Grid item xs={2.4} key={ico.value} display="flex" justifyContent="center">
                  <Box
                    onClick={() => {
                      onSelect(ico.value);
                      handleClose();
                    }}
                    title={ico.label}
                    sx={{
                      cursor: 'pointer',
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: ico.value === value ? 'var(--color-primary-text)' : "var(--color-text-secondary, #7E8494)",
                      border: ico.value === value ? '2px solid var(--color-primary)' : '2px solid transparent',
                      bgcolor: ico.value === value ? 'rgba(var(--color-primary-rgb), 0.1)' : "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
                      transition: 'transform 0.1s, background-color 0.1s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                      },
                    }}
                  >
                    <ico.Icon fontSize="small" />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Box>
    </Dialog>
  );
};

export default CategoryIconPickerDialog;
