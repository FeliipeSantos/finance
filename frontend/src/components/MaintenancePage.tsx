import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Construction as ConstructionIcon } from '@mui/icons-material';

const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        px: 3,
        bgcolor: "var(--color-page, #090A0E)",
        color: '#FFFFFF',
      }}
    >
      {/* Animated Wrench/Construction Icon */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: "50%",
          bgcolor: 'rgba(244, 162, 97, 0.08)',
          color: "var(--color-warning, #F4A261)",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid rgba(244, 162, 97, 0.15)',
          animation: 'pulse 2.5s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(244, 162, 97, 0.2)' },
            '50%': { transform: 'scale(1.05)', boxShadow: '0 0 20px 5px rgba(244, 162, 97, 0.1)' },
            '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(244, 162, 97, 0.2)' },
          }
        }}
      >
        <ConstructionIcon sx={{ fontSize: '3rem' }} />
      </Box>

      {/* Main text */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          fontFamily: '"Inter", sans-serif',
          mb: 1.5,
          background: "linear-gradient(135deg, #FFFFFF 0%, var(--color-text-secondary, #7E8494) 100%)",
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Página em Manutenção
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: "var(--color-text-secondary, #7E8494)",
          maxWidth: 450,
          mb: 4,
          fontSize: '0.925rem',
          lineHeight: 1.6,
          fontFamily: '"Inter", sans-serif',
        }}
      >
        Esta funcionalidade está passando por atualizações programadas para oferecer a melhor experiência para você. Volte em breve!
      </Typography>

      {/* Action button */}
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{
          borderRadius: "8px",
          px: 4,
          py: 1.25,
          fontWeight: 700,
          textTransform: 'none',
          bgcolor: 'var(--color-primary)',
          '&:hover': {
            bgcolor: 'var(--color-primary-dark)',
            transform: 'translateY(-1px)',
          }
        }}
      >
        Voltar para o Início
      </Button>
    </Box>
  );
};

export default MaintenancePage;
