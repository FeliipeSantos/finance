export interface BankOption {
  id: string;
  name: string;
  primaryColor: string;
}

// Lista de instituições financeiras reais suportadas pelo seletor de banco
// (usado tanto em Contas quanto em Cartões). Nubank e C6 usam símbolos
// vetoriais; os demais bancos mantêm os ícones existentes do catálogo.
export const BANKS_LIST: BankOption[] = [
  { id: 'nubank', name: 'Nubank', primaryColor: '#820AD1' },
  { id: 'itau', name: 'Itaú', primaryColor: '#EC7000' },
  { id: 'bradesco', name: 'Bradesco', primaryColor: '#CC0000' },
  { id: 'bb', name: 'Banco do Brasil', primaryColor: '#FAF000' },
  { id: 'santander', name: 'Santander', primaryColor: '#EC0000' },
  { id: 'caixa', name: 'Caixa', primaryColor: '#005CA9' },
  { id: 'c6', name: 'C6 Bank', primaryColor: '#1E1E1E' },
  { id: 'inter', name: 'Inter', primaryColor: '#FF7A00' },
  { id: 'btg', name: 'BTG Pactual', primaryColor: '#081C3B' },
  { id: 'xp', name: 'XP Investimentos', primaryColor: '#000000' },
  { id: 'neon', name: 'Neon', primaryColor: '#00E5FF' },
  { id: 'next', name: 'Next', primaryColor: '#00FF5F' },
  { id: 'bmg', name: 'Banco BMG', primaryColor: '#FF6C00' },
  { id: 'banrisul', name: 'Banrisul', primaryColor: '#00519E' },
  { id: 'sicoob', name: 'Sicoob', primaryColor: '#00363A' },
  { id: 'sicredi', name: 'Sicredi', primaryColor: '#339933' },
  { id: 'stone', name: 'Stone', primaryColor: '#00A859' },
  { id: 'pagbank', name: 'PagBank', primaryColor: '#006B75' },
  { id: 'picpay', name: 'PicPay', primaryColor: '#11C76F' },
  { id: 'mercadopago', name: 'Mercado Pago', primaryColor: '#00A6FF' },
  { id: 'will', name: 'Will Bank', primaryColor: '#FFE600' },
  { id: 'ame', name: 'Ame Digital', primaryColor: '#FF007A' },
  { id: 'agibank', name: 'Agibank', primaryColor: '#E6007E' },
  { id: 'safra', name: 'Safra', primaryColor: '#0C2340' },
  { id: 'digio', name: 'Digio', primaryColor: '#003399' },
  { id: 'trigg', name: 'Trigg', primaryColor: '#00D2C4' },
  { id: 'alelo', name: 'Alelo', primaryColor: '#007D4A' },
  { id: 'caixatem', name: 'Caixa Tem', primaryColor: '#40C4FF' },
  { id: 'paypal', name: 'PayPal', primaryColor: '#003087' },
  { id: 'binance', name: 'Binance', primaryColor: '#1E1E1E' },
  { id: 'pan', name: 'Banco Pan', primaryColor: '#00A3E0' },
  { id: 'bari', name: 'Banco Bari', primaryColor: '#0A0A0A' },
  // Adicionadas para cobrir instituições comuns que faltavam na lista
  { id: 'bv', name: 'Banco BV', primaryColor: '#FF5500' },
  { id: 'original', name: 'Banco Original', primaryColor: '#00953B' },
  { id: 'sofisa', name: 'Sofisa Direto', primaryColor: '#003DA5' },
  { id: 'daycoval', name: 'Banco Daycoval', primaryColor: '#004B87' },
  { id: 'modalmais', name: 'Modalmais', primaryColor: '#0F0F0F' },
  { id: 'rico', name: 'Rico Investimentos', primaryColor: '#FF4400' },
  { id: 'clear', name: 'Clear Corretora', primaryColor: '#00B37E' },
  { id: 'genial', name: 'Genial Investimentos', primaryColor: '#6B2FBF' },
  { id: 'toro', name: 'Toro Investimentos', primaryColor: '#FF6600' },
  { id: 'superdigital', name: 'Superdigital', primaryColor: '#6200EE' },
  { id: 'bs2', name: 'Banco BS2', primaryColor: '#0F2C59' },
  { id: 'cresol', name: 'Cresol', primaryColor: '#006838' },
  { id: 'nomad', name: 'Nomad', primaryColor: '#131316' },
  { id: 'wise', name: 'Wise', primaryColor: '#9FE870' },
  { id: 'inbursa', name: 'Banco Inbursa', primaryColor: '#7A1F2B' },
];

