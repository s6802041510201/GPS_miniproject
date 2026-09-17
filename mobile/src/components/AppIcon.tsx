import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { colors } from '@/theme';

export type IconName =
  | 'analytics'
  | 'back'
  | 'calendar'
  | 'cancel'
  | 'check'
  | 'chevronDown'
  | 'close'
  | 'dashboard'
  | 'delete'
  | 'edit'
  | 'history'
  | 'home'
  | 'location'
  | 'lock'
  | 'login'
  | 'logout'
  | 'map'
  | 'menu'
  | 'plus'
  | 'profile'
  | 'refresh'
  | 'rooms'
  | 'save'
  | 'sessions'
  | 'settings'
  | 'students';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: SymbolViewProps['weight'];
};

type IconDefinition = NonNullable<SymbolViewProps['name']>;

// Keep one semantic icon map for every platform. SF Symbols are used on iOS,
// while expo-symbols resolves the matching Material symbol on Android/Web.
const icons: Record<IconName, IconDefinition> = {
  analytics: { ios: 'chart.pie.fill', android: 'analytics', web: 'analytics' },
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  cancel: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  dashboard: { ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  login: { ios: 'arrow.right.circle.fill', android: 'login', web: 'login' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  profile: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  rooms: { ios: 'building.2.fill', android: 'domain', web: 'domain' },
  save: { ios: 'checkmark.circle', android: 'save', web: 'save' },
  sessions: { ios: 'calendar.badge.clock', android: 'event_note', web: 'event_note' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  students: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
};

export function AppIcon({ name, size = 22, color = colors.accentDark, weight = 'semibold' }: Props) {
  return (
    <SymbolView
      name={icons[name]}
      resizeMode="scaleAspectFit"
      size={size}
      tintColor={color}
      weight={weight}
    />
  );
}
