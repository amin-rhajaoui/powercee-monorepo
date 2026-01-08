import { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function HomeScreen() {
  // Rediriger vers la page Modules par défaut
  return <Redirect href="/(app)/modules" />;
}
