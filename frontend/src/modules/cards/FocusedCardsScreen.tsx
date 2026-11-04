import React from 'react';
import FocusedLayout from '../../components/FocusedLayout';
import CardsPage from './CardsPage';

// Acessado a partir do indicador "Total faturas" no Resumo — mesma tela do
// módulo Cartões, só que em tela cheia (sem sidebar) com botão de voltar.
const FocusedCardsScreen: React.FC = () => (
  <FocusedLayout title="Cartões">
    <CardsPage />
  </FocusedLayout>
);

export default FocusedCardsScreen;
