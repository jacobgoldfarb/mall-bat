const urls = import.meta.glob('../assets/icons/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const ICONS = Object.fromEntries(Object.entries(urls).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]));

export function Icon({ name, size = 32 }: { name: string; size?: number }) {
  return <img class="icon" src={ICONS[name]} width={size} height={size} alt="" draggable={false} />;
}
