
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Edu Downloader
      </Text>

      <Text style={styles.subtitle}>
        Aplicativo iniciado com sucesso!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E5D3B',
  },

  subtitle: {
    fontSize: 16,
    marginTop: 10,
    color: '#555555',
  },
});
