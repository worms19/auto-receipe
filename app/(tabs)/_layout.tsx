import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0ea5e9',
      headerShown: true,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Recipes',
          headerTitle: 'WeChef',
        }}
      />
    </Tabs>
  );
}
