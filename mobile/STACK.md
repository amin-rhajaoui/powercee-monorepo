# Stack Mobile PowerCEE

## 📦 Packages Installés

### UI
- **react-native-paper** : Composants Material Design prêts à l'emploi
- **react-native-vector-icons** : Icônes (inclus via Paper)

### Forms & Validation
- **react-hook-form** : Gestion de formulaires performante
- **zod** : Validation de schémas TypeScript
- **@hookform/resolvers** : Intégration zod avec react-hook-form

### Data & CRUD
- **@tanstack/react-query** : Gestion des requêtes, cache, mutations
- **axios** : Client HTTP avec intercepteurs

### Auth
- **expo-secure-store** : Stockage sécurisé du refresh token
- Access token stocké en mémoire avec renouvellement automatique

### Navigation
- **@react-navigation/native** : Navigation (déjà configuré avec expo-router)

## 🏗️ Architecture

### Structure des fichiers

```
mobile/
├── lib/
│   ├── api.ts          # Configuration axios + intercepteurs Bearer
│   ├── auth.ts         # Fonctions d'authentification (SecureStore)
│   ├── queryClient.ts  # Configuration React Query
│   └── theme.ts        # Thèmes Material Design (light/dark)
├── contexts/
│   └── AuthContext.tsx # Context d'authentification
├── hooks/
│   ├── useAuth.ts      # Hook d'authentification
│   └── useCrud.ts      # Hooks CRUD génériques
└── app/
    └── _layout.tsx     # Providers (QueryClient, Paper, Auth)
```

## 🚀 Utilisation

### Authentification

```tsx
import { useAuth } from '@/hooks/useAuth';

function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
      // Redirection automatique gérée par le layout
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Button onPress={handleLogin} loading={isLoading}>
      Se connecter
    </Button>
  );
}
```

### Formulaires avec react-hook-form + zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput, Button } from 'react-native-paper';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

type FormData = z.infer<typeof schema>;

function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <>
      <TextInput
        label="Email"
        {...register('email')}
        error={!!errors.email}
      />
      <TextInput
        label="Mot de passe"
        secureTextEntry
        {...register('password')}
        error={!!errors.password}
      />
      <Button onPress={handleSubmit(onSubmit)}>S'inscrire</Button>
    </>
  );
}
```

### CRUD avec React Query

#### Liste (GET)

```tsx
import { useList } from '@/hooks/useCrud';

function ClientsList() {
  const { data, isLoading, error } = useList(
    ['clients'],
    '/clients'
  );

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Erreur: {error.message}</Text>;

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

#### Détail (GET by ID)

```tsx
import { useDetail } from '@/hooks/useCrud';

function ClientDetail({ clientId }: { clientId: string }) {
  const { data, isLoading } = useDetail(
    ['clients', clientId],
    `/clients/${clientId}`
  );

  if (isLoading) return <ActivityIndicator />;

  return <Text>{data?.name}</Text>;
}
```

#### Création (POST)

```tsx
import { useCreate } from '@/hooks/useCrud';

function CreateClient() {
  const { mutate, isPending } = useCreate(
    ['clients'],
    '/clients'
  );

  const handleCreate = () => {
    mutate(
      { name: 'Nouveau client', email: 'client@example.com' },
      {
        onSuccess: () => {
          console.log('Client créé !');
        },
      }
    );
  };

  return (
    <Button onPress={handleCreate} loading={isPending}>
      Créer
    </Button>
  );
}
```

#### Mise à jour (PUT/PATCH)

```tsx
import { useUpdate, usePatch } from '@/hooks/useCrud';

function UpdateClient({ clientId }: { clientId: string }) {
  const { mutate } = useUpdate(['clients'], '/clients');
  // ou usePatch pour PATCH

  const handleUpdate = () => {
    mutate(
      { id: clientId, name: 'Nom modifié' },
      {
        onSuccess: () => {
          console.log('Client mis à jour !');
        },
      }
    );
  };

  return <Button onPress={handleUpdate}>Mettre à jour</Button>;
}
```

#### Suppression (DELETE)

```tsx
import { useDelete } from '@/hooks/useCrud';

function DeleteClient({ clientId }: { clientId: string }) {
  const { mutate } = useDelete(['clients'], '/clients');

  const handleDelete = () => {
    mutate(clientId, {
      onSuccess: () => {
        console.log('Client supprimé !');
      },
    });
  };

  return <Button onPress={handleDelete}>Supprimer</Button>;
}
```

### Utilisation directe de l'API

```tsx
import { api } from '@/lib/api';

// GET
const clients = await api.get<Client[]>('/clients');

// POST
const newClient = await api.post<Client>('/clients', {
  name: 'Nouveau client',
  email: 'client@example.com',
});

// PUT
const updated = await api.put<Client>(`/clients/${id}`, {
  name: 'Nom modifié',
});

// PATCH
const patched = await api.patch<Client>(`/clients/${id}`, {
  name: 'Nom partiel',
});

// DELETE
await api.delete(`/clients/${id}`);
```

## 🔐 Sécurité

### Authentification Bearer

- **Access token** : Stocké en mémoire, ajouté automatiquement aux requêtes via intercepteur
- **Refresh token** : Stocké dans `expo-secure-store` (chiffré)
- **Renouvellement automatique** : En cas d'erreur 401, le refresh token est utilisé automatiquement

### Configuration

L'URL de l'API est configurée via la variable d'environnement :
```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
```

## 🎨 Thème Material Design

Le thème est configuré dans `lib/theme.ts`. Pour utiliser le thème sombre :

```tsx
import { PaperProvider } from 'react-native-paper';
import { darkTheme } from '@/lib/theme';

<PaperProvider theme={darkTheme}>
  {/* Votre app */}
</PaperProvider>
```

## 📝 Notes

- Les tokens sont automatiquement gérés par les intercepteurs axios
- React Query invalide automatiquement les caches après mutations
- Les erreurs 401 déclenchent automatiquement un refresh du token
- Si le refresh échoue, l'utilisateur est déconnecté automatiquement
