import { useEffect, useState } from "react";

/**
 * The first `step` items of a long list, and a way to show `step` more — a
 * list of 2,000 hospitals (0116) is too many cards to draw at once. `reset`
 * starts again from the first page: pass whatever the list is filtered by.
 */
export const useShowMore = <T,>(list: T[], reset: unknown, step = 24) => {
  const [count, setCount] = useState(step);
  const key = JSON.stringify(reset);
  useEffect(() => { setCount(step); }, [key, step]);
  return {
    shown: list.slice(0, count),
    hasMore: list.length > count,
    more: () => setCount(c => c + step),
  };
};
