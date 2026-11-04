import React, { useEffect, useRef, useState } from 'react';
import { Box, Dialog, Grid, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon, AddPhotoAlternate as UploadIcon } from '@mui/icons-material';
import { renderBankLogoSvg } from '../utils/bankIcons';
import type { BankOption } from '../utils/bankIcons';
import api from '../config/api';
import { resizeImageToDataUri } from '../utils/imageUpload';

interface SavedCustomIcon {
  id: string;
  imageData: string;
  canDelete: boolean;
}

interface BankPickerDialogProps {
  open: boolean;
  onClose: () => void;
  value?: string;
  onSelect: (bankId: string) => void;
  /** Opção padrão (não-bancária) exibida ao lado do tile de upload, ex.: Genérico. */
  extraOptions?: BankOption[];
  title?: string;
  /** Chamado com o data URI já redimensionado quando o usuário carrega uma imagem própria. */
  onUploadImage?: (dataUri: string) => void;
  /** Data URI atualmente selecionado (quando value === 'custom'), para mostrar a miniatura no tile de upload. */
  customIconUrl?: string;
}

const BankPickerDialog: React.FC<BankPickerDialogProps> = ({
  open,
  onClose,
  value,
  onSelect,
  extraOptions = [],
  title = 'Selecionar Ícone',
  onUploadImage,
  customIconUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customIcons, setCustomIcons] = useState<SavedCustomIcon[]>([]);

  // Carrega a biblioteca de ícones personalizados (compartilhada entre todas
  // as contas/cartões do usuário) sempre que o seletor é aberto. Se o ícone
  // atualmente aplicado ainda não estiver na biblioteca (ex.: enviado antes
  // desse recurso existir, ou substituído por um upload mais recente), ele é
  // migrado automaticamente para lá também — nenhuma imagem já usada se
  // perde, mesmo trocando o ícone várias vezes.
  useEffect(() => {
    if (!open || !onUploadImage) return;
    api.get('/custom-icons')
      .then((res) => {
        setCustomIcons(res.data);
        if (value === 'custom' && customIconUrl && !res.data.some((i: SavedCustomIcon) => i.imageData === customIconUrl)) {
          api.post('/custom-icons', { imageData: customIconUrl })
            .then((res2) => {
              setCustomIcons((prev) => (prev.some((i) => i.id === res2.data.id) ? prev : [...prev, res2.data]));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [open, onUploadImage, value, customIconUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem.');
      return;
    }
    try {
      const dataUri = await resizeImageToDataUri(file);
      onUploadImage?.(dataUri);
      onClose();
      // Salva na biblioteca do usuário em segundo plano, para ficar
      // disponível na próxima vez que o seletor for aberto em qualquer
      // conta ou cartão.
      api.post('/custom-icons', { imageData: dataUri })
        .then((res) => {
          setCustomIcons((prev) => (prev.some((i) => i.id === res.data.id) ? prev : [...prev, res.data]));
        })
        .catch(() => {});
    } catch {
      alert('Não foi possível processar a imagem selecionada.');
    }
  };

  const handleDeleteCustomIcon = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta imagem da biblioteca de ícones?')) {
      return;
    }
    try {
      await api.delete(`/custom-icons/${id}`);
      setCustomIcons((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // Falha silenciosa — o ícone simplesmente continua na lista.
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "var(--color-panel, #13141B)",
          borderRadius: '12px',
          border: "1px solid var(--color-border)",
          boxShadow: "0px 10px 45px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.65)",
          p: 1.5,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" px={1} pb={1.5} borderBottom="1px solid rgba(255,255,255,0.04)">
        <IconButton onClick={onClose} sx={{ color: "var(--color-text-secondary, #6F768E)", p: 0.5 }}>
          <CloseIcon />
        </IconButton>
        <Typography component="h2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}>
          {title}
        </Typography>
        <Box sx={{ width: 32 }} />
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Grid container spacing={2.5} justifyContent="center">
          {extraOptions.map((b) => (
            <Grid item xs={4} key={b.id} display="flex" justifyContent="center">
              <Box
                onClick={() => {
                  onSelect(b.id);
                  onClose();
                }}
                sx={{
                  cursor: 'pointer',
                  borderRadius: "50%",
                  p: 0.5,
                  border: b.id === value ? '2px solid var(--color-primary)' : '2px solid transparent',
                  bgcolor: b.id === value ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                  transition: 'transform 0.1s, background-color 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    transform: 'scale(1.15)',
                    bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
                  },
                }}
                title={b.name}
              >
                {renderBankLogoSvg(b.id, 44)}
              </Box>
            </Grid>
          ))}

          {onUploadImage && customIcons.map((icon) => (
            <Grid item xs={4} key={icon.id} display="flex" justifyContent="center">
              <Box sx={{ position: 'relative', '&:hover .icon-delete-btn': { opacity: 1 } }}>
                <Box
                  onClick={() => {
                    onUploadImage(icon.imageData);
                    onClose();
                  }}
                  title="Ícone personalizado"
                  sx={{
                    cursor: 'pointer',
                    borderRadius: "50%",
                    width: 44,
                    height: 44,
                    overflow: 'hidden',
                    border: value === 'custom' && customIconUrl === icon.imageData ? '2px solid var(--color-primary)' : '2px solid transparent',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                >
                  <Box component="img" src={icon.imageData} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                {icon.canDelete && (
                  <IconButton
                    className="icon-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomIcon(icon.id);
                    }}
                    title="Remover da biblioteca"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      bgcolor: "var(--color-surface-raised, #1D1E26)",
                      border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                      color: "var(--color-text-secondary, #7E8494)",
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      '&:hover': { bgcolor: '#2A2B36', color: "var(--color-expense, #E05A5A)" },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: '0.75rem' }} />
                  </IconButton>
                )}
              </Box>
            </Grid>
          ))}

          {/* Ícone personalizado já aplicado, mas ainda não salvo na biblioteca
              (ex.: enviado antes desse recurso existir) — mostrado à parte
              para não ficar escondido atrás do botão de upload abaixo. */}
          {onUploadImage && value === 'custom' && customIconUrl && !customIcons.some((i) => i.imageData === customIconUrl) && (
            <Grid item xs={4} display="flex" justifyContent="center">
              <Box
                title="Ícone atual"
                sx={{
                  borderRadius: "50%",
                  width: 44,
                  height: 44,
                  overflow: 'hidden',
                  border: '2px solid var(--color-primary)',
                }}
              >
                <Box component="img" src={customIconUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            </Grid>
          )}

          {onUploadImage && (
            <Grid item xs={4} display="flex" justifyContent="center">
              <Box
                onClick={() => fileInputRef.current?.click()}
                title="Carregar imagem do computador"
                sx={{
                  cursor: 'pointer',
                  borderRadius: "50%",
                  width: 44,
                  height: 44,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: "2px dashed rgba(var(--color-overlay-rgb, 255, 255, 255), 0.2)",
                  transition: 'transform 0.1s, background-color 0.1s',
                  '&:hover': {
                    transform: 'scale(1.15)',
                    bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
                  },
                }}
              >
                <UploadIcon sx={{ fontSize: '1.3rem', color: "var(--color-text-secondary, #7E8494)" }} />
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      {onUploadImage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      )}
    </Dialog>
  );
};

export default BankPickerDialog;
