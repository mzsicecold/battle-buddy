import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Service</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shield.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="finances">
        <NativeTabs.Trigger.Label>Finances</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dollarsign.circle.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="help">
        <NativeTabs.Trigger.Label>Help</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="cross.case.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="resilience">
        <NativeTabs.Trigger.Label>Resilience</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="leaf.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="departure">
        <NativeTabs.Trigger.Label>Departure</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="door.left.hand.open" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="documents">
        <NativeTabs.Trigger.Label>Documents</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
