const metrikaCounterId = 111244359;

type MetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: MetrikaFunction;
  }
}

let initialized = false;

export function initializeAnalytics() {
  if (typeof window === "undefined" || initialized) return;

  const queuedMetrika: MetrikaFunction = (...args: unknown[]) => {
    queuedMetrika.a ??= [];
    queuedMetrika.a.push(args);
  };
  queuedMetrika.l = Date.now();

  window.ym ??= queuedMetrika;

  if (!document.querySelector('script[data-seven-metrika="true"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    script.dataset.sevenMetrika = "true";
    document.head.appendChild(script);
  }

  window.ym(metrikaCounterId, "init", {
    clickmap: false,
    trackLinks: false,
    accurateTrackBounce: false,
    webvisor: false,
    ecommerce: false,
    ssr: true,
  });

  initialized = true;
}

export function trackGoal(goal: "task_created" | "feedback_sent") {
  if (typeof window === "undefined") return;
  window.ym?.(metrikaCounterId, "reachGoal", goal);
}
