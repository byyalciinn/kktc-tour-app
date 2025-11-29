import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

// KKTC Tour App - Primary color: #F03A52
const PRIMARY_COLOR = '#F03A52';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={PRIMARY_COLOR}
    >
      {/* Home Tab */}
      <NativeTabs.Trigger name="index">
        <Label>{t('tabs.home')}</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          default: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="home" />}
            />
          ),
        })}
      </NativeTabs.Trigger>

      {/* Explore Tab */}
      <NativeTabs.Trigger name="explore">
        <Label>{t('tabs.explore')}</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'safari', selected: 'safari.fill' }} />,
          default: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="explore" />}
            />
          ),
        })}
      </NativeTabs.Trigger>

      {/* Favorites Tab */}
      <NativeTabs.Trigger name="favorites">
        <Label>{t('tabs.favorites')}</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'heart', selected: 'heart.fill' }} />,
          default: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="favorite" />}
            />
          ),
        })}
      </NativeTabs.Trigger>

      {/* Profile Tab */}
      <NativeTabs.Trigger name="profile">
        <Label>{t('tabs.profile')}</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'person', selected: 'person.fill' }} />,
          default: (
            <Icon
              src={<VectorIcon family={MaterialIcons} name="person" />}
            />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
