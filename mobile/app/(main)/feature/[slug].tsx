import { useLocalSearchParams, useRouter } from 'expo-router';
import { FeatureRenderer } from '@/src/features/FeatureRenderer';

export default function FeatureScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  if (!slug) {
    return null;
  }

  return <FeatureRenderer slug={slug} onBack={() => router.back()} />;
}
