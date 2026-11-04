import React from 'react';
import {
  // Alimentação
  Restaurant, LocalCafe, LocalPizza, LocalBar, Fastfood, Icecream, LocalGroceryStore,
  LunchDining, BakeryDining, RamenDining, Cake, WineBar, EggAlt, Grass, DeliveryDining,
  // Casa / Moradia
  Home, Apartment, Chair, Weekend, Yard, Plumbing, ElectricalServices,
  CleaningServices, HomeRepairService, Bathtub, Bolt, LocalLaundryService,
  WaterDrop, LocalFireDepartment, Kitchen, Phone,
  // Transporte
  DirectionsCar, DirectionsBus, DirectionsBike, Train, Flight, LocalTaxi,
  TwoWheeler, LocalGasStation, EvStation, Commute, DirectionsRun, DirectionsBoat,
  LocalParking, Toll, LocalCarWash, Build,
  // Saúde
  LocalHospital, MedicalServices, Medication, Vaccines, FitnessCenter, Spa,
  MonitorHeart, Healing, Psychology, Visibility,
  // Educação
  School, MenuBook, LibraryBooks, Science, Calculate, AutoStories, EmojiObjects,
  OndemandVideo, Translate,
  // Trabalho / Negócios
  Business, Work, BusinessCenter, Store, Storefront, Engineering, Handyman, Construction,
  MoreTime, WorkOff,
  // Lazer / Entretenimento
  SportsEsports, Tv, Movie, MusicNote, TheaterComedy, SportsSoccer, SportsBasketball,
  Casino, Nightlife, Attractions, Festival, Headphones,
  // Tecnologia
  DesktopWindows, Laptop, PhoneIphone, Wifi, Cloud, Router, Memory, Devices, Print,
  Apps, Code,
  // Financeiro / Investimentos
  AccountBalance, ShowChart, AttachMoney, Savings, CreditCard, Paid, MonetizationOn,
  TrendingUp, TrendingDown, RequestQuote, Receipt, ReceiptLong, Payments,
  CurrencyExchange, PriceCheck, Percent, AccountBalanceWallet,
  Sell, SwapHoriz, AssignmentReturn, CallReceived, CardGiftcard, Loyalty,
  // Família / Pessoas
  People, ChildCare, FamilyRestroom, Groups, Pets, Face, Cake as BirthdayIcon,
  Toys, Elderly,
  // Compras / Vestuário
  ShoppingBag, Checkroom, Diamond, Redeem, LocalMall, Style, ShoppingCart, Watch,
  // Viagem
  Luggage, BeachAccess, Hotel, Map, CardTravel, Explore, Public,
  // Assinaturas / Serviços
  Subscriptions, LiveTv, VideogameAsset, Newspaper, Podcasts, CloudQueue,
  // Doações / Presentes
  VolunteerActivism, Favorite, EmojiEvents,
  // Seguros / Proteção
  Security, Shield, GppGood, HealthAndSafety, Gavel,
  // Beleza / Cuidado pessoal
  ContentCut, Face3, Brush,
  // Outros / Genérico
  Help, Category, MoreHoriz, Star, Label, QuestionMark, Inventory2, ReportProblem, Description,
} from '@mui/icons-material';
import type { SvgIconProps } from '@mui/material';

type IconComponent = React.ComponentType<SvgIconProps>;

interface CategoryIconOption {
  value: string;
  label: string;
  Icon: IconComponent;
}

interface CategoryIconGroup {
  group: string;
  icons: CategoryIconOption[];
}

