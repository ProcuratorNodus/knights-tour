# Knight's Tour

A chess knight, an empty board, and one question: can you land on every square exactly once? Knight's Tour is a small browser puzzle built around that old problem. Play it yourself on boards from 5 x 5 to 8 x 8, borrow a hint when you are stuck, or ask the computer to finish the tour for you, or to tell you honestly that it cannot be finished from where you stand. Below the game notes is a short history of the puzzle and the mathematics around it.

## How to play

1. Pick a board size (5 x 5 up to 8 x 8) and click any square to place the knight. The clock starts with your first move.
2. The knight moves in an "L": two squares one way and one across. The squares it can reach are highlighted purple with a dot; click one to move there. Every square you have visited is numbered in the order you visited it.
3. **Back one** takes back your last move (it also works after a game has ended). **Reset board** starts again.
4. **Hints** (off by default): hover or focus a reachable square, or the knight itself, and each square the knight could go to next shows a green number, how many onward moves that square would have. Aim for the smallest numbers: the awkward squares are best visited early, before they are cut off. This is Warnsdorff's rule (see the history below).
5. **Solve "Automagically!"** finishes the tour from wherever you are, empty board included. The moves play onto the board one by one, and **Stop** halts them so you can carry on yourself. If no completion exists from the current position, it says so ("No completion exists from this position") and tells you how many moves back it last could have been finished, with a **Back up N moves** button that takes you there. Tick **Prefer a closed tour** to try first for a tour that ends a knight's move from where it began (not possible on odd-sized boards).
6. **Pieces & board** switches between the New artwork and the Classic pictures; the choice is remembered in your browser.
7. Keyboard: Tab to the board, arrow keys move between squares, Enter or Space moves the knight.

The side panel keeps your stats in your browser: games played, tours completed, completion rate, tours solved by the computer, and your best time for each board size.

## Rules of this game

