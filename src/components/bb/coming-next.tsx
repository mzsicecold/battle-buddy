import { Card } from '@/components/bb/card';
import { ThemedText } from '@/components/themed-text';

export function ComingNext({ items }: { items: string[] }) {
  return (
    <Card title="Scaffolded next" hint="not built yet">
      {items.map((item) => (
        <ThemedText key={item} type="small" themeColor="textSecondary">
          · {item}
        </ThemedText>
      ))}
    </Card>
  );
}
