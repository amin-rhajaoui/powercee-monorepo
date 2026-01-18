import { useState } from 'react';
import { useRouter } from 'expo-router';

export function useStepNavigation() {
    const router = useRouter();
    const [isNavigating, setIsNavigating] = useState(false);

    /**
     * Executes a save action and navigates to the next route using the returned ID
     * @param saveAction - Function that saves data and returns an object with an 'id' property (e.g. ModuleDraft)
     * @param routeBuilder - Function that takes the draftId and returns the destination route path
     */
    const navigate = async <T extends { id: string }>(
        saveAction: () => Promise<T>,
        routeBuilder: (draftId: string) => string,
        action: 'push' | 'replace' = 'push'
    ) => {
        setIsNavigating(true);
        try {
            const result = await saveAction();
            if (result && result.id) {
                if (action === 'replace') {
                    router.replace(routeBuilder(result.id) as any);
                } else {
                    router.push(routeBuilder(result.id) as any);
                }
            }
        } catch (error) {
            console.error('Navigation error:', error);
            // Error is logged but not re-thrown to avoid crashing UI, 
            // relying on saveAction to handle/alert specific errors if needed.
        } finally {
            setIsNavigating(false);
        }
    };

    return {
        isNavigating,
        navigate,
    };
}