// Catálogo de ícones para Categorias/Subcategorias, agrupado por tema. Os
// `value` dos itens originais (RestaurantIcon, TvIcon, CardIcon, RunIcon,
// SchoolIcon, BusinessIcon, DesktopIcon, PeopleIcon, ChartIcon, GameIcon,
// HomeIcon, AccountBalanceIcon, HelpIcon) são preservados para não quebrar
// categorias já salvas.
export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  {
    group: 'Alimentação',
    icons: [
      { value: 'RestaurantIcon', label: 'Alimentação / Delivery', Icon: Restaurant },
      { value: 'LocalCafeIcon', label: 'Café', Icon: LocalCafe },
      { value: 'LocalPizzaIcon', label: 'Pizza', Icon: LocalPizza },
      { value: 'LocalBarIcon', label: 'Bar / Drinks', Icon: LocalBar },
      { value: 'FastfoodIcon', label: 'Fast Food', Icon: Fastfood },
      { value: 'IcecreamIcon', label: 'Sorvete', Icon: Icecream },
      { value: 'LocalGroceryStoreIcon', label: 'Mercado', Icon: LocalGroceryStore },
      { value: 'LunchDiningIcon', label: 'Almoço', Icon: LunchDining },
      { value: 'BakeryDiningIcon', label: 'Padaria', Icon: BakeryDining },
      { value: 'RamenDiningIcon', label: 'Comida Japonesa', Icon: RamenDining },
      { value: 'CakeIcon', label: 'Doces / Confeitaria', Icon: Cake },
      { value: 'WineBarIcon', label: 'Vinho', Icon: WineBar },
      { value: 'EggAltIcon', label: 'Café da Manhã', Icon: EggAlt },
      { value: 'GrassIcon', label: 'Feira / Hortifruti', Icon: Grass },
      { value: 'DeliveryDiningIcon', label: 'Delivery', Icon: DeliveryDining },
    ],
  },
  {
    group: 'Casa / Moradia',
    icons: [
      { value: 'HomeIcon', label: 'Casa / Moradia', Icon: Home },
      { value: 'ApartmentIcon', label: 'Apartamento / Aluguel', Icon: Apartment },
      { value: 'ChairIcon', label: 'Móveis', Icon: Chair },
      { value: 'WeekendIcon', label: 'Sofá / Decoração', Icon: Weekend },
      { value: 'YardIcon', label: 'Jardim / Quintal', Icon: Yard },
      { value: 'PlumbingIcon', label: 'Encanamento', Icon: Plumbing },
      { value: 'ElectricalServicesIcon', label: 'Elétrica', Icon: ElectricalServices },
      { value: 'CleaningServicesIcon', label: 'Limpeza', Icon: CleaningServices },
      { value: 'HomeRepairServiceIcon', label: 'Manutenção', Icon: HomeRepairService },
      { value: 'BathtubIcon', label: 'Banheiro', Icon: Bathtub },
      { value: 'BoltIcon', label: 'Energia / Luz', Icon: Bolt },
      { value: 'LocalLaundryServiceIcon', label: 'Lavanderia', Icon: LocalLaundryService },
      { value: 'WaterDropIcon', label: 'Água', Icon: WaterDrop },
      { value: 'LocalFireDepartmentIcon', label: 'Gás', Icon: LocalFireDepartment },
      { value: 'KitchenIcon', label: 'Eletrodomésticos', Icon: Kitchen },
      { value: 'PhoneIcon', label: 'Telefone', Icon: Phone },
    ],
  },
  {
    group: 'Transporte',
    icons: [
      { value: 'DirectionsCarIcon', label: 'Carro', Icon: DirectionsCar },
      { value: 'DirectionsBusIcon', label: 'Ônibus', Icon: DirectionsBus },
      { value: 'DirectionsBikeIcon', label: 'Bicicleta', Icon: DirectionsBike },
      { value: 'TrainIcon', label: 'Trem / Metrô', Icon: Train },
      { value: 'FlightIcon', label: 'Avião', Icon: Flight },
      { value: 'LocalTaxiIcon', label: 'Táxi / App', Icon: LocalTaxi },
      { value: 'TwoWheelerIcon', label: 'Moto', Icon: TwoWheeler },
      { value: 'LocalGasStationIcon', label: 'Combustível', Icon: LocalGasStation },
      { value: 'EvStationIcon', label: 'Carro Elétrico', Icon: EvStation },
      { value: 'CommuteIcon', label: 'Deslocamento', Icon: Commute },
      { value: 'RunIcon', label: 'Reembolsos / Corrida', Icon: DirectionsRun },
      { value: 'DirectionsBoatIcon', label: 'Barco', Icon: DirectionsBoat },
      { value: 'LocalParkingIcon', label: 'Estacionamento', Icon: LocalParking },
      { value: 'TollIcon', label: 'Pedágio', Icon: Toll },
      { value: 'LocalCarWashIcon', label: 'Lavagem', Icon: LocalCarWash },
      { value: 'BuildIcon', label: 'Manutenção de Veículo', Icon: Build },
    ],
  },
  {
    group: 'Saúde',
    icons: [
      { value: 'LocalHospitalIcon', label: 'Hospital', Icon: LocalHospital },
      { value: 'MedicalServicesIcon', label: 'Consultas', Icon: MedicalServices },
      { value: 'MedicationIcon', label: 'Farmácia / Remédios', Icon: Medication },
      { value: 'VaccinesIcon', label: 'Vacinas', Icon: Vaccines },
      { value: 'FitnessCenterIcon', label: 'Academia', Icon: FitnessCenter },
      { value: 'SpaIcon', label: 'Bem-estar', Icon: Spa },
      { value: 'MonitorHeartIcon', label: 'Exames', Icon: MonitorHeart },
      { value: 'HealingIcon', label: 'Tratamentos', Icon: Healing },
      { value: 'PsychologyIcon', label: 'Terapia / Psicologia', Icon: Psychology },
      { value: 'VisibilityIcon', label: 'Oftalmologia', Icon: Visibility },
    ],
  },
  {
    group: 'Educação',
    icons: [
      { value: 'SchoolIcon', label: 'Educação / Cursos', Icon: School },
      { value: 'MenuBookIcon', label: 'Livros', Icon: MenuBook },
      { value: 'LibraryBooksIcon', label: 'Biblioteca', Icon: LibraryBooks },
      { value: 'ScienceIcon', label: 'Ciências', Icon: Science },
      { value: 'CalculateIcon', label: 'Matemática', Icon: Calculate },
      { value: 'AutoStoriesIcon', label: 'Material Didático', Icon: AutoStories },
      { value: 'EmojiObjectsIcon', label: 'Ideias / Aprendizado', Icon: EmojiObjects },
      { value: 'OndemandVideoIcon', label: 'Cursos Online', Icon: OndemandVideo },
      { value: 'TranslateIcon', label: 'Idiomas', Icon: Translate },
    ],
  },
  {
    group: 'Trabalho / Negócios',
    icons: [
      { value: 'BusinessIcon', label: 'Trabalho / Negócios', Icon: Business },
      { value: 'WorkIcon', label: 'Emprego', Icon: Work },
      { value: 'BusinessCenterIcon', label: 'Escritório', Icon: BusinessCenter },
      { value: 'StoreIcon', label: 'Loja', Icon: Store },
      { value: 'StorefrontIcon', label: 'Comércio', Icon: Storefront },
      { value: 'EngineeringIcon', label: 'Serviços Técnicos', Icon: Engineering },
      { value: 'HandymanIcon', label: 'Reparos', Icon: Handyman },
      { value: 'ConstructionIcon', label: 'Construção / Reforma', Icon: Construction },
      { value: 'MoreTimeIcon', label: 'Hora Extra', Icon: MoreTime },
      { value: 'WorkOffIcon', label: 'Rescisão', Icon: WorkOff },
    ],
  },
  {
    group: 'Lazer / Entretenimento',
    icons: [
      { value: 'GameIcon', label: 'Jogos / Entretenimento', Icon: SportsEsports },
      { value: 'TvIcon', label: 'Assinaturas / Lazer', Icon: Tv },
      { value: 'MovieIcon', label: 'Cinema', Icon: Movie },
      { value: 'MusicNoteIcon', label: 'Música', Icon: MusicNote },
      { value: 'TheaterComedyIcon', label: 'Teatro / Shows', Icon: TheaterComedy },
      { value: 'SportsSoccerIcon', label: 'Futebol', Icon: SportsSoccer },
      { value: 'SportsBasketballIcon', label: 'Esportes', Icon: SportsBasketball },
      { value: 'CasinoIcon', label: 'Jogos de Azar', Icon: Casino },
      { value: 'NightlifeIcon', label: 'Vida Noturna', Icon: Nightlife },
      { value: 'AttractionsIcon', label: 'Parques', Icon: Attractions },
      { value: 'FestivalIcon', label: 'Festas / Eventos', Icon: Festival },
      { value: 'HeadphonesIcon', label: 'Podcasts / Áudio', Icon: Headphones },
    ],
  },
  {
    group: 'Tecnologia',
    icons: [
      { value: 'DesktopIcon', label: 'Tecnologia / Escritório', Icon: DesktopWindows },
      { value: 'LaptopIcon', label: 'Notebook', Icon: Laptop },
      { value: 'PhoneIphoneIcon', label: 'Celular', Icon: PhoneIphone },
      { value: 'WifiIcon', label: 'Internet', Icon: Wifi },
      { value: 'CloudIcon', label: 'Nuvem', Icon: Cloud },
      { value: 'RouterIcon', label: 'Roteador', Icon: Router },
      { value: 'MemoryIcon', label: 'Hardware', Icon: Memory },
      { value: 'DevicesIcon', label: 'Dispositivos', Icon: Devices },
      { value: 'PrintIcon', label: 'Impressão', Icon: Print },
      { value: 'AppsIcon', label: 'Aplicativos', Icon: Apps },
      { value: 'CodeIcon', label: 'Software', Icon: Code },
    ],
  },
  {
    group: 'Financeiro / Investimentos',
    icons: [
      { value: 'AccountBalanceIcon', label: 'Banco / Conta Corrente', Icon: AccountBalance },
      { value: 'ChartIcon', label: 'Investimentos', Icon: ShowChart },
      { value: 'AttachMoneyIcon', label: 'Dinheiro', Icon: AttachMoney },
      { value: 'SavingsIcon', label: 'Poupança', Icon: Savings },
      { value: 'CardIcon', label: 'Cartões / Crédito', Icon: CreditCard },
      { value: 'PaidIcon', label: 'Pagamentos', Icon: Paid },
      { value: 'MonetizationOnIcon', label: 'Renda', Icon: MonetizationOn },
      { value: 'TrendingUpIcon', label: 'Alta', Icon: TrendingUp },
      { value: 'TrendingDownIcon', label: 'Queda', Icon: TrendingDown },
      { value: 'RequestQuoteIcon', label: 'Cotação / Orçamento', Icon: RequestQuote },
      { value: 'ReceiptIcon', label: 'Recibo', Icon: Receipt },
      { value: 'ReceiptLongIcon', label: 'Nota Fiscal', Icon: ReceiptLong },
      { value: 'PaymentsIcon', label: 'Faturas', Icon: Payments },
      { value: 'CurrencyExchangeIcon', label: 'Câmbio', Icon: CurrencyExchange },
      { value: 'PriceCheckIcon', label: 'Descontos', Icon: PriceCheck },
      { value: 'PercentIcon', label: 'Taxas / Juros', Icon: Percent },
      { value: 'AccountBalanceWalletIcon', label: 'Carteira', Icon: AccountBalanceWallet },
      { value: 'SellIcon', label: 'Venda', Icon: Sell },
      { value: 'SwapHorizIcon', label: 'Transferência', Icon: SwapHoriz },
      { value: 'AssignmentReturnIcon', label: 'Devolução', Icon: AssignmentReturn },
      { value: 'CallReceivedIcon', label: 'Recebimento', Icon: CallReceived },
      { value: 'CardGiftcardIcon', label: 'Outras Receitas', Icon: CardGiftcard },
      { value: 'LoyaltyIcon', label: 'Cashback', Icon: Loyalty },
    ],
  },
  {
    group: 'Família / Pessoas',
    icons: [
      { value: 'PeopleIcon', label: 'Família / Filhos', Icon: People },
      { value: 'ChildCareIcon', label: 'Crianças', Icon: ChildCare },
      { value: 'FamilyRestroomIcon', label: 'Família', Icon: FamilyRestroom },
      { value: 'GroupsIcon', label: 'Amigos / Grupos', Icon: Groups },
      { value: 'PetsIcon', label: 'Pets', Icon: Pets },
      { value: 'FaceIcon', label: 'Pessoal', Icon: Face },
      { value: 'BirthdayIcon', label: 'Aniversário', Icon: BirthdayIcon },
      { value: 'ToysIcon', label: 'Brinquedos', Icon: Toys },
      { value: 'ElderlyIcon', label: 'Pais / Idosos', Icon: Elderly },
    ],
  },
  {
    group: 'Compras / Vestuário',
    icons: [
      { value: 'ShoppingBagIcon', label: 'Compras', Icon: ShoppingBag },
      { value: 'CheckroomIcon', label: 'Roupas', Icon: Checkroom },
      { value: 'DiamondIcon', label: 'Joias', Icon: Diamond },
      { value: 'RedeemIcon', label: 'Presentes', Icon: Redeem },
      { value: 'LocalMallIcon', label: 'Shopping', Icon: LocalMall },
      { value: 'StyleIcon', label: 'Moda', Icon: Style },
      { value: 'ShoppingCartIcon', label: 'Carrinho de Compras', Icon: ShoppingCart },
      { value: 'WatchIcon', label: 'Acessórios', Icon: Watch },
    ],
  },
  {
    group: 'Viagem',
    icons: [
      { value: 'LuggageIcon', label: 'Bagagem', Icon: Luggage },
      { value: 'BeachAccessIcon', label: 'Praia', Icon: BeachAccess },
      { value: 'HotelIcon', label: 'Hospedagem', Icon: Hotel },
      { value: 'MapIcon', label: 'Roteiro', Icon: Map },
      { value: 'CardTravelIcon', label: 'Viagem a Trabalho', Icon: CardTravel },
      { value: 'ExploreIcon', label: 'Passeios', Icon: Explore },
      { value: 'PublicIcon', label: 'Internacional', Icon: Public },
    ],
  },
  {
    group: 'Assinaturas / Serviços',
    icons: [
      { value: 'SubscriptionsIcon', label: 'Assinaturas', Icon: Subscriptions },
      { value: 'LiveTvIcon', label: 'Streaming', Icon: LiveTv },
      { value: 'VideogameAssetIcon', label: 'Jogos Online', Icon: VideogameAsset },
      { value: 'NewspaperIcon', label: 'Jornais / Revistas', Icon: Newspaper },
      { value: 'PodcastsIcon', label: 'Podcasts', Icon: Podcasts },
      { value: 'CloudQueueIcon', label: 'Armazenamento em Nuvem', Icon: CloudQueue },
    ],
  },
  {
    group: 'Doações / Presentes',
    icons: [
      { value: 'VolunteerActivismIcon', label: 'Doações', Icon: VolunteerActivism },
      { value: 'FavoriteIcon', label: 'Causas', Icon: Favorite },
      { value: 'EmojiEventsIcon', label: 'Premiações', Icon: EmojiEvents },
    ],
  },
  {
    group: 'Seguros / Proteção',
    icons: [
      { value: 'SecurityIcon', label: 'Segurança', Icon: Security },
      { value: 'ShieldIcon', label: 'Seguro', Icon: Shield },
      { value: 'GppGoodIcon', label: 'Proteção', Icon: GppGood },
      { value: 'HealthAndSafetyIcon', label: 'Seguro Saúde', Icon: HealthAndSafety },
      { value: 'GavelIcon', label: 'Impostos / Jurídico', Icon: Gavel },
    ],
  },
  {
    group: 'Beleza / Cuidado pessoal',
    icons: [
      { value: 'ContentCutIcon', label: 'Cabelo / Barbearia', Icon: ContentCut },
      { value: 'Face3Icon', label: 'Estética', Icon: Face3 },
      { value: 'BrushIcon', label: 'Maquiagem', Icon: Brush },
    ],
  },
  {
    group: 'Outros',
    icons: [
      { value: 'HelpIcon', label: 'Outros / Geral', Icon: Help },
      { value: 'CategoryIcon', label: 'Categoria Genérica', Icon: Category },
      { value: 'MoreHorizIcon', label: 'Diversos', Icon: MoreHoriz },
      { value: 'StarIcon', label: 'Favoritos', Icon: Star },
      { value: 'LabelIcon', label: 'Etiqueta', Icon: Label },
      { value: 'QuestionMarkIcon', label: 'Não categorizado', Icon: QuestionMark },
      { value: 'Inventory2Icon', label: 'Diversos / Outros', Icon: Inventory2 },
      { value: 'ReportProblemIcon', label: 'Multas', Icon: ReportProblem },
      { value: 'DescriptionIcon', label: 'Documentação', Icon: Description },
    ],
  },
];

