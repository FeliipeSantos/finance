import { forwardRef, useRef, useState } from 'react';
import type { ReactElement, Ref } from 'react';
import { Box, Dialog, Slide, useMediaQuery } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { Routes, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { PageScrollContext } from '../hooks/usePageScrollRestoration';

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement }, ref: Ref<unknown>,
) {
  return <Slide direction="left" ref={ref} {...props} />;
});

export default function DetailLayer({ location, children }: {
  location: Location | null;
  children: ReactElement[];
}) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Keep the outgoing detail mounted until its closing animation finishes.
  const [shownLocation, setShownLocation] = useState(location);
  if (location && location !== shownLocation) setShownLocation(location);

  return (
    <Dialog
      fullScreen
      open={Boolean(location)}
      onClose={() => navigate(-1)}
      aria-label="Detalhes do resumo"
      TransitionComponent={Transition}
      transitionDuration={reducedMotion ? 0 : { enter: 280, exit: 220 }}
      TransitionProps={{ onExited: () => {
        setShownLocation(null);
        window.dispatchEvent(new Event('summary:refresh'));
      } }}
      PaperProps={{ sx: {
        bgcolor: "var(--color-page, #0F1016)", backgroundImage: 'none', overflow: 'hidden',
        // Anchor fixed headers and footers to the layer, not its scroll area.
        contain: 'layout',
      } }}
    >
      <PageScrollContext.Provider value={{ container }}>
        <Box ref={container} data-detail-layer sx={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {shownLocation && <Routes location={shownLocation}>{children}</Routes>}
        </Box>
      </PageScrollContext.Provider>
    </Dialog>
  );
}
