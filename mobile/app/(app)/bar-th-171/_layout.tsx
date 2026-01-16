import { Stack } from 'expo-router';
import { lightColors } from '@/lib/colors';

export default function BarTh171Layout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: lightColors.background,
                },
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                contentStyle: {
                    backgroundColor: lightColors.background,
                },
                headerShown: false, // We will use custom headers/progress bars in steps
            }}
        />
    );
}