- The knight moves only in an L and may land on each square once. Visited squares are blocked.
- You can start on any square.
- You win when the knight has visited every square.
- You lose when the knight has no legal move left before the board is full.
- You also lose if you leave an orphan: an unvisited square whose every neighbour is already visited (the knight's own square excepted, since it can still step from there). Nothing can ever reach it again, so the game ends at once and names the square.
- A tour finished by the computer counts as played, never as your win or best time. If you stop the computer and finish the tour yourself, it is shown as "Tour complete, with help from the computer" and is still not counted as your win.
- Abandoned games (reset mid-game) are not counted as played. A game is recorded once, when it first ends.
- On odd-sized boards a tour must start on a corner-coloured square. The solver says so if you start elsewhere.

## History and mathematics

### The Knight's Tour: A Thousand Years of a Single Chess Piece

Put a knight on an empty chessboard. Can it visit every square exactly once? That one question, simple enough to explain in a sentence, has been asked in Kashmir, in Baghdad, in Paris, in Berlin and in the computer laboratories of the 1990s. It has been used to write poems, to order the chapters of a novel, and to test the limits of counting machines. This section is a tour of the tour.

### What is a knight's tour?

A knight moves in an "L": two squares in one direction and one square at right angles to it. In the language of coordinates, a knight at square (i, j) can jump to any square (k, l) where the differences |i - k| and |j - l| are 1 and 2 in some order [12]. A **knight's tour** is a sequence of such moves that visits every square of the board exactly once [1].

There are two flavours:

- A tour is **closed** (also called **re-entrant**) if the last square is itself one knight's move from the first square, so the knight could carry on and begin the same circuit again.
- Otherwise it is **open** [1].

Mathematicians translate the board into a graph: each square is a vertex and each legal knight's move is an edge. An open tour is then a Hamiltonian path in that "knight's graph", and a closed tour is a Hamiltonian cycle [1][12]. Nothing in the puzzle changes by doing this, but it connects an old pastime to a large and active branch of mathematics.

### The earliest known history

The story starts well before modern chess.

**India.** Rudrata's *Kavyalankara*, a Sanskrit work on poetics from Kashmir, presents a knight's tour on a half-board as an ornamental verse form called *turagapadabandha*, roughly "arrangement in the steps of a horse" [1]. Chess historian George Jelliss dates the work to about 900, in the reign of Sankaravarman (884 to 903), and describes the tour as laid out on a 4 by 8 half board, with syllables that make sense when read in the order of the knight's path [8]. Wikipedia calls this the earliest known reference to the problem and places it in the 9th century [1]; the two sources agree to within the uncertainty of "around 900". Another Sanskrit work, Bhatta Nilakantha's *Bhagavantabhaskara*, gives a fully symmetric closed tour. Sources disagree about its date: Jelliss, following Winternitz, gives about 1640 and notes the tour might be a later addition [8], while Wikipedia says c. 1600 or c. 1700 [1]. Either way, if it is as early as claimed, it predates Euler.

**The Arabic world.** A manuscript attributed to Abu Zakariya Yahya ben Ibrahim al-Hakim, which MacTutor dates to about 1350 and titles *The Delight of the Intelligent, A Description of Chess*, preserves older tours [6]. ChessBase, summarising Jelliss, reports that this manuscript gives tours by Ali C. Mani and by al-Adli ar-Rumi, who flourished around 840, and that the shatranj (medieval chess) master as-Suli built on al-Adli's work, criticised it, and published two closed tours [10]. MacTutor says al-Adli, writing in 9th-century Baghdad, is believed to have created the first known tour [6]. These accounts come from secondary retellings of medieval manuscripts, so the fine detail is best treated as the current scholarly reading rather than settled fact.

**Early modern Europe.** Tours were printed in Paris in the 1725 edition of Jacques Ozanam's *Recreations mathematiques et physiques*, attributed to de Montmort, de Moivre and de Mairan; de Mairan supplied them to the editor in 1722 [7]. Jelliss notes that these printed tours are open, and that a popular story crediting Brook Taylor with prompting them cannot be verified [7].

### Euler, 1759

Leonhard Euler wrote the first mathematical paper on the subject. He presented "Solution d'une question curieuse qui ne paroit soumise a aucune analyse" to the Berlin Academy in 1759; it was not printed until 1766, in the Academy's *Memoires*, volume 15, pages 310 to 337 (catalogued as E309) [11][7]. Jelliss's chronology also lists it as the first mathematical paper on knight's tours [16]. He had been working on the problem since at least 1757, when he sent a symmetric tour to Christian Goldbach in a letter [7].

Euler opened by describing the puzzle as a curious question that seemed to defy analysis [5][10]. His achievement was to analyse it methodically. He gave a general method for patching partial tours into complete ones and for deriving new tours from old, studied symmetry, and solved smaller boards; he also gave the first examples of tours with fourfold symmetry on cross-shaped boards [10]. MacTutor describes the method as awkward, since it repairs failed tours instead of building correct ones, but it works, and it is credited as an early link between tours and Hamiltonian paths and circuits [6]. Euler claimed his method could produce as many tours as one liked, because the total number, while finite, is too large to exhaust [5].

A persistent myth credits Euler with magic knight's tours (see below). Jelliss states that he did not construct any [9][10].

One small correction of record: Euler's paper asserted that closed tours cannot exist on boards with a side under five; this was corrected by Bergholt in 1917 [7].

### Warnsdorff's rule, 1823

H. C. von Warnsdorff published his rule in 1823 in *Des Rosselsprunges einfachste und allgemeinste Losung* [12]. It is beautifully simple: from your current square, look at the squares you could move to, and choose the one with the fewest onward exits (the lowest degree in the graph) [12]. In effect, the knight visits the awkward squares first, before they are cut off. It removes the need for Euler's relabelling, though its tours are not generally closed [6].

It is a heuristic, not a guarantee. Samuel Marateck checked all 40,320 (8!) orderings of the knight's eight moves, used to break ties, from all 64 starting squares on a standard board. Of the 2,580,480 resulting runs, 78,832 (about 3 percent) got stuck before completing a tour, and 32,944 of the 40,320 tie-breaking orders produced at least one failure from some start, so only about 18 percent of orderings never fail on the 8 by 8 board [12]. Warnsdorff believed tie-breaking made no difference; counterexamples have since been found [6]. On very large boards the rule also runs into trouble: MacTutor, quoting Roth via Weisstein, reports difficulty at sides of around 76 squares (a second-hand figure) [6]. Ian Parberry notes that tours made by the rule show visible regions of parallel moves, and that other methods can build tours far larger than the rule can feasibly handle [15].

### How many tours are there?

Counting tours is a different and much harder problem than finding one.

- **Closed tours on the 8 by 8 board.** The accepted count of undirected closed tours (a tour and its reverse counted once) is **13,267,364,410,532** [2][5]. Counting direction, so each tour and its reverse are separate, doubles it to 26,534,728,821,064 [1][4].
- **A famous correction.** In 1996 Martin Lobbing and Ingo Wegener used binary decision diagrams to count the tours and published the figure 33,439,123,484,294, in a paper whose very title announces it [4]. It was wrong: the true total must be divisible by 4, and that number is not [5][6]. Brendan McKay recomputed the count by another method and obtained 13,267,364,410,532, which agrees with Wegener's later book (2000) [2][6]. The OEIS records both numbers and says plainly that the 1996 value was incorrect [2]. If you meet the larger figure in an older source, that is where it came from.
- **Open and closed together.** The number of directed knight's paths that visit every square of an 8 by 8 board, open or closed, is listed as 19,591,828,170,979,904, credited to Alex Chernov in 2014 [3]. Plus Magazine notes that people were not entirely certain it is correct [5]; treat it as the best published figure rather than a theorem.
- **Smaller boards.** Closed tours: 0 on 4 by 4 and 9,862 on 6 by 6 [2]. Directed paths of any kind: 0 on 3 by 3 and 4 by 4, 1,728 on 5 by 5, 6,637,920 on 6 by 6, and 165,575,218,320 on 7 by 7 [3].

(Some Wikipedia text shows 13,267,364,410,532 in a brute-force section as well as the "undirected" row, so check which column a source is using before comparing numbers [1].)

### Which boards have a tour?

For an m by n rectangle with m not larger than n, Allen Schwenk proved in 1991 (*Mathematics Magazine* 64(5), pp. 325 to 332) that a closed tour exists **unless** one of these holds [13]:

1. m and n are both odd;
2. m is 1, 2 or 4;
3. m is 3 and n is 4, 6 or 8.

The first condition matches the OEIS remark that no closed tour exists on a square board with an odd side [2].

Open tours are more forgiving. They are impossible when m is 1 or 2, when m = 3 with n = 3, 5 or 6, and when the board is 4 by 4 [1]; the zero entries for 3 by 3 and 4 by 4 in the directed-path counts agree with this [3]. Beyond that, a tour exists on any board whose smaller side is at least 5. MacTutor credits this to Paul Cull and Jeffery De Curtins (1978); Wikipedia attributes it to Cull and Conrad, so the name is worth confirming before it is quoted [6][1].

### Connections

**Graph theory.** The tour is a special case of the Hamiltonian path problem, which is hard in general, yet Wikipedia notes that, unlike the general problem, the knight's tour can be solved in linear time [1].

**Magic knight's tours.** Number the squares 1 to 64 in the order of the tour. If every row and column sums to 260, you have a semi-magic tour; if both diagonals also sum to 260, it is fully magic. The first such tour was composed in 1847 by a William Beverley and published in the *Philosophical Magazine* in 1848, according to Jelliss [9]. Jelliss's survey concludes there are 108 geometrically distinct magic tours of the 8 by 8 board, after a distributed search in 2003 found five more and confirmed nothing else remained, and that none is magic along the diagonals [9]. Diagonally magic tours do exist on larger boards [9].

**Literature.** Georges Perec's novel *Life: A User's Manual* (1978) is set in a Paris apartment block pictured as a 10 by 10 grid, and a knight's tour determines the order of its chapters. The book has 99 chapters, so the tour skips one cell [14]. Wikipedia calls a knight's tour as a way to generate a novel a long-standing idea of the Oulipo group [14]. The medieval Sanskrit tours earlier on this page are also poetry: verses engineered so that a second verse emerges along the knight's path [1][8].

**Recreation and mathematics together.** The Loebbing and Wegener paper explicitly chose the tour for its long history and because it is a chess problem known to everybody [4]. That is the secret of the knight's tour: it needs no equipment but a board, and it leads straight to open research.

### Sources

Accessed 2026-10-28.

1. https://en.wikipedia.org/wiki/Knight%27s_tour - "Knight's tour" (Wikipedia). Definition, open/closed, Rudrata, Nilakantha, Schwenk's theorem, open-tour impossibility, 26,534,728,821,064 directed closed tours, Hamiltonian connection, Cull and Conrad attribution, Oulipo. Tertiary source; used alongside primary or specialist sources.
2. https://oeis.org/A001230 - OEIS A001230, "Number of undirected closed knight's tours on a 2n X 2n chessboard." Values 0, 0, 9862, 13267364410532; note that Loebbing and Wegener's 33439123484294 was incorrect and McKay's value agrees with Wegener's book; parity remark.
3. https://oeis.org/A165134 - OEIS A165134, "Number of directed Hamiltonian paths in the n X n knight graph." Values for 1x1 to 8x8, including 19,591,828,170,979,904 credited to Alex Chernov (2014).
4. https://www.combinatorics.org/ojs/index.php/eljc/article/download/v3i1r5/pdf - Martin Loebbing and Ingo Wegener, "The Number of Knight's Tours Equals 33,439,123,484,294 -- Counting with Binary Decision Diagrams," Electronic Journal of Combinatorics 3 (1996), R5. The 1996 count, directed = 2 x undirected, motivation and history remark.
5. https://plus.maths.org/content/knights-tour - Marianne Freiberger, "The knight's tour," Plus Magazine, 5 Aug 2016. Euler's approach, the divisibility-by-4 correction, 13,267,364,410,532, and the caveat about the open/closed total.
6. https://mathshistory.st-andrews.ac.uk/Projects/MacQuarrie/chapter-3/ - MacTutor, "Mathematics and Chess," chapter 3. Al-Adli, al-Hakim manuscript c. 1350, Euler's method, Warnsdorff and tie-breaking, large-board difficulty, Cull and De Curtins (1978), Schwenk (1991), the 1996 error and McKay/Wegener.
7. https://mayhematics.com/t/1b.htm - George Jelliss, "Rediscovery of the Knight's Problem." Ozanam 1725, Montmort/de Moivre/de Mairan, Euler's 1759/1766 paper, Goldbach letter 1757, Bergholt 1917 correction.
8. https://mayhematics.com/t/indian.htm - George Jelliss, "Indian Tours." Rudrata c. 900, 4x8 half board, Nilakantha c. 1640 caveat.
9. https://mayhematics.com/t/1d.htm - George Jelliss, "History of Magic Knight's Tours." Beverley 1847/1848, Euler misattribution, 108 8x8 tours, 2003 search, no diagonally magic 8x8 tour.
10. https://en.chessbase.com/post/euler-and-the-knights-tour - ChessBase, "Euler and the Knight's Tour." Euler's contributions, Ali Mani, al-Adli c. 840, as-Suli, Jelliss on magic tours.
11. https://scholarlycommons.pacific.edu/euler-works/309 - Euler Archive record E309. Title, Memoires de l'academie des sciences de Berlin vol. 15, pp. 310-337, presented 1759, printed 1766; "first mathematical paper on knight's tours."
12. https://arxiv.org/abs/0803.4321 - Samuel L. Marateck, "How good is the Warnsdorff's knight's tour heuristic?" (2008). Knight's graph definition, Hamiltonian path/cycle framing, Warnsdorff (1823) and the rule, 32,944 of 40,320 orderings, 78,832 of 2,580,480 runs.
13. https://en.wikipedia.org/wiki/Schwenk%27s_theorem - "Schwenk's theorem." Statement and citation of Schwenk, Math. Magazine 64(5), 325-332 (1991).
14. https://en.wikipedia.org/wiki/Life_A_User%27s_Manual - "Life: A User's Manual." Perec, 1978, 10x10 grid, knight's tour, 99 chapters, Oulipo.
15. https://ianparberry.com/research/tourneys - Ian Parberry, "Tourneys and Closed Knight's Tours." Warnsdorff tours show regions of parallel moves; scaling remark.
16. https://mayhematics.com/t/1l.htm - George Jelliss, knight's tour chronology. Euler's paper listed as "the first mathematical paper on Knight's Tours"; presented 1759, published 1766.


## Where it started

I wrote the first version of this game around 2015: one long file of jQuery, an 8 x 8 board, and a "Solve Automagically!" button that never
quite worked. If you want to see where all this came from, the terrible jQuery version is kept as it was in [original-2015/](original-2015/).

In 2026 I brought it up to date with help from Claude (Anthropic's Opus and Sonnet models). Together we rebuilt it in React and
TypeScript, opened it up to boards from 5 x 5 to 8 x 8, finally finished "Solve Automagically!" (it now completes or disproves any
position), added the new artwork set and the tests, and wrote the history section above. The game, its rules and the Classic look are
from the original.

## Build

Requires [Bun](https://bun.sh) (or Node with npm).

```sh
bun install
bun run dev        # development server
bun run build      # type-check and build to dist/
bun run preview    # serve the built game
bun run test       # unit tests
```

## Credits

The default artwork is public domain or CC0:

- Board textures: "Wood095" (light squares) and "Wood067" (dark squares) from [ambientCG](https://ambientcg.com), CC0 1.0.
- Knight silhouette: "chesspiece knight" ([Openclipart](https://openclipart.org/detail/24214/chesspiece-knight), public domain), tinted in the game for the current and earlier positions.
- Smiling and frowning faces: [Kenney](https://kenney.nl/assets/emotes-pack) Emotes pack, CC0.

The Classic set is the artwork of the original 2015 game; its page credited the knight image to [Cliparts.co](https://cliparts.co/clipart/2517827). Source links and licence notes are in [ASSETS-LICENSES.md](ASSETS-LICENSES.md).

Original game and code: Joel E. Mason (2015). Modern version: Joel E. Mason, with Claude Opus and Claude Sonnet (Anthropic), 2026.

## Licence

Apache-2.0. Copyright Joel E. Mason. See [LICENSE](LICENSE).

You can't run this version yet: [procuratornodus.com](https://procuratornodus.com)