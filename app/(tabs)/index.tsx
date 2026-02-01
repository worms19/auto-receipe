import { StyleSheet, Text, View } from 'react-native';

export default function RecipeList() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WeChef</Text>
      <Text style={styles.subtitle}>Your recipes will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
});