const ICON_MAP: Record<string, IconComponent> = CATEGORY_ICON_GROUPS.reduce((acc, group) => {
  group.icons.forEach(({ value, Icon }) => {
    acc[value] = Icon;
  });
  return acc;
}, {} as Record<string, IconComponent>);

// Aliases usados historicamente (dados salvos antes deste catálogo existir).
const ICON_ALIASES: Record<string, string> = {
  ShowChartIcon: 'ChartIcon',
  AccountBalance: 'AccountBalanceIcon',
};

export const getCategoryIcon = (iconName?: string, catName: string = '') => {
  if (iconName) {
    const resolved = ICON_ALIASES[iconName] || iconName;
    const Icon = ICON_MAP[resolved];
    if (Icon) return <Icon fontSize="small" />;
  }

  const n = catName.toLowerCase();
  if (n.includes('alimentação') || n.includes('delivery')) return <Restaurant fontSize="small" />;
  if (n.includes('assinatura')) return <Tv fontSize="small" />;
  if (n.includes('cartão') || n.includes('crédito')) return <CreditCard fontSize="small" />;
  if (n.includes('reembolsável') || n.includes('reembolso')) return <DirectionsRun fontSize="small" />;
  if (n.includes('educação')) return <School fontSize="small" />;
  if (n.includes('empresa') || n.includes('trabalho')) return <Business fontSize="small" />;
  if (n.includes('escritório') || n.includes('papelaria')) return <DesktopWindows fontSize="small" />;
  if (n.includes('família')) return <People fontSize="small" />;
  if (n.includes('investimento')) return <ShowChart fontSize="small" />;
  if (n.includes('lazer') || n.includes('viagem')) return <SportsEsports fontSize="small" />;
  if (n.includes('casa') || n.includes('moradia')) return <Home fontSize="small" />;
  return <Help fontSize="small" />;
};
