import React from 'react';
import FocusedLayout from '../../components/FocusedLayout';
import AccountsPage from './AccountsPage';

// Acessado a partir do indicador "Saldo nas contas" no Resumo — mesma tela do
// módulo Contas, só que em tela cheia (sem sidebar) com botão de voltar.
const FocusedAccountsScreen: React.FC = () => (
  <FocusedLayout title="Contas">
    <AccountsPage />
  </FocusedLayout>
);

export default FocusedAccountsScreen;
