function isSummaryKey(k: string): k is SummaryKey {
    return ['total', 'current', 'completed', 'available'].includes(k);
  }