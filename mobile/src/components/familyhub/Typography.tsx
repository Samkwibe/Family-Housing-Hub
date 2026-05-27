import { Text, TextProps, StyleSheet } from 'react-native';
import { type AppTheme } from '@/src/theme';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAppStyles } from '@/src/hooks/useStyles';

type FHTextProps = TextProps & {
  variant?: 'hero' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'overline' | 'stat';
  muted?: boolean;
};

export function FHText({
  variant = 'body', muted, style, ...props }: FHTextProps) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const isTitle = variant === 'hero' || variant === 'h1' || variant === 'h2' || variant === 'h3' || variant === 'stat';
  return (
    <Text
      style={[
        theme.typography[variant],
        isTitle ? styles.title : styles.body,
        muted && styles.muted,
        style,
      ]}
      {...props}
    />
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  title: { fontFamily: theme.fonts.title, color: theme.colors.text },
  body: { fontFamily: theme.fonts.body, color: theme.colors.text },
  muted: { color: theme.colors.textSecondary },
});
}