// Opções não-bancárias oferecidas no seletor de ícone de Conta (não fazem
// parte da lista de bancos "de verdade").
export const SPECIAL_ACCOUNT_OPTIONS: BankOption[] = [
  { id: 'bank', name: 'Genérico', primaryColor: '#7E8494' },
  { id: 'dinheiro', name: 'Dinheiro', primaryColor: '#4EBE87' },
  { id: 'investimento', name: 'Investimentos', primaryColor: '#26C6DA' },
];

// Aliases de ids antigos (contas criadas antes deste catálogo compartilhado existir).
const LEGACY_BANK_ID_ALIASES: Record<string, string> = {
  nu: 'nubank',
};

const bankKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const normalizeBankId = (bankId: string) => {
  const key = bankKey(bankId);
  return LEGACY_BANK_ID_ALIASES[key]
    || BANKS_LIST.find((bank) => bankKey(bank.id) === key || bankKey(bank.name) === key)?.id
    || key;
};

export const renderBankLogoSvg = (bankId: string | undefined, size: number = 32) => {
  const id = normalizeBankId(bankId || '');

  if (id === 'nubank') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#820AD1" />
        {/* Nubank symbol: Simple Icons (CC0), see bank-logo-sources.md. */}
        <path transform="translate(8 8)" fill="#FFFFFF" d="M7.2795 5.4336c-1.1815 0-2.1846.4628-2.9432 1.252h-.002c-.0541-.0022-.1074-.002-.162-.002-1.5436 0-2.9925.8835-3.699 2.2559-.3088.5996-.4234 1.2442-.459 1.9003-.0321.589 0 1.1863 0 1.7696v5.6523H3.184s.0022-2.784 0-5.1777c-.0014-1.6112-.0118-3.0471 0-3.3418.056-1.3937.4372-2.3053 1.1484-3.0508 2.3585.0018 3.8852 1.6091 3.9705 4.168.0196.5874.0254 3.7304.0254 3.7304v3.672h3.1678v-4.965c0-1.5007.0127-2.8006-.0918-3.6952-.292-2.5-1.821-4.168-4.1248-4.168zm8.3903.3008l-3.166.0039v4.9648c0 1.5009-.0127 2.8007.0919 3.6953.2921 2.5001 1.821 4.168 4.1248 4.168 1.1815 0 2.1846-.4628 2.9432-1.252.0003-.0003.0016.0004.002 0 .0542.0023.1093.002.164.002 1.5435 0 2.9905-.8835 3.6971-2.2558.3088-.5997.4233-1.2442.459-1.9004.032-.5889 0-1.1862 0-1.7695V5.7383H20.816s-.0022 2.784 0 5.1777c.0015 1.6113.0119 3.047 0 3.3418-.056 1.3935-.4372 2.3053-1.1483 3.0508-2.3586-.0018-3.8853-1.6091-3.9706-4.168-.0196-.5874-.0273-2.0437-.0273-3.7324Z" />
      </svg>
    );
  }
  if (id === 'itau') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#EC7000" />
        <rect x="9" y="9" width="22" height="22" rx="4" fill="#002E7A" />
        <text x="20" y="23.5" fill="#FFD200" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">itaú</text>
      </svg>
    );
  }
  if (id === 'bradesco') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#CC0000" />
        <path d="M20,11 C16,11 13,15 13,19 L27,19 C27,15 24,11 20,11 Z" fill="#FFFFFF" />
        <rect x="18.5" y="19" width="3" height="10" fill="#FFFFFF" />
        <circle cx="20" cy="14" r="1.8" fill="#CC0000" />
        <circle cx="16" cy="18" r="1.8" fill="#CC0000" />
        <circle cx="24" cy="18" r="1.8" fill="#CC0000" />
      </svg>
    );
  }
  if (id === 'bb') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FAF000" />
        <path d="M13,15 L13,25 L23,25 M27,25 L27,15 L17,15" stroke="#002E7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (id === 'santander') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#EC0000" />
        <path d="M20,11 C20,11 24,15 24,19 C24,23 20,26 20,26 C20,26 16,23 16,19 C16,15 20,11 20,11 Z" fill="#FFFFFF" />
        <path d="M20,15 C20,15 22,18 22,20 C22,22 20,24 20,24 C20,24 18,22 18,20 C18,18 20,15 20,15 Z" fill="#EC0000" />
      </svg>
    );
  }
  if (id === 'caixa') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#005CA9" />
        <text x="17" y="26" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="18" textAnchor="middle">X</text>
        <path d="M24,12 L30,12 L30,20 L24,20 Z" fill="#F47A20" />
      </svg>
    );
  }
  if (id === 'c6') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#1E1E1E" />
        {/* C6 symbol from the bank's vector wordmark; see bank-logo-sources.md. */}
        <path transform="translate(6 12.45) scale(.63)" fill="#FFFFFF" d="M15.034 16.045c.778-.681 1.285-1.576 1.524-2.684h7.68c-.352 3.167-1.627 5.731-3.824 7.694C18.216 23.018 15.51 24 12.298 24c-2.343 0-4.452-.515-6.328-1.544-1.876-1.029-3.34-2.459-4.392-4.29C.526 16.335 0 14.28 0 12c0-2.28.526-4.335 1.578-6.166C2.63 4.003 4.094 2.573 5.97 1.544 7.846.514 9.955 0 12.298 0c3.161 0 5.83.947 8.007 2.842 2.176 1.894 3.462 4.377 3.855 7.448H16.59c-.321-1.013-.87-1.828-1.648-2.446-.777-.617-1.648-.926-2.612-.926-1.327 0-2.397.467-3.21 1.401-.815.934-1.221 2.161-1.221 3.68 0 1.51.41 2.732 1.228 3.666.82.934 1.886 1.4 3.203 1.4 1.026 0 1.928-.34 2.705-1.02zm27.26-6.24c1.491 1.43 2.237 3.28 2.237 5.547 0 2.592-.858 4.682-2.575 6.268-1.718 1.587-3.98 2.38-6.79 2.38-2.776 0-5.033-.796-6.772-2.388-1.74-1.593-2.609-3.656-2.609-6.193 0-1.385.239-2.779.716-4.181.477-1.402 1.215-2.936 2.214-4.6l3.53-5.87 7.46-.001-4.177 6.926c.417-.022.746-.033.988-.033 2.359 0 4.284.715 5.777 2.145zm-5.037 7.675c.537-.547.806-1.256.806-2.128 0-.871-.269-1.586-.806-2.145-.538-.559-1.235-.838-2.09-.838-.856 0-1.554.28-2.09.838-.539.559-.807 1.274-.807 2.145 0 .872.268 1.581.806 2.128.537.548 1.235.822 2.09.822.856 0 1.553-.274 2.09-.822z" />
      </svg>
    );
  }
  if (id === 'inter') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FF7A00" />
        <text x="20" y="25" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="13" textAnchor="middle">IN</text>
      </svg>
    );
  }
  if (id === 'btg') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#081C3B" />
        <path d="M12,25 L20,13 L28,25 Z M16,23 L24,23 L20,17 Z" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (id === 'xp') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#000000" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="14" textAnchor="middle">xp</text>
      </svg>
    );
  }
  if (id === 'neon') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00E5FF" />
        <text x="20" y="25.5" fill="#00375B" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">N</text>
      </svg>
    );
  }
  if (id === 'next') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00FF5F" />
        <text x="20" y="25" fill="#000000" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">n</text>
      </svg>
    );
  }
  if (id === 'bmg') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FF6C00" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="9" textAnchor="middle">BMG</text>
      </svg>
    );
  }
  if (id === 'banrisul') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00519E" />
        <path d="M15,15 L25,15 L25,25" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M25,25 L15,25 L15,15" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      </svg>
    );
  }
  if (id === 'sicoob') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00363A" />
        <circle cx="20" cy="20" r="5" fill="#81C784" />
        <circle cx="20" cy="12" r="3" fill="#FFF176" />
        <circle cx="20" cy="28" r="3" fill="#FFF176" />
        <circle cx="12" cy="20" r="3" fill="#FFF176" />
        <circle cx="28" cy="20" r="3" fill="#FFF176" />
      </svg>
    );
  }
  if (id === 'sicredi') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#339933" />
        <path d="M20,12 C16,16 16,22 20,28 C24,22 24,16 20,12 Z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (id === 'stone') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00A859" />
        <text x="20" y="26.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="18" textAnchor="middle">S</text>
      </svg>
    );
  }
  if (id === 'pagbank') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#006B75" />
        <path d="M12,15 L28,15 L28,25 L12,25 Z" fill="#FFCC00" />
        <text x="20" y="22" fill="#006B75" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">PAG</text>
      </svg>
    );
  }
  if (id === 'picpay') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#11C76F" />
        <text x="20" y="27.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="18" textAnchor="middle">P</text>
      </svg>
    );
  }
  if (id === 'mercadopago') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00A6FF" />
        <path d="M13,22 C13,22 16,17 20,17 C24,17 27,22 27,22 M16,19 C16,19 18,22 20,22 C22,22 24,19 24,19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (id === 'will') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FFE600" />
        <text x="20" y="26.5" fill="#000000" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="18" textAnchor="middle">w</text>
      </svg>
    );
  }
  if (id === 'ame') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FF007A" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="13" textAnchor="middle">ame</text>
      </svg>
    );
  }
  if (id === 'agibank') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#E6007E" />
        <text x="20" y="24.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="12" textAnchor="middle">ag:</text>
      </svg>
    );
  }
  if (id === 'safra') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#0C2340" />
        <rect x="12" y="12" width="16" height="16" rx="2" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
        <text x="20" y="23" fill="#D4AF37" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">S</text>
      </svg>
    );
  }
  if (id === 'digio') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#003399" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">digio</text>
      </svg>
    );
  }
  if (id === 'trigg') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00D2C4" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">Trigg</text>
      </svg>
    );
  }
  if (id === 'alelo') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#007D4A" />
        <circle cx="20" cy="20" r="8" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <circle cx="18" cy="18" r="3" fill="#FFFFFF" />
      </svg>
    );
  }
  if (id === 'caixatem') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#40C4FF" />
        <rect x="12" y="14" width="16" height="12" rx="3" fill="#FFFFFF" />
        <polygon points="16,26 20,26 18,29" fill="#FFFFFF" />
      </svg>
    );
  }
  if (id === 'paypal') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#003087" />
        <text x="17" y="25" fill="#0079C1" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" fontStyle="italic">P</text>
        <text x="21" y="27" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" fontStyle="italic">P</text>
      </svg>
    );
  }
  if (id === 'binance') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#1E1E1E" />
        <polygon points="20,12 28,20 20,28 12,20" stroke="#F3BA2F" strokeWidth="2" fill="none" />
        <polygon points="20,16 24,20 20,24 16,20" fill="#F3BA2F" />
      </svg>
    );
  }
  if (id === 'pan') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00A3E0" />
        <text x="20" y="26" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">pan</text>
      </svg>
    );
  }
  if (id === 'bari') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#0A0A0A" />
        <text x="20" y="24.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="9" textAnchor="middle">bari.</text>
      </svg>
    );
  }
  if (id === 'bv') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FF5500" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="13" textAnchor="middle">bv</text>
      </svg>
    );
  }
  if (id === 'original') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00953B" />
        <circle cx="20" cy="20" r="8" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
      </svg>
    );
  }
  if (id === 'sofisa') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#003DA5" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="9" textAnchor="middle">sofisa</text>
      </svg>
    );
  }
  if (id === 'daycoval') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#004B87" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">D</text>
      </svg>
    );
  }
  if (id === 'modalmais') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#0F0F0F" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="15" textAnchor="middle">M</text>
      </svg>
    );
  }
  if (id === 'rico') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FF4400" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="9" textAnchor="middle">rico</text>
      </svg>
    );
  }
  if (id === 'clear') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#00B37E" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">clear</text>
      </svg>
    );
  }
  if (id === 'genial') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#6B2FBF" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">G</text>
      </svg>
    );
  }
  if (id === 'toro') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#FF6600" />
        <path d="M13,17 C15,13 18,13 20,15 C22,13 25,13 27,17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <text x="20" y="27" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">toro</text>
      </svg>
    );
  }
  if (id === 'superdigital') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#6200EE" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">S</text>
      </svg>
    );
  }
  if (id === 'bs2') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#0F2C59" />
        <text x="20" y="24.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="11" textAnchor="middle">BS2</text>
      </svg>
    );
  }
  if (id === 'cresol') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#006838" />
        <path d="M20,12 C16,16 16,22 20,28 C24,22 24,16 20,12 Z" fill="#FFF176" />
      </svg>
    );
  }
  if (id === 'nomad') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#131316" />
        <text x="20" y="25.5" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">N</text>
      </svg>
    );
  }
  if (id === 'wise') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#9FE870" />
        <text x="20" y="25" fill="#0E1113" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="14" textAnchor="middle">W</text>
      </svg>
    );
  }
  if (id === 'inbursa') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#7A1F2B" />
        <text x="20" y="24" fill="#FFFFFF" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="8" textAnchor="middle">inbursa</text>
      </svg>
    );
  }
  if (id === 'dinheiro') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#4EBE87" />
        <text x="20" y="26" fontSize="16" textAnchor="middle">💵</text>
      </svg>
    );
  }
  if (id === 'investimento') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#26C6DA" />
        <text x="20" y="26" fontSize="16" textAnchor="middle">📈</text>
      </svg>
    );
  }
  if (id === 'bank') {
    // Ícone genérico de banco/agência (prédio com colunas) — usado como
    // opção "padrão" de Conta, diferente do fallback genérico de cartão.
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="20" fill="#2C2F36" />
        <path d="M20,10 L30,16.5 L10,16.5 Z" fill="none" stroke="#6F768E" strokeWidth="2" strokeLinejoin="round" />
        <line x1="13" y1="19" x2="13" y2="27" stroke="#6F768E" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="19" x2="18" y2="27" stroke="#6F768E" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="19" x2="22" y2="27" stroke="#6F768E" strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="19" x2="27" y2="27" stroke="#6F768E" strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="29" x2="31" y2="29" stroke="#6F768E" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Default fallback (generic bank card logo)
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="20" fill="#2C2F36" />
      <rect x="11" y="14" width="18" height="12" rx="2" stroke="#6F768E" strokeWidth="2" fill="none" />
      <line x1="11" y1="18" x2="29" y2="18" stroke="#6F768E" strokeWidth="2" />
    </svg>
  );
};
