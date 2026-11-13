// The home screen: a drawn Matterhorn you move around on (see src/world/world.html).
// The drawing runs in a WebView. We hand it the numbers with window.__pass1(data), and it tells us
// what was tapped with postMessage ({ type: 'open', id } and so on).
import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { WORLD_HTML } from '../world/worldHtml';

// The library's class typings don't line up with this React version's JSX types; the component itself is fine.
type WebViewHandle = { injectJavaScript: (js: string) => void; reload: () => void };
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebViewHandle> }>;

export type WorldHiker = { id: string; n: string; name: string; c: string; st: number; today: number; watch: string; me?: boolean };
export type WorldSign = { id: string; title: string; sub: string; kicker: string; detail: string; dots: [number, string][] };
export type WorldBoard = { key: string; label: string; rows: { rank: number; name: string; sub: string; steps: number; me?: boolean }[] };
export type WorldData = {
  lang: string;
  locale?: string;
  insetTop: number;
  today: number | null;
  sync: string;
  week: number;
  best: { day: string; steps: number } | null;
  name: string;
  nickname: string | null;
  watch: string;
  alerts: boolean;
  gain: number;
  publicOn: boolean;
  t: Record<string, unknown>;
  signs: WorldSign[];
  climb: { id: string; name: string; goal: number; hikers: WorldHiker[] } | null;
  boards: WorldBoard[];
};
export type WorldEvent = { type: string; id?: string | null; player?: string | null };

/** Any drawn world page: the home mountain by default, or a challenge's own world (e.g. Vesuvius). */
export function MountainWorld({ data, onEvent, html = WORLD_HTML }: { data: WorldData | Record<string, unknown>; onEvent: (e: WorldEvent) => void; html?: string }) {
  const web = useRef<WebViewHandle>(null);
  const ready = useRef(false);
  const json = JSON.stringify(data);
  // The first data goes in before the page runs, so it never flashes the sample.
  const first = useMemo(() => `window.__INIT = ${json}; true;`, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ready.current) web.current?.injectJavaScript(`window.__pass1 && window.__pass1(${json}); true;`);
  }, [json]);

  function onMessage(e: WebViewMessageEvent) {
    let m: WorldEvent;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === 'ready') {
      ready.current = true;
      web.current?.injectJavaScript(`window.__pass1 && window.__pass1(${json}); true;`);
      return;
    }
    onEvent(m);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F1EC' }}>
      <WebView
        ref={web}
        source={{ html, baseUrl: 'https://pass1.local/' }}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={first}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: '#F4F1EC' }}
        // If the page ever dies in the background, load it again.
        onContentProcessDidTerminate={() => { ready.current = false; web.current?.reload(); }}
      />
    </View>
  );
}
