import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
        }}
      />
    </Tabs>
  );
}
