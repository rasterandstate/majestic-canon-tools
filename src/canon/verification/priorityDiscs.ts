/**
 * Priority disc list: TMDB ID → expected IMDb ID.
 * Used by the Wikidata verifier to fail fast on incorrect IDs.
 * Sources: Wikidata (P4947 ↔ P345). Add entries as archivist-approved.
 */
export const PRIORITY_DISCS: Record<number, string> = {
  // Priority 1 — Trust Makers
  120: 'tt0120737', // LOTR: Fellowship
  121: 'tt0167261', // LOTR: Two Towers
  122: 'tt0167260', // LOTR: Return of the King
  11: 'tt0076759', // Star Wars: A New Hope
  1891: 'tt0080684', // Empire Strikes Back
  1892: 'tt0086190', // Return of the Jedi
  155: 'tt0468569', // The Dark Knight
  272: 'tt0372784', // Batman Begins
  49026: 'tt1345836', // The Dark Knight Rises
  671: 'tt0241527', // Harry Potter 1
  672: 'tt0295297', // Harry Potter 2
  673: 'tt0304141', // Harry Potter 3
  674: 'tt0330373', // Harry Potter 4
  675: 'tt0373889', // Harry Potter 5
  767: 'tt0417741', // Harry Potter 6: Half-Blood Prince
  12444: 'tt0926084', // Harry Potter 7: Deathly Hallows P1
  12445: 'tt1201607', // Harry Potter 8: Deathly Hallows P2
  603: 'tt0133093', // The Matrix
  105: 'tt0088763', // Back to the Future
  165: 'tt0096874', // Back to the Future Part II
  196: 'tt0099088', // Back to the Future Part III
  // Priority 2 — Boutique
  346: 'tt0047478', // Seven Samurai
  490: 'tt0050976', // The Seventh Seal
  496243: 'tt6751668', // Parasite
  1018: 'tt0166924', // Mulholland Drive
  11906: 'tt0076786', // Suspiria (1977)
  3176: 'tt0266308', // Battle Royale
  141: 'tt0246578', // Donnie Darko
  129: 'tt0245429', // Spirited Away
  // Priority 3 — High Shelf Density
  329: 'tt0107290', // Jurassic Park
  85: 'tt0082971', // Raiders of the Lost Ark
  19995: 'tt0499549', // Avatar
  98: 'tt0172495', // Gladiator
  238: 'tt0068646', // The Godfather
  78: 'tt0083658', // Blade Runner
  348: 'tt0078748', // Alien
  // Priority 4 — Edge Cases
  597: 'tt0120338', // Titanic
};
