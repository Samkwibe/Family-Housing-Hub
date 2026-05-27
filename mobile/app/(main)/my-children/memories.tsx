import { useRouter } from 'expo-router';
import { FamilyMemoriesScreen } from '@/src/portals/shared/screens/FamilyMemoriesScreen';

export default function FamilyMemoriesRoute() {
  const router = useRouter();
  return <FamilyMemoriesScreen portal="parent" onClose={() => router.back()} />;
}
