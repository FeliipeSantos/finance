import { useId, useState } from 'react';
import { Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { VisibilityOutlined, VisibilityOffOutlined } from '@mui/icons-material';

export default function AuthField({ label, type = 'text', ...props }: Omit<TextFieldProps, 'label' | 'variant'> & { label: string }) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <Box>
      <Typography component="label" htmlFor={id} sx={{ display: 'block', color: 'text.primary', fontSize: '.9rem', fontWeight: 600, mb: 1.25 }}>
        {label}{props.required && <Box component="span" aria-hidden="true"> *</Box>}
      </Typography>
      <TextField {...props} id={id} fullWidth variant="outlined" type={isPassword && visible ? 'text' : type}
        InputProps={isPassword ? {
          endAdornment: <InputAdornment position="end"><IconButton
            type="button" size="small" disabled={props.disabled}
            aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLocaleLowerCase('pt-BR')}`}
            aria-pressed={visible} onClick={() => setVisible((previous) => !previous)}
            onMouseDown={(event) => event.preventDefault()} edge="end" sx={{ color: 'text.secondary' }}
          >{visible ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}</IconButton></InputAdornment>,
        } : undefined}
        sx={{
          '& .MuiOutlinedInput-root': { minHeight: 50, bgcolor: "var(--color-page, #0F1016)", borderRadius: '8px' },
          '& .MuiOutlinedInput-input': { py: '13px', px: 2, fontSize: '.95rem' },
          '& .MuiOutlinedInput-input:is(:autofill, :-webkit-autofill)': {
            WebkitBoxShadow: '0 0 0 1000px var(--color-page) inset',
            boxShadow: "0 0 0 1000px var(--color-page, #0F1016) inset",
            WebkitTextFillColor: "var(--color-text-primary, #FFFFFF)",
            caretColor: 'var(--color-text-primary)',
          },
          '& input::placeholder': { opacity: 1, color: 'text.secondary' },
        }}
      />
    </Box>
  );
}
