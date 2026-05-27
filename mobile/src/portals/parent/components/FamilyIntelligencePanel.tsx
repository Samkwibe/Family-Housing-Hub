import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { familyTheme } from '@/src/portals/parent/theme';
import type { FamilyInsight, FamilyIntelligence, FamilySummaryCard } from '@/src/services/parentChildService';

type Props = {
  intelligence: FamilyIntelligence | null | undefined;
};

export function FamilyIntelligencePanel({
  intelligence }: Props) {
  if (!intelligence) return null;

  const score = intelligence.consistencyScore ?? 0;
  const cards = intelligence.summaryCards ?? [];
  const insights = intelligence.insights ?? [];

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#EDE9FE', '#FCE7F3']} style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreLabel}>Family consistency</Text>
            <Text style={styles.scoreHint}>{intelligence.consistencyLabel}</Text>
            {intelligence.headline ? (
              <Text style={styles.headline}>{intelligence.headline}</Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      {cards.length > 0 ? (
        <View style={styles.cardRow}>
          {cards.slice(0, 4).map((card) => (
            <SummaryCard key={card.id} card={card} />
          ))}
        </View>
      ) : null}

      {insights.length > 0 ? (
        <View style={styles.insightsBlock}>
          <Text style={styles.insightsTitle}>Family insights</Text>
          {insights.map((insight, index) => (
            <InsightRow key={insight.id} insight={insight} first={index === 0} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SummaryCard({ card }: { card: FamilySummaryCard }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniEmoji}>{card.emoji}</Text>
      <Text style={styles.miniValue}>{card.value}</Text>
      <Text style={styles.miniLabel}>{card.label}</Text>
      {card.hint ? <Text style={styles.miniHint} numberOfLines={1}>{card.hint}</Text> : null}
    </View>
  );
}

function InsightRow({ insight, first }: { insight: FamilyInsight; first?: boolean }) {
  return (
    <View style={[styles.insightRow, first && styles.insightRowFirst]}>
      <Text style={styles.insightEmoji}>{insight.emoji}</Text>
      <View style={styles.insightCopy}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightMessage}>{insight.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  scoreCard: { borderRadius: familyTheme.radius.lg, padding: familyTheme.spacing.lg, marginBottom: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontFamily: familyTheme.fonts.title, fontSize: 24, fontWeight: '700', color: familyTheme.colors.purpleDeep },
  scoreCopy: { flex: 1 },
  scoreLabel: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 14, color: familyTheme.colors.purpleDeep, textTransform: 'uppercase', letterSpacing: 0.6 },
  scoreHint: { fontFamily: familyTheme.fonts.title, fontSize: 17, fontWeight: '700', color: familyTheme.colors.ink, marginTop: 4 },
  headline: { fontFamily: familyTheme.fonts.body, fontSize: 14, color: familyTheme.colors.inkSoft, marginTop: 8, lineHeight: 20 },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  miniCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: familyTheme.colors.card,
    borderRadius: familyTheme.radius.md,
    padding: 12,
    ...familyTheme.shadow.card,
  },
  miniEmoji: { fontSize: 20 },
  miniValue: { fontFamily: familyTheme.fonts.title, fontSize: 16, fontWeight: '700', color: familyTheme.colors.ink, marginTop: 4 },
  miniLabel: { fontFamily: familyTheme.fonts.bodyMedium, fontSize: 11, color: familyTheme.colors.inkMuted, marginTop: 2 },
  miniHint: { fontFamily: familyTheme.fonts.body, fontSize: 11, color: familyTheme.colors.purpleDeep, marginTop: 2 },
  insightsBlock: { backgroundColor: familyTheme.colors.card, borderRadius: familyTheme.radius.lg, padding: 14, ...familyTheme.shadow.card },
  insightsTitle: { fontFamily: familyTheme.fonts.title, fontSize: 16, fontWeight: '700', color: familyTheme.colors.ink, marginBottom: 10 },
  insightRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  insightRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  insightEmoji: { fontSize: 24, marginTop: 2 },
  insightCopy: { flex: 1 },
  insightTitle: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 15, color: familyTheme.colors.ink },
  insightMessage: { fontFamily: familyTheme.fonts.body, fontSize: 13, color: familyTheme.colors.inkSoft, marginTop: 4, lineHeight: 19 },
});
