import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

/**
 * React replays a click made before the page hydrates, but not a slider moved before then: the slider keeps its
 * new value and the figure never hears of it. So move the slider away and back until the read-out follows,
 * going away to whichever end of the slider is not the value wanted.
 */
async function slide(figure: Locator, name: string, value: string, readOut: string) {
  const slider = figure.getByRole("slider", { name });
  await expect(async () => {
    const min = (await slider.getAttribute("min")) ?? "0";
    await slider.fill(value === min ? ((await slider.getAttribute("max")) ?? "100") : min);
    await slider.fill(value);
    await expect(figure).toContainText(readOut, { timeout: 1_000 });
  }).toPass();
}

/*
 * The gallery shows every figure placed in the real course content, not the test fixtures,
 * so this checks each one a learner will meet, at laptop, tablet and phone sizes.
 */

test("every figure in the course draws, reads out its state and fits the screen", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Every figure in the course" })).toBeVisible();
  const items = page.locator(".gallery-item");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  await expect(page.locator(".gallery-count")).toContainText(`${count} placement`);
  for (let i = 0; i < count; i++) {
    const figure = items.nth(i).getByRole("figure");
    await expect(figure.locator("svg").first()).toBeVisible();
    await expect(figure.locator(".fig-summary")).not.toBeEmpty();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the logarithmic scale compares two sizes, and the even scale shows why it is needed", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="log-scale"]').first().getByRole("figure");
  await expect(figure).toContainText("A phone photograph: 30,00,000 bytes. A 1 TB laptop drive: 10,00,00,00,00,000 bytes, about 1 × 10¹².");
  await expect(figure).toContainText("The larger is 5.5 orders of magnitude above the smaller: about 3,30,000 times as much.");
  await figure.getByRole("button", { name: "Decrease second" }).click();
  await expect(figure).toContainText("The larger is 3 orders of magnitude above the smaller: about 1,000 times as much.");
  const toggle = figure.getByRole("button", { name: "Show an even scale" });
  await toggle.click();
  await expect(figure).toContainText("5 of the 6 quantities are under 1% of the largest, so they sit on top of one another at zero");
  await expect(figure.getByRole("button", { name: "Show the logarithmic scale" })).toHaveAttribute("aria-pressed", "true");
});

test("the step-through figure runs a program a line at a time, and shows a bug's two faces", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="step-through"]').filter({ hasText: "Stepping through the bill splitter" }).getByRole("figure");
  await expect(figure).toContainText("Step 1 of 9, line 1: Python binds the name who_ate to the recipe.");
  await figure.getByRole("button", { name: "Jump to the end" }).click();
  await expect(figure).toContainText("print shows 0. Nobody is listed, so dividing the bill among them would divide by zero.");
  await expect(figure.locator('[aria-current="step"]')).toContainText("print(len(people))");
  await expect(figure.locator(".fig-output")).toHaveText("0");

  await figure.getByRole("button", { name: "Put Asha first" }).click();
  await expect(figure).toContainText("Step 1 of 10");
  await figure.getByRole("button", { name: "Jump to the end" }).click();
  await expect(figure).toContainText("print shows 1. Only Asha is listed, so Asha would pay the whole bill.");

  await figure.getByRole("button", { name: "Move the return out of the loop" }).click();
  await figure.getByRole("button", { name: "Jump to the end" }).click();
  await expect(figure).toContainText("print shows 3. The bill would be split 3 ways, as it should be.");
  await figure.getByRole("button", { name: "Decrease step" }).click();
  await expect(figure).toContainText("Back in the main program, people is bound to ['Asha', 'Ravi', 'Meera'].");

  const deposit = page.locator('.gallery-item[data-figure="step-through"]').filter({ hasText: "Stepping through the fixed deposit" }).getByRole("figure");
  await deposit.getByRole("button", { name: "Jump to the end" }).click();
  await expect(deposit).toContainText("The deposit first reaches double in year 11.");
  await deposit.getByRole("button", { name: "Increase rate" }).click();
  await deposit.getByRole("button", { name: "Jump to the end" }).click();
  await expect(deposit).toContainText("The deposit first reaches double in year 10.");
});

test("the binary counter counts, wraps round, and reads the same byte two ways", async ({ page }) => {
  await page.goto("/gallery");
  const four = page.locator('.gallery-item[data-figure="binary-counter"]').filter({ hasText: "Four bits" }).getByRole("figure");
  await expect(four).toContainText("Bits 1101. Read as unsigned: 8 + 4 + 1 = 13. In hexadecimal, D.");
  await four.getByRole("button", { name: "Add 1" }).click();
  await four.getByRole("button", { name: "Add 1" }).click();
  await expect(four).toContainText("Bits 1111. Read as unsigned: 8 + 4 + 2 + 1 = 15. In hexadecimal, F.");
  await four.getByRole("button", { name: "Add 1" }).click();
  await expect(four).toContainText("Adding 1 to 1111 carried out of the leftmost bit. There is no bit there to hold the carry, so it is lost and the row wraps round to 0000.");
  await four.getByRole("button", { name: "Flip the 4s bit" }).click();
  await expect(four).toContainText("Bits 0100. Read as unsigned: the only 1 is in the 4 column, so the value is 4. In hexadecimal, 4.");

  const signed = page.locator('.gallery-item[data-figure="binary-counter"]').filter({ hasText: "Two's complement and overflow" }).getByRole("figure");
  await expect(signed).toContainText("Bits 0111 1111. Read as two's complement: 64 + 32 + 16 + 8 + 4 + 2 + 1 = 127. In hexadecimal, 7F.");
  await signed.getByRole("button", { name: "Add 1" }).click();
  await expect(signed).toContainText("Bits 1000 0000. Read as two's complement: the only 1 is in the −128 column, so the value is −128. In hexadecimal, 80.");
  await signed.getByRole("button", { name: "Read as unsigned" }).click();
  await expect(signed).toContainText("Read as unsigned: the only 1 is in the 128 column, so the value is 128.");
  await expect(signed.getByRole("button", { name: "Read as two's complement" })).toHaveAttribute("aria-pressed", "false");
});

test("the struct-padding figure shows where a record's padding goes, and how reordering or packing removes it", async ({ page }) => {
  await page.goto("/gallery");
  const pair = page.locator('.gallery-item[data-figure="struct-padding"]').filter({ hasText: "A char and an int" }).getByRole("figure");
  await expect(pair).toContainText("kind at byte 0, 1 byte. 3 bytes of padding. balance at byte 4, 4 bytes. Size 8 bytes: 5 of data and 3 of padding.");
  await pair.getByRole("button", { name: "Put the largest fields first" }).click();
  await expect(pair).toContainText("balance at byte 0, 4 bytes. kind at byte 4, 1 byte. 3 bytes of padding at the end, so that the next record in an array starts aligned too. Size 8 bytes");

  const tap = page.locator('.gallery-item[data-figure="struct-padding"]').filter({ hasText: "A metro tap record" }).getByRole("figure");
  await expect(tap).toContainText("kind at byte 0, 1 byte. 7 bytes of padding. when at byte 8, 8 bytes. station at byte 16, 2 bytes. 2 bytes of padding. fare at byte 20, 4 bytes. Size 24 bytes: 15 of data and 9 of padding.");
  await tap.getByRole("button", { name: "Put the largest fields first" }).click();
  await expect(tap).toContainText("Fields in the order when, fare, station, kind");
  await expect(tap).toContainText("Size 16 bytes: 15 of data and 1 of padding.");
  await tap.getByRole("button", { name: "Back to the original order" }).click();
  await tap.getByRole("button", { name: "Pack the fields with no gaps" }).click();
  await expect(tap).toContainText("when at byte 1, 8 bytes. station at byte 9, 2 bytes. fare at byte 11, 4 bytes. Size 15 bytes: 15 of data and 0 of padding. when crosses from one 8-byte row into the next, so reading it takes two reads of memory.");
  await expect(tap.getByRole("button", { name: "Align the fields" })).toHaveAttribute("aria-pressed", "true");
});

test("the staircase figure adds 1 to n as half of a rectangle", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="triangle-sum"]').first().getByRole("figure");
  await expect(figure).toContainText("1 + 2 + … + 4 is the staircase of shaded squares, row k holding k of them: 10 in all.");
  await expect(figure.locator("rect")).toHaveCount(20);
  await figure.getByRole("button", { name: "Increase n" }).click();
  await expect(figure).toContainText("completes a rectangle 5 by 6 with 30 squares. So the staircase is half of it: 5 × 6 ÷ 2 = 15.");
  await expect(figure.locator("rect")).toHaveCount(30);
  await expect(figure.locator("rect.fig-accent")).toHaveCount(15);
});

test("the full adder adds three bits into a sum bit and a carry", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="full-adder"]').first().getByRole("figure");
  await expect(figure).toContainText("a is 1, b is 1 and the carry in is 0. They add to 2, which is 10 in binary: sum bit 0, carry out 1.");
  await expect(figure).toContainText("a and b are both 1, so they carry on their own.");
  await figure.getByRole("button", { name: "Switch carry in" }).click();
  await expect(figure).toContainText("They add to 3, which is 11 in binary: sum bit 1, carry out 1.");
  await figure.getByRole("button", { name: "Switch a" }).click();
  await expect(figure).toContainText("a is 0, b is 1 and the carry in is 1. They add to 2, which is 10 in binary: sum bit 0, carry out 1.");
  await expect(figure).toContainText("a and b differ, so x is 1, and the carry coming in passes through.");
  await expect(figure.getByRole("button", { name: "Switch a" })).toHaveText("0");
  await figure.getByRole("button", { name: "Switch b" }).click();
  await expect(figure).toContainText("They add to 1, which is 01 in binary: sum bit 1, carry out 0.");
});

test("the search tree shows the path a search takes, and how sorted input makes a path that rebalancing removes", async ({ page }) => {
  await page.goto("/gallery");
  const plain = page.locator('.gallery-item[data-figure="search-tree"]').first().getByRole("figure");
  await expect(plain).toContainText("gives a tree of height 3: its deepest key is 3 links below the root.");
  await expect(plain).toContainText("Searching for 45 compares it with 50, 30, 40, 45 and finds it: 4 comparisons.");
  await plain.getByRole("button", { name: "Insert in sorted order" }).click();
  await expect(plain).toContainText("gives a tree of height 14");
  await expect(plain).toContainText("Searching for 45 compares it with 10, 20, 25, 30, 35, 40, 45 and finds it: 7 comparisons.");
  const balanced = page.locator('.gallery-item[data-figure="search-tree"]').nth(1).getByRole("figure");
  await expect(balanced).toContainText("rebalancing after each insertion, gives a tree of height 3: its deepest key is 3 links below the root, and 11 rotations were needed along the way.");
  await balanced.getByRole("button", { name: "Stop rebalancing" }).click();
  await expect(balanced).toContainText("gives a tree of height 14");
});

test("the trie follows one link per letter typed and finds the words below", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="trie"]').first().getByRole("figure");
  await expect(figure).toContainText("The trie holds 7 words: TO, TEA, TEN, TENT, IN, INN, INK. It has 11 nodes, counting the root, for 20 letters in all");
  await expect(figure).toContainText("Typing \u201cTE\u201d follows 2 links down from the root, one for each letter, and the words below the node it reaches are TEA, TEN, TENT.");
  await figure.getByRole("button", { name: "Type N" }).click();
  await expect(figure).toContainText("the words below the node it reaches are TEN, TENT.");
  await figure.getByRole("button", { name: "Delete a letter" }).click();
  await figure.getByRole("button", { name: "Delete a letter" }).click();
  await figure.getByRole("button", { name: "Type O" }).click();
  await figure.getByRole("button", { name: "Type N" }).click();
  await expect(figure).toContainText("Typing \u201cTON\u201d finds no link for the letter \u201cN\u201d after \u201cTO\u201d, so no word begins with \u201cTON\u201d.");
  await figure.getByRole("button", { name: "Decrease words" }).click();
  await expect(figure).toContainText("The trie holds 6 words");
  await expect(figure).toContainText("It has 10 nodes");
});

test("the graph-storage figure matches each node's row of the table with its list", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="graph-storage"]').first().getByRole("figure");
  await expect(figure).toContainText("C has degree 3: its neighbours are A, B, E. In the table, row C has a 1 in 3 columns, A, B, E, and a 0 in the other 3.");
  await expect(figure).toContainText("The whole table has 36 entries, of which 16 are 1, two for each edge");
  await figure.getByRole("button", { name: "Make the edges one-way" }).click();
  await expect(figure).toContainText("C has arrows out to E and arrows in from A, B, so its out-degree is 1 and its in-degree is 2.");
  await expect(figure).toContainText("of which 8 are 1, one for each arrow");
  await figure.getByRole("button", { name: "Increase node" }).click();
  await expect(figure).toContainText("D has arrows out to E, F and arrows in from B");
});

test("the union-find figure keeps trees short by joining the smaller under the larger", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="union-find"]').first().getByRole("figure");
  await expect(figure).toContainText("the 8 items form 1 set: {0, 1, 2, 3, 4, 5, 6, 7}.");
  await expect(figure).toContainText("The tallest tree has height 5. find(0) follows 5 links from 0, through 1, 2, 3, 6, 7, and reaches the root 7.");
  await figure.getByRole("button", { name: "Join the smaller under the larger" }).click();
  await expect(figure).toContainText("The tallest tree has height 2. find(0) follows 1 link from 0, through 1, and reaches the root 1.");
  for (let i = 0; i < 7; i++) await figure.getByRole("button", { name: "Decrease joins" }).click();
  await expect(figure).toContainText("No joins yet, so each of the 8 items is a set on its own.");
  await expect(figure).toContainText("find(0) follows 0 links from 0, and reaches the root 0.");
});

test("the choice-tree figure multiplies the branches and names each meal", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="choice-tree"]').first().getByRole("figure");
  await expect(figure).toContainText("has 3 × 2 × 2 = 12 leaves, one for each meal. Meal 1 is Rajma, Lassi, Halwa.");
  for (let i = 0; i < 5; i++) await figure.getByRole("button", { name: "Increase meal" }).click();
  await expect(figure).toContainText("Meal 6 is Kadhi, Lassi, Jalebi.");
  await figure.getByRole("button", { name: "Increase sweets" }).click();
  await expect(figure).toContainText("has 3 × 2 × 3 = 18 leaves, one for each meal. Meal 6 is Rajma, Chaas, Barfi.");
});

test("the Pascal's triangle figure builds each entry from the two above it", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="pascal-triangle"]').first().getByRole("figure");
  await expect(figure).toContainText("Row 5 lists the number of ways to choose k items from 5, for k from 0 to 5: 1, 5, 10, 10, 5, 1. The picked entry is C(5, 2) = 10. It is the sum of the two entries above it, 4 + 6");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase k" }).click();
  await expect(figure).toContainText("It is at the edge of the row, where there is only one way: choose all of the 5.");
  await figure.getByRole("button", { name: "Increase row n" }).click();
  await expect(figure).toContainText("The picked entry is C(6, 5) = 6. It is the sum of the two entries above it, 5 + 1");
  await expect(figure).toContainText("The row adds up to 64 = 2^6");
});

test("the pigeonholes figure guarantees a shared box however the items fall", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="pigeonholes"]').first().getByRole("figure");
  await expect(figure).toContainText("13 items in 12 boxes, spread as evenly as possible.");
  await expect(figure).toContainText("some box holds at least 13 ÷ 12 rounded up, which is 2, so at least two items always share a box.");
  await figure.getByRole("button", { name: "Decrease items" }).click();
  await expect(figure).toContainText("which is 1, so it is possible for no two items to share a box.");
  await figure.getByRole("button", { name: "Drop them at random" }).click();
  await expect(figure).toContainText("12 items in 12 boxes, dropped at random.");
});

test("the inclusion-exclusion figure corrects the count one step at a time", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="inclusion-exclusion"]').first().getByRole("figure");
  await expect(figure).toContainText("Adding the sizes of the three sets, 15 + 10 + 6, gives 31.");
  await expect(figure).toContainText("so 31 is too many; the true count is 22.");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Every region is now counted exactly once, so 22 is right: 22 of the numbers are multiples of 2, 3 or 5.");
});

test("the clock figure wraps jumps round and reaches only the multiples of the common divisor", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="mod-clock"]').first().getByRole("figure");
  await expect(figure).toContainText("After 3 jumps you are at 3 × 5 = 15, which leaves the remainder 3 on division by 12. Jumps of 5 reach all 12 positions before coming back to 0.");
  await figure.getByRole("button", { name: "Decrease jump size" }).click();
  await expect(figure).toContainText("After 3 jumps you are at 3 × 4 = 12, which leaves the remainder 0 on division by 12. Jumps of 4 reach only 3 positions, 0, 4, 8, the multiples of 4, because 4 is the largest number dividing both 12 and 4.");
});

test("the square-cutting figure runs Euclid's algorithm to the greatest common divisor", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="euclid-squares"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1: 1071 = 2 × 462 + 147, so 2 squares of side 462 are cut off, leaving a 147 by 462 rectangle.");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Step 3: 147 = 7 × 21 + 0, so 7 squares of side 21 are cut off and nothing is left over. The last squares have side 21, and squares of side 21 tile the whole rectangle, so 21 is the greatest common divisor of 1071 and 462.");
  await figure.getByRole("button", { name: "Increase width" }).click();
  await expect(figure).toContainText("Step 3: 148 = 8 × 18 + 4, so 8 squares of side 18 are cut off, leaving a 4 by 18 rectangle.");
});

test("the tower figure moves the largest disc once, between two smaller towers", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="tower"]').first().getByRole("figure");
  await expect(figure).toContainText("The fewest moves is 2 to the power 3, minus 1, which is 7. No moves yet: every disc is on the left needle, largest at the bottom.");
  await expect(figure).toContainText("The largest disc moves once, at move 4, and just before that the other 2 discs sit on the middle needle, which took 3 moves");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase move" }).click();
  await expect(figure).toContainText("Move 4: disc 3 goes from the left needle to the right needle.");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase move" }).click();
  await expect(figure).toContainText("Move 7: disc 1 goes from the left needle to the right needle. The whole tower is now on the right needle.");
});

test("the bound figure tests a witness for big-O and moves the starting point", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="bound-witness"]').first().getByRole("figure");
  await expect(figure).toContainText("The bound f(n) ≤ 1 × n fails at 100 of these n, first at n = 1.");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase c" }).click();
  await expect(figure).toContainText("The bound f(n) ≤ 4 × n fails at 19 of these n, first at n = 1.");
  await figure.getByRole("slider", { name: "from n" }).fill("20");
  await expect(figure).toContainText("for n from 20 to 100. The bound f(n) ≤ 4 × n holds at every one of these n.");
  await figure.getByRole("button", { name: "Try 8 log₂ n against n" }).click();
  await expect(figure).toContainText("The bound f(n) ≤ 1 × n fails at 42 of these n, first at n = 2.");
});

test("the one-stroke figure reads the answer off the odd degrees and draws the stroke", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="one-stroke"]').first().getByRole("figure");
  await expect(figure).toContainText("The degrees, the number of lines at each point, are A 3, B 3, C 4, D 4, E 2. Exactly two degrees are odd, so the figure can be drawn in one stroke, starting at A and ending at B");
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("The stroke so far is A, B, C, D, A, C, E, D, B: 8 of 8 lines. Every line has been drawn exactly once.");
  await figure.getByRole("button", { name: "Try a square with both diagonals" }).click();
  await expect(figure).toContainText("4 degrees are odd, so no single stroke can draw it");
  await figure.getByRole("button", { name: "Try a star inside a pentagon" }).click();
  await expect(figure).toContainText("Every degree is even, so the figure can be drawn in one stroke that ends where it began.");
});

test("the leaf-stripping figure keeps a tree and writes its code", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="leaf-strip"]').first().getByRole("figure");
  await expect(figure).toContainText("A branching tree on 8 numbered vertices, with 7 edges. No leaves removed yet. What is left is still a tree, with 8 vertices and 7 edges. The smallest leaf now is 1, attached to 4.");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase leaves removed" }).click();
  await expect(figure).toContainText("the code so far is (4, 4, 4). What is left is still a tree, with 5 vertices and 4 edges. The smallest leaf now is 4, attached to 5.");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase leaves removed" }).click();
  await expect(figure).toContainText("Removed 6 leaves so far, 1, 2, 3, 4, 5, 7, writing down the neighbour of each: the code so far is (4, 4, 4, 5, 6, 6).");
  await expect(figure).toContainText("Two vertices remain, joined by one edge, so the code is complete: 6 numbers, each from 1 to 8");
});

test("the dice grid counts an event, then conditions on another", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="dice-grid"]').first().getByRole("figure");
  await expect(figure).toContainText("The event that the total is 7 contains 6 of them, so its probability is 6/36 = 1/6.");
  await figure.getByRole("button", { name: "Event: the two dice match" }).click();
  await expect(figure).toContainText("The event that the two dice match contains 6 of them, so its probability is 6/36 = 1/6.");
  await figure.getByRole("button", { name: "Given: the total is 7" }).click();
  await expect(figure).toContainText("0 of them also have the two dice match, so the chance that the two dice match, given that the total is 7, is 0/6.");
  await expect(figure).toContainText("Knowing the condition makes it less likely.");
});

test("the Bayes square splits ten thousand people by condition and by test", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="bayes-square"]').first().getByRole("figure");
  await expect(figure).toContainText("given a positive test, the chance of having it is 90/585, about 15%, against 1% before the test.");
  await slide(figure, "have the condition", "6", "given a positive test, the chance of having it is 900/1,350, about 67%, against 10% before the test.");
  await slide(figure, "positive if they do not", "1", "So 990 people test positive, and 900 of them have the condition");
});

test("the variable bars show a distribution and add up its chances", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="variable-bars"]').first().getByRole("figure");
  await expect(figure).toContainText("the larger of the two numbers takes 6 values: 1 in 1, 2 in 3, 3 in 5, 4 in 7, 5 in 9, 6 in 11. The most likely value is 6, with chance 11/36.");
  await figure.getByRole("button", { name: "Show the total of the two dice" }).click();
  await expect(figure).toContainText("The most likely value is 7, with chance 1/6.");
  const add = figure.getByRole("button", { name: "Add up the chances" });
  await add.click();
  await expect(add).toHaveAttribute("aria-pressed", "true");
  await expect(figure).toContainText("6: 15/36, 7: 21/36, 8: 26/36");
  await expect(figure).toContainText("the last reaches 36/36 = 1.");
});

test("the distribution bars change trials, chance and family", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="distribution-bars"]').first().getByRole("figure");
  await expect(figure).toContainText("the number of successes in 20 independent trials, each a success with chance 0.1. Its mean is np = 2");
  for (let i = 0; i < 10; i++) await figure.getByRole("button", { name: "Increase trials" }).click();
  await expect(figure).toContainText("in 30 independent trials, each a success with chance 0.1. Its mean is np = 3 and its standard deviation is about 1.64.");
  await slide(figure, "chance of success", "0.5", "Its mean is np = 15 and its standard deviation is about 2.74. The most likely value is 15, with chance 0.144.");
  await figure.getByRole("button", { name: "Show the geometric distribution" }).click();
  await expect(figure).toContainText("The geometric distribution: the number of independent trials up to and including the first success, each a success with chance 0.5. Its mean is 1/p = 2");
});

test("the density figure shades a chance as an area", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="density-area"]').first().getByRole("figure");
  await expect(figure).toContainText("The chance that it lands between 4 and 6 minutes is the shaded area, about 0.2. The height of the curve at 5 minutes is 0.1 per minute: a density, not a chance.");
  await slide(figure, "to", "10", "The chance that it lands between 4 and 10 minutes is the shaded area, about 0.6.");
  await figure.getByRole("button", { name: "Show the triangular distribution" }).click();
  await expect(figure).toContainText("a triangular distribution. The chance that it lands between 4 and 10 minutes is the shaded area, about 0.68.");
});

test("the birthday curve finds where a shared value becomes likely", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="birthday-curve"]').first().getByRole("figure");
  await expect(figure).toContainText("23 people, each with one of 365 birthdays picked at random. The chance that at least two share one is 50.7%");
  await slide(figure, "people", "40", "The chance that at least two share one is 89.1%");
  await figure.getByRole("button", { name: "Use four-digit PINs" }).click();
  await expect(figure).toContainText("The chance first reaches one half at 119 customers, close to 1.18 × √10,000 ≈ 118 and far fewer than 10,000.");
});

test("the tail bounds sit above the true chance, loosest first", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="tail-bounds"]').first().getByRole("figure");
  await expect(figure).toContainText("the chance of 70 heads or more is 3.9 × 10^−5. Markov's inequality, which knows only the mean, promises at most 0.7143.");
  await slide(figure, "at least", "60", "the chance of 60 heads or more is 0.0284. Markov's inequality, which knows only the mean, promises at most 0.8333. Chebyshev's, which also knows the standard deviation, promises at most 0.25.");
  await figure.getByRole("button", { name: "Show requests in a second" }).click();
  await expect(figure).toContainText("For requests in a second, Poisson with mean 4");
  await expect(figure).toContainText("Every bound is at least the true chance, as a guarantee must be.");
});

test("the sample means turn into a bell as each average takes more draws", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="sample-means"]').first().getByRole("figure");
  await expect(figure).toContainText("2,000 averages, each of 1 draw from throws of a fair die.");
  await slide(figure, "draws in each average", "3", "2,000 averages, each of 10 draws from throws of a fair die. The averages centre on 3.481, against a true mean of 3.5. Their standard deviation is 0.539, close to σ/√n = 1.708/√10 = 0.54.");
  await figure.getByRole("button", { name: "Average exponential waits with mean 1 minute" }).click();
  await expect(figure).toContainText("each of 10 draws from exponential waits with mean 1 minute.");
});

test("the Monte Carlo figure estimates π, and the poor generator gets stuck on five lines", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="monte-carlo"]').first().getByRole("figure");
  await expect(figure).toContainText("1,000 points from a good generator, seed 0, each made of two draws. 780 land inside the quarter circle, so the estimate of π is 4 × 780/1,000 = 3.12, with a standard error of about 0.052.");
  await slide(figure, "points", "4", "so the estimate of π is 4 × 7,912/10,000 = 3.165, with a standard error of about 0.016.");
  await expect(figure).toContainText("The picture shows the first 2,000 points.");
  const poor = figure.getByRole("button", { name: "Use the poor generator" });
  await poor.click();
  await expect(poor).toHaveAttribute("aria-pressed", "true");
  await expect(figure).toContainText("Only 1,024 of the points are different, because the generator repeats after 2,048 draws, and every pair lies on one of five lines.");
  await figure.getByRole("button", { name: "Increase seed" }).click();
  await expect(figure).toContainText("seed 1, each made of two draws. 7,724 land inside the quarter circle, so the estimate of π is 4 × 7,724/10,000 = 3.09");
});

test("the summary marks show the mean chasing one slow request while the median stays", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="summary-marks"]').first().getByRole("figure");
  await expect(figure).toContainText("20 response times in milliseconds, the slowest 120 ms. The mean is 62.45 ms");
  await slide(figure, "slowest request", "5000", "the slowest 5,000 ms. The mean is 306.45 ms: the total, 6,129 ms, shared equally. The median is 57 ms");
  await slide(figure, "percentile", "100", "The 100th percentile is 5,000 ms, the slowest, because at least 100% of the times must be at or below it.");
});

test("the tail plot sets an exponential tail against a power law", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="tail-plot"]').first().getByRole("figure");
  await expect(figure).toContainText("so its p99 is 141 ms, its p99.9 447 ms and its p99.99 1,414 ms. Its mean is 28 ms.");
  await slide(figure, "tail exponent", "10", "every doubling of the time divides the chance by 2, so its p99 is 1,000 ms, its p99.9 10,000 ms and its p99.99 1,00,000 ms. Its mean is infinite");
  await slide(figure, "tail exponent", "30", "so its p99 is 74 ms, its p99.9 159 ms and its p99.99 342 ms. Its mean is 24 ms.");
});

test("the histogram changes shape with the number and kind of buckets", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="histogram-bins"]').first().getByRole("figure");
  await expect(figure).toContainText("counted in 12 buckets each 20.8 ms wide. The tallest bucket, from 0 to 21 ms, holds 215 of them. 3 buckets are empty.");
  const log = figure.getByRole("button", { name: "Use logarithmic buckets" });
  await log.click();
  await expect(log).toHaveAttribute("aria-pressed", "true");
  await expect(figure).toContainText("counted in 12 buckets whose edges grow by a factor of 1.58. The tallest bucket, from 16 to 25 ms, holds 97 of them. 1 bucket is empty.");
  await slide(figure, "buckets", "60", "counted in 60 buckets whose edges grow by a factor of 1.1. The tallest bucket, from 13 to 14 ms, holds 24 of them. 15 buckets are empty.");
});

test("the estimator figure shows standard error shrinking and the biased variance", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="estimator-spread"]').first().getByRole("figure");
  await expect(figure).toContainText("The estimates average 26.3 ms, close to the truth, and spread with a standard deviation of 6.8 ms");
  await figure.getByRole("button", { name: "Estimate the median" }).click();
  await slide(figure, "sample size", "4", "each of 100 response times drawn at random from a population of 2,000 whose median is 20.3 ms. Each sample gives one estimate, the median. The estimates average 20.5 ms, close to the truth, and spread with a standard deviation of 1.9 ms");
  await figure.getByRole("button", { name: "Estimate the 90th percentile" }).click();
  await figure.getByRole("button", { name: "Estimate the variance, dividing by n" }).click();
  await slide(figure, "sample size", "0", "The estimates average 392.3 ms², below the truth by 84.3 ms²");
});

test("the interval figure counts how many intervals catch the true mean", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="interval-catch"]').first().getByRole("figure");
  await expect(figure).toContainText("96 of the 100 intervals catch it and 4 miss, against 95 expected. The intervals are 8.5 ms wide on average.");
  await slide(figure, "sample size", "0", "86 of the 100 intervals catch it and 14 miss, against 95 expected. The intervals are 34.3 ms wide on average. With samples this small");
  await slide(figure, "sample size", "4", "96 of the 100 intervals catch it");
  await slide(figure, "confidence", "3", "each with its 99% interval for the mean, the sample mean plus or minus 2.58 standard errors. The true mean is 26.3 ms. 99 of the 100 intervals catch it and 1 miss");
});

test("the permutation test finds a real difference once the groups are large", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="null-test"]').first().getByRole("figure");
  await expect(figure).toContainText("The observed difference of means, B minus A, is 4.73 ms.");
  await expect(figure).toContainText("194 times, so the p-value is about 0.194. That is not below 0.05");
  await slide(figure, "group size", "4", "is 6.72 ms. Shuffling the 400 times between the groups at random 1,000 times, as if the labels meant nothing, gave a difference at least that large in size 3 times, so the p-value is about 0.003. That is below 0.05");
  await slide(figure, "added to group B", "0", "444 times, so the p-value is about 0.444.");
});

test("the bootstrap resamples one sample into an interval", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="bootstrap"]').first().getByRole("figure");
  await expect(figure).toContainText("1,000 resampled medians with a standard deviation of 1.9 ms: the bootstrap standard error. Dropping the lowest and highest 25 leaves the 95% interval 18.2 to 26.2 ms.");
  await figure.getByRole("button", { name: "Resample the 90th percentile" }).click();
  await expect(figure).toContainText("One sample of 50 response times, whose 90th percentile is 57 ms.");
  await slide(figure, "sample size", "0", "1,000 resampled 90th percentiles with a standard deviation of 20.4 ms: the bootstrap standard error. Dropping the lowest and highest 25 leaves the 95% interval 34.7 to 101.2 ms.");
});

test("peeking at an A/B test declares false winners", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="ab-test"]').first().getByRole("figure");
  await expect(figure).toContainText("The test drawn dips below 0.05 on day 9 and is not below 0.05 at any look, so it is reported as no difference.");
  await expect(figure).toContainText("declares the versions different in 6.8% of them, every one a false alarm.");
  await slide(figure, "looks", "6", "The test is looked at 30 times, every day. The test drawn dips below 0.05 on day 9 and is below 0.05 at the look on day 9, so stopping there declares a difference. Over 400 tests like it, stopping at the first look with p below 0.05 declares the versions different in 27.8% of them");
  await slide(figure, "true lift", "10", "declares the versions different in 88.3% of them.");
});

test("the benchmark figure shows drift posing as a difference until the runs are interleaved", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="benchmark-runs"]').first().getByRole("figure");
  await expect(figure).toContainText("Measured B against A: median +3.1%, minimum +5%, mean +0.2%, against a true 0%.");
  const interleave = figure.getByRole("button", { name: "Interleave the runs" });
  await interleave.click();
  await expect(interleave).toHaveAttribute("aria-pressed", "true");
  await expect(figure).toContainText("Measured B against A: median −0.9%, minimum 0%, mean −1.1%, against a true 0%.");
  await figure.getByRole("button", { name: "Drop the first 5 runs" }).click();
  await slide(figure, "true difference", "-5", "B is truly 5% faster than A.");
  await expect(figure).toContainText("Measured B against A: median −5.5%, minimum −5%, mean −6.5%, against a true −5%.");
});

test("the recursion tree adds up each level's work in the three cases of the master theorem", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="recursion-tree"]').first().getByRole("figure");
  await expect(figure).toContainText("The levels, from the top, do 16, 16, 16, 16, 16 steps of work, 80 in all.");
  await slide(figure, "subproblems", "3", "The levels, from the top, do 16, 24, 36, 54, 81 steps of work, 211 in all. Each level does 3/2 times the work of the level above, so the leaves dominate and the total is Θ(n^1.58)");
  await slide(figure, "work exponent", "2", "The levels, from the top, do 256, 192, 144, 108, 81 steps of work, 781 in all. Each level does 3/4 of the work of the level above, so the top level dominates and the total is Θ(n²).");
});

test("the spanning tree reaches the same total by Kruskal's and Prim's methods", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="spanning-tree"]').first().getByRole("figure");
  await expect(figure).toContainText("Kruskal's method, after 0 of 9 roads considered, shortest first. Taken: none yet, 0 in all. Next to consider: A–C 1.");
  for (let i = 0; i < 6; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Taken: A–C 1, C–B 2, D–E 2, E–F 3, B–D 5, 13 in all. Skipped, because each would close a loop: A–B 4.");
  await figure.getByRole("button", { name: "Switch to Prim's method" }).click();
  await expect(figure).toContainText("Prim's method from A, after 0 roads added. In the tree: A.");
  for (let i = 0; i < 5; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Roads taken: A–C 1, C–B 2, B–D 5, D–E 2, E–F 3, 13 in all. Every town is joined, by 5 roads.");
});

test("only earliest finish first fits the most bookings into the hall", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="interval-schedule"]').first().getByRole("figure");
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Taken: B (9 am to 12 noon), D (12 noon to 3 pm), F (3 pm to 6 pm), H (6 pm to 8 pm).");
  await expect(figure).toContainText("4 bookings fit. The most that can fit is 4, so this rule finds the best.");
  const start = figure.getByRole("button", { name: "Earliest start first" });
  await start.click();
  await expect(start).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Taken: A (8 am to 7 pm). Skipped, because each overlaps one already taken: B, C, D, E, F, G, H. 1 booking fit.");
  await figure.getByRole("button", { name: "Shortest first" }).click();
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Taken: C (11 am to 1 pm), E (2 pm to 4 pm), G (5 pm to 7 pm).");
  await expect(figure).toContainText("3 bookings fit. The most that can fit is 4, so this rule falls short.");
});

test("random pivots save quicksort from input already in order", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="quick-pivot"]').first().getByRole("figure");
  await expect(figure).toContainText("Quicksort on 16 numbers already in order, taking the first item as the pivot. It partitions on 15 levels and makes 120 comparisons.");
  await figure.getByRole("button", { name: "Shuffle the input" }).click();
  await expect(figure).toContainText("Quicksort on 16 numbers in a shuffled order, taking the first item as the pivot. It partitions on 5 levels and makes 46 comparisons.");
  const random = figure.getByRole("button", { name: "Choose pivots at random" });
  await random.click();
  await expect(random).toHaveAttribute("aria-pressed", "true");
  await expect(figure).toContainText("It partitions on 7 levels and makes 48 comparisons. Over 1,000 runs with random pivots, on any order of the input, the comparisons average 50.9, ranging from 40 to 89.");
  await figure.getByRole("button", { name: "Shuffle the input" }).click();
  await expect(figure).toContainText("Quicksort on 16 numbers already in order, taking a pivot chosen at random, seed 0. It partitions on 5 levels and makes 46 comparisons.");
});

test("2-opt shortens the nearest-neighbour tour one reversal at a time", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="tour-heuristic"]').first().getByRole("figure");
  await expect(figure).toContainText("The tour that nearest neighbour builds from A: A, I, D, E, F, C, B, G, H, and back to A, 312.7 km.");
  await expect(figure).toContainText("the tour ends with 87.3 km from G to H and 71.6 km back to A.");
  await figure.getByRole("button", { name: "Increase improvements" }).click();
  await expect(figure).toContainText("After 1 improvement: A, I, G, B, C, F, E, D, H, and back to A, 263.7 km. This step reversed the stretch from D to G, replacing the roads D–I and G–H with G–I and D–H, 49 km shorter.");
  await figure.getByRole("button", { name: "Increase improvements" }).click();
  await expect(figure).toContainText("After 2 improvements: A, I, H, D, E, F, C, B, G, and back to A, 226.4 km.");
  await expect(figure).toContainText("37.3 km shorter. Another reversal can still shorten it.");
  await figure.getByRole("button", { name: "Increase improvements" }).click();
  await expect(figure).toContainText("After 3 improvements: A, I, D, H, E, F, C, B, G, and back to A, 213.9 km.");
  await expect(figure).toContainText("No single reversal shortens it further. Checking all 20,160 possible tours confirms that, here, it is also the shortest of them all.");
});

test("a set of columns is a key only when no two rows agree on all of them", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="table-keys"]').first().getByRole("figure");
  await expect(figure).toContainText("Columns chosen: rider, day. Rows 1 and 2 agree on all of them (Asha, Mon), so these columns do not single out every row: not a key.");
  await figure.getByRole("button", { name: "slot", exact: true }).click();
  await expect(figure).toContainText("Columns chosen: rider, day, slot. No two of the 8 rows agree on all of them, so they single out every row: a superkey. Dropping any one column breaks this, so no smaller set works: a candidate key.");
});

test("each operation of the relational algebra builds a new table", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="algebra-ops"]').first().getByRole("figure");
  await expect(figure).toContainText("σ store = 'KOR' (Riders): keep the rows of Riders whose store is KOR. 2 of the 3 rows pass: Asha KOR, Chitra KOR.");
  await figure.getByRole("button", { name: "⋈ join", exact: true }).click();
  await expect(figure).toContainText("3 rows: Asha KOR Meena, Bilal IND Ravi, Chitra KOR Meena. HSR has no rider, so it does not appear.");
  await figure.getByRole("button", { name: "− difference", exact: true }).click();
  await expect(figure).toContainText("Mon − Tue: the riders on Monday's list but not on Tuesday's: Asha.");
});

test("a query is evaluated from its table to its limit", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="query-order"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 5. FROM orders: start with every row of the table, 7 rows.");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Step 5 of 5. LIMIT 2: keep the first 2 rows of the sorted result. The table now holds 2 rows: Asha 1,200; Chitra 650.");
});

test("an outer join keeps unmatched rows and pads them with NULL", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="join-match"]').first().getByRole("figure");
  await expect(figure).toContainText("3 rows, 3 of them matched pairs: Asha 101 250; Asha 102 480; Chitra 103 900.");
  await figure.getByRole("button", { name: "full join", exact: true }).click();
  await expect(figure).toContainText("6 rows, 3 of them matched pairs: Asha 101 250; Asha 102 480; Chitra 103 900; Bilal NULL NULL; Dev NULL NULL; NULL 104 120.");
});

test("grouping folds each store's rows into one, and having filters the groups", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="group-buckets"]').first().getByRole("figure");
  await expect(figure).toContainText("Each group becomes one row: HSR 560, IND 1,920, KOR 2,580. Every group has at least 1 row, so having keeps them all.");
  await figure.getByRole("button", { name: "avg(amount)", exact: true }).click();
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase having count(*) at least" }).click();
  await expect(figure).toContainText("Each group becomes one row: HSR 280, IND 640, KOR 645. Having drops HSR, with fewer than 3 rows. Result: IND 640; KOR 645.");
});

test("a correlated subquery is evaluated again for every outer row", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="subquery-steps"]').first().getByRole("figure");
  await expect(figure).toContainText("The subquery mentions o.store, a column of the outer row, so it is re-evaluated for each of the 9 orders.");
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase outer row" }).click();
  await expect(figure).toContainText("Outer row 8 of 9: order 8, ₹410 at HSR. The subquery runs again with o.store = 'HSR' and returns that store's average, ₹280. ₹410 is above it, so the order is kept. Kept so far: 2, 5, 7, 8.");
});

test("a window gives every row a value computed from the rows around it", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="window-frame"]').first().getByRole("figure");
  await expect(figure).toContainText("Current row 3: KOR, day 3, ₹1,500. Its frame is KOR days 1 to 3: 1,200 + 900 + 1,500 = 3,600.");
  await figure.getByRole("button", { name: "3-day average", exact: true }).click();
  await figure.getByRole("button", { name: "Increase current row" }).click();
  await expect(figure).toContainText("Current row 4: KOR, day 4, ₹800. Its frame is KOR days 2 to 4: (900 + 1,500 + 800) ÷ 3 = 1,066.67.");
  await figure.getByRole("button", { name: "rank", exact: true }).click();
  await expect(figure).toContainText("KOR amounts above ₹800: 1,200, 900, 1,500, 2,100, so its rank is 1 + 4 = 5.");
});

test("unknown is filled in both ways, and the result is known only when both agree", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="three-valued"]').first().getByRole("figure");
  await expect(figure).toContainText("Selected: unknown and false. Filling in the unknown: true and false = false; false and false = false. Every filling gives false, so the result is false.");
  await figure.getByRole("button", { name: "or", exact: true }).click();
  await expect(figure).toContainText("Selected: unknown or false. Filling in the unknown: true or false = true; false or false = false. The fillings disagree, so the result is unknown.");
  await figure.getByRole("button", { name: "not", exact: true }).click();
  await expect(figure).toContainText("Selected: not false. Nothing is unknown: ordinary logic gives true.");
});

test("a power cut loses money without a transaction and nothing inside one", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="transfer-crash"]').first().getByRole("figure");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("on disk, Asha ₹500 and Bilal ₹200, ₹700 in all. The debit was saved and the credit never ran: ₹500 lost.");
  await figure.getByRole("button", { name: "inside a transaction", exact: true }).click();
  await expect(figure).toContainText("Step 2 of 3, after: update wallets set balance = balance - 500 where name = 'Asha'. This connection sees Asha ₹500 and Bilal ₹200; on disk, Asha ₹1,000 and Bilal ₹200, ₹1,200 in all.");
  await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("on disk, Asha ₹1,000 and Bilal ₹200, ₹1,200 in all. The unfinished transaction is undone: nothing lost.");
});

test("an index search takes a few comparisons where a scan reads every row", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="index-lookup"]').first().getByRole("figure");
  for (let i = 0; i < 16; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Rows read: 16 of 16. Found so far: order 2, order 11. A scan reads all 16 rows: another Meera could be anywhere.");
  await figure.getByRole("button", { name: "index search", exact: true }).click();
  await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Comparison 1: entry 9 is Nisha, not before Meera, so look here or earlier.");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("After 4 comparisons, entries 7 and 8 hold Meera: orders 2 and 11. About log₂ 16 = 4 comparisons, then one read per match.");
});

test("each kind of relationship becomes its own arrangement of tables", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="er-cardinality"]').first().getByRole("figure");
  await expect(figure).toContainText("One to many: Each teacher teaches any number of batches, and each batch has exactly one teacher. As tables: teachers (id, name); batches (id, subject, teacher).");
  await figure.getByRole("button", { name: "many to many", exact: true }).click();
  await expect(figure).toContainText("The rule: a junction table, enrolments, holds a foreign key to each side and the fee.");
  await figure.getByRole("button", { name: "one to one", exact: true }).click();
  await expect(figure).toContainText("The rule: laptops.employee is a foreign key declared unique.");
});

test("a closure grows rule by rule until it covers every column or stops short", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="fd-closure"]').first().getByRole("figure");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Known so far: 8 of 8 columns, pnr, pax, name, train, train_name, date, coach, berth. The closure is all 8 columns, so {pnr, pax} is a superkey, and dropping any one of its columns loses that: a candidate key.");
  await figure.getByRole("button", { name: "pax", exact: true }).click();
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Known so far: 4 of 8 columns, pnr, train, train_name, date. No rule adds anything more, and 4 of the 8 columns are missing, so {pnr} is not a key.");
});

test("normalising splits one wide table until each fact is stored once", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="normalise-steps"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 3, one wide table: flat (student, s_phone, batch, subject, teacher, t_phone, fee) with 6 rows.");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Step 3 of 3, third normal form: students (student, s_phone) with 4 rows; enrolments (student, batch, fee) with 6 rows; batches (batch, subject, teacher) with 3 rows; teachers (teacher, t_phone) with 2 rows.");
});

test("a stored count pays off only when reads far outnumber writes", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="denorm-tradeoff"]').first().getByRole("figure");
  await expect(figure).toContainText("Keeping a likes column reads 2,00,000 rows and writes 4,000, since each like also updates its post: 2,04,000 in all. The count column touches 98 times fewer rows.");
  await figure.getByRole("button", { name: "0.01 views per like" }).click();
  await expect(figure).toContainText("Keeping a likes column reads 20 rows and writes 4,000, since each like also updates its post: 4,020 in all. Both touch about the same number of rows, so the column buys nothing.");
});

test("embedding a customer saves a read and costs a write per copy", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="doc-embed"]').first().getByRole("figure");
  await figure.getByRole("button", { name: "1,000 orders" }).click();
  await expect(figure).toContainText("Showing an order with its customer takes 1 read. When Asha changes her phone number, 1,000 documents must be rewritten, and any one missed shows the old number.");
  await figure.getByRole("button", { name: "reference", exact: true }).click();
  await expect(figure).toContainText("Showing an order with its customer takes 2 reads. When Asha changes her phone number, 1 document is rewritten.");
});

test("each hop through a graph is one more self-join", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="graph-hops"]').first().getByRole("figure");
  await expect(figure).toContainText("Within 1 hop of Asha: Bilal, Chitra, Dev, 3 people besides Asha.");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase hops" }).click();
  await expect(figure).toContainText("Within 4 hops of Asha: Bilal, Chitra, Dev, Esha, Farhan, Gita, Hari, Isha, Jai, 9 people besides Asha. In tables, a query for exactly this reach joins the friendships table to itself 4 times");
});

test("each change to a record's shape breaks a different pair of versions", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="schema-versions"]').first().getByRole("figure");
  await expect(figure).toContainText("The change is backward and forward compatible, so old and new versions can run side by side.");
  await figure.getByRole("button", { name: "rename", exact: true }).click();
  await expect(figure).toContainText("New code reading old data fails: phone missing. Old code reading new data fails: mobile missing. The change is neither backward nor forward compatible");
  await figure.getByRole("button", { name: "add required", exact: true }).click();
  await expect(figure).toContainText("The change is forward compatible only: old code reads new data, but new code cannot read old data.");
});

test("an interface turns places times providers into places plus providers", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="interface-swap"]').first().getByRole("figure");
  await expect(figure).toContainText("4 places in the app each talk to each of the 3 providers directly: 4 × 3 = 12 pieces of provider-specific code.");
  await figure.getByRole("button", { name: "through an interface", exact: true }).click();
  await expect(figure).toContainText("4 + 3 = 7 pieces of code, and only the 3 adapters know anything about a provider.");
  await figure.getByRole("button", { name: "Increase providers" }).click();
  await expect(figure).toContainText("4 + 4 = 8 pieces of code");
});

test("a change ripples up through every module that imports it", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="change-ripple"]').first().getByRole("figure");
  await expect(figure).toContainText("Changing money: orders, payments, menu import it directly, and app, delivery import it through them. 5 modules of 8 must be checked again.");
  await figure.getByRole("button", { name: "app", exact: true }).click();
  await expect(figure).toContainText("Changing app: no module imports it, so nothing else needs checking.");
});

test("flags allow states that an enum cannot express", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="state-flags"]').first().getByRole("figure");
  await expect(figure).toContainText("Flags: paid, shipped. No order can be in this state: shipped but never packed.");
  await figure.getByRole("button", { name: "packed", exact: true }).click();
  await expect(figure).toContainText("Flags: paid, packed, shipped. This is a real state, SHIPPED.");
});

test("an error travels up until a caller that can handle it", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="error-unwind"]').first().getByRole("figure");
  await expect(figure).toContainText("gateway.charge raises CardDeclined. It travels up through charge_with_retries, which does not handle it, until place_order catches it.");
  await figure.getByRole("button", { name: "three timeouts", exact: true }).click();
  await expect(figure).toContainText("then gives up after the third and raises the Timeout again. place_order catches it.");
  await figure.getByRole("button", { name: "bug: KeyError", exact: true }).click();
  await expect(figure).toContainText("neither of which handles it, until handle_request catches it.");
});

test("passing the clock in makes a time-dependent test pass at every hour", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="di-clock"]').first().getByRole("figure");
  await expect(figure).toContainText("The clock is read inside is_open. Run at 23:00, the test gets False and fails.");
  await figure.getByRole("button", { name: "clock passed in", exact: true }).click();
  await expect(figure).toContainText("it passes, as it does at every hour of the day, and it now checks closing time too.");
});

test("a fee is chosen by looking a plan up in a table", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="fee-strategy"]').first().getByRole("figure");
  await expect(figure).toContainText('PLANS["distance"] is the function by_distance: ₹10 + ₹8 per km. For 4 km and an order of ₹300: 10 + 8 × 4 = ₹42.');
  await figure.getByRole("button", { name: "free_over_500", exact: true }).click();
  await figure.getByRole("button", { name: "order of ₹650", exact: true }).click();
  await expect(figure).toContainText("For 4 km and an order of ₹650: ₹650 is at least ₹500, so ₹0.");
});

test("testing after each change leaves one suspect, testing at the end leaves them all", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="refactor-steps"]').first().getByRole("figure");
  await expect(figure).toContainText("The slip in change 5 makes the run straight after it fail, so change 5 is the only suspect");
  await figure.getByRole("button", { name: "test once at the end", exact: true }).click();
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase changes" }).click();
  await expect(figure).toContainText("any of the 20 changes could be the cause. At a 5% chance of a slip per change, all 20 are right only 36% of the time.");
});

test("new posts repeat items on an offset page but not on a cursor page", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="page-cursor"]').first().getByRole("figure");
  await expect(figure).toContainText("The 2 new posts pushed everything down by 2, so the first 2 posts of page 2 are ones the reader already saw on page 1.");
  await figure.getByRole("button", { name: "by cursor", exact: true }).click();
  await expect(figure).toContainText("Page 2 asks for the 5 posts older than post 36. New posts at the top do not move that point, so page 2 is post 35 to post 31 with no repeats");
});

test("the weights of a decision matrix decide its winner", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="decision-matrix"]').first().getByRole("figure");
  await expect(figure).toContainText("With these weights, object storage wins with 42, ahead of own file servers at 34 and one database server at 27. The winner changes if the weight of scaling goes from 5 to 1");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Decrease weight of scaling" }).click();
  await expect(figure).toContainText("With these weights, one database server wins with 23, ahead of object storage at 22 and own file servers at 18.");
});

test("a commit stores only the objects whose contents changed", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="content-store"]').first().getByRole("figure");
  await expect(figure).toContainText("Commit 2 changes app.py: 1 new blob, 1 new tree and 1 new commit, 3 objects added.");
  await figure.getByRole("button", { name: "menu.csv", exact: true }).click();
  await expect(figure).toContainText("2 new blobs, 1 new tree and 1 new commit, 4 objects added.");
  await figure.getByRole("button", { name: "app.py", exact: true }).click();
  await figure.getByRole("button", { name: "menu.csv", exact: true }).click();
  await expect(figure).toContainText("Commit 2 changes no file, so its tree has the same entries and the same id as commit 1's");
});

test("a three-way merge conflicts only where both sides changed a line differently", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="three-way-merge"]').first().getByRole("figure");
  await expect(figure).toContainText("1 line changed only on ours, so ours is taken; 1 line changed only on theirs, so theirs is taken.");
  await figure.getByRole("button", { name: "same line, different edits", exact: true }).click();
  await expect(figure).toContainText("1 line changed differently on both, a conflict that a person must resolve.");
  await figure.getByRole("button", { name: "same edit on both", exact: true }).click();
  await expect(figure).toContainText("1 line changed the same way on both, so that change is taken once.");
});

test("splitting a large change into smaller pull requests catches more defects", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="review-size"]').first().getByRole("figure");
  await expect(figure).toContainText("One pull request of 1,200 lines.");
  await expect(figure).toContainText("a review catches about 1.4 of them on average");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase pull requests" }).click();
  await expect(figure).toContainText("4 pull requests of 300 lines each.");
  await expect(figure).toContainText("the reviews catch about 5.6 of the 12 on average.");
});

test("a change rebuilds only the targets that depend on it", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="build-graph"]').first().getByRole("figure");
  await expect(figure).toContainText("Changing utils.h rebuilds menu.o, orders.o, app and tests: 4 of 7 targets.");
  await figure.getByRole("button", { name: "pay.c", exact: true }).click();
  await expect(figure).toContainText("Changing pay.c rebuilds pay.o, app and tests: 3 of 7 targets.");
});

test("a resolver picks the newest version both ranges allow, or fails", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="version-ranges"]').first().getByRole("figure");
  await expect(figure).toContainText("The resolver picks the newest, 1.10.0, and the lock file records it");
  await figure.getByRole("button", { name: "^2.0.0", exact: true }).click();
  await expect(figure).toContainText("No published version satisfies both, so installation fails");
  await figure.getByRole("button", { name: "~1.5.0", exact: true }).click();
  await expect(figure).toContainText("Only 1.5.2 satisfies both.");
});

test("bisection finds the first bad commit of 64 in six tests", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="bisect-commits"]').first().getByRole("figure");
  await expect(figure).toContainText("The first bad commit could be any of commits 1 to 63. The first test is commit 31, halfway.");
  await figure.getByRole("button", { name: "Increase tests done" }).click();
  await expect(figure).toContainText("Test 1: commit 31 is good, so the first bad commit comes after it. 32 commits remain as candidates, 32 to 63; next, test commit 47.");
  for (let i = 0; i < 5; i++) await figure.getByRole("button", { name: "Increase tests done" }).click();
  await expect(figure).toContainText("After 6 tests, commit 40 is good and commit 41 is bad, so commit 41 introduced the bug.");
});

test("speeding up a small part of a program barely helps the whole", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="amdahl-speedup"]').first().getByRole("figure");
  await expect(figure).toContainText("Making it 10 times faster brings the whole program from 60 to 49.2 seconds, 1.22 times faster.");
  await expect(figure).toContainText("the whole could never be more than 1.25 times faster.");
  await figure.getByRole("button", { name: "parse", exact: true }).click();
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Decrease times faster" }).click();
  await expect(figure).toContainText("Making it 2 times faster brings the whole program from 60 to 43.5 seconds, 1.38 times faster.");
});

test("more runners shorten a pipeline only until the longest job decides", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="ci-pipeline"]').first().getByRole("figure");
  await expect(figure).toContainText("With 1 runner, installing takes 6 minutes, the four checks are done 19 minutes after that");
  await expect(figure).toContainText("32 minutes from push to result.");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase runners" }).click();
  await expect(figure).toContainText("22 minutes from push to result. The 9-minute unit tests now set the length of the middle stage");
  await figure.getByRole("button", { name: "cache dependencies", exact: true }).click();
  await expect(figure).toContainText("installing takes 1 minute");
  await expect(figure).toContainText("17 minutes from push to result.");
});

test("random tests rarely land on a boundary that boundary tests always try", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="boundary-tests"]').first().getByRole("figure");
  await expect(figure).toContainText("100 random amounts from ₹0 to ₹2,000: none is exactly ₹1,000, so every one passes");
  await figure.getByRole("button", { name: "1,000", exact: true }).click();
  await expect(figure).toContainText("1 test landed on ₹1,000 and failed");
  await expect(figure).toContainText("find it 39.3% of the time");
  await figure.getByRole("button", { name: "boundary tests", exact: true }).click();
  await expect(figure).toContainText("the bug is found with five tests");
});

test("tests that share a cart pass only in one order, and a fixture frees them", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="test-order"]').first().getByRole("figure");
  await expect(figure).toContainText("In the order 2, 1, 3, 2 of 3 pass: empty_at_start expects that the cart is empty but finds [chai].");
  await figure.getByRole("button", { name: "1 2 3", exact: true }).click();
  await expect(figure).toContainText("In the order 1, 2, 3, all three pass.");
  await figure.getByRole("button", { name: "fresh cart per test", exact: true }).click();
  await expect(figure).toContainText("all three pass in this order, and in all 6 possible orders");
});

test("each test double trades speed, truth and tolerance of refactoring differently", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="test-doubles"]').first().getByRole("figure");
  await expect(figure).toContainText("With a fake outbox:");
  await figure.getByRole("button", { name: "strict mock", exact: true }).click();
  await expect(figure).toContainText("it fails although nothing is wrong");
  await figure.getByRole("button", { name: "real gateway", exact: true }).click();
  await expect(figure).toContainText("costs money every run");
});

test("more cases and a smaller range let a property find and shrink a bug", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="property-runs"]').first().getByRole("figure");
  await expect(figure).toContainText("None of them repeats a minute, so every case passes and the bug goes unnoticed.");
  await figure.getByRole("button", { name: "500", exact: true }).click();
  await expect(figure).toContainText("3 lists fail the property. The first failure, [1140, 539, 1378, 1140, 619], shrinks to [1140, 1140]");
  await figure.getByRole("button", { name: "draw from a small range", exact: true }).click();
  await expect(figure).toContainText("360 lists fail the property.");
});

test("the triangle rule exposes an impossible distance without knowing the right one", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="triangle-check"]').first().getByRole("figure");
  await expect(figure).toContainText("All three triangle rules hold");
  await figure.getByRole("button", { name: "480 km", exact: true }).click();
  await expect(figure).toContainText("so 480 cannot be the shortest distance");
});

test("a pyramid of tests runs faster and cleaner than a cone", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="test-pyramid"]').first().getByRole("figure");
  await expect(figure).toContainText("take about 17 minutes a run on one machine");
  await expect(figure).toContainText("67% of runs come back clean");
  await figure.getByRole("button", { name: "mostly end-to-end", exact: true }).click();
  await expect(figure).toContainText("take about 2.6 hours a run on one machine");
  await expect(figure).toContainText("4% of runs come back clean");
});

test("each new test kills more mutants until none survives", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="mutation-score"]').first().getByRole("figure");
  await expect(figure).toContainText("3 of 6 mutants killed, a mutation score of 50%.");
  await figure.getByRole("button", { name: "1,000 gives 900", exact: true }).click();
  await expect(figure).toContainText("4 of 6 mutants killed, a mutation score of 67%.");
  await figure.getByRole("button", { name: "500 gives 500", exact: true }).click();
  await expect(figure).toContainText("Every mutant is killed.");
});

test("polling never fails a correct job and waits no longer than needed", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="sleep-poll"]').first().getByRole("figure");
  await expect(figure).toContainText("5 of the 20 runs fail");
  await expect(figure).toContainText("In the long run, 25% of runs would fail.");
  await figure.getByRole("button", { name: "sleeps 5 s", exact: true }).click();
  await expect(figure).toContainText("none of the 20 runs fails, but every run waits the full 5 seconds");
  await figure.getByRole("button", { name: "polls until done", exact: true }).click();
  await expect(figure).toContainText("2.1 seconds on average");
});

test("a test on the real date fails on month ends, chosen dates fail every run", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="month-end"]').first().getByRole("figure");
  await expect(figure).toContainText("It has failed on 2 days, 31 January and 28 February, and passed on 71 other days.");
  await slide(figure, "today", "365", "It has failed on 12 days and passed on 353 other days.");
  await figure.getByRole("button", { name: "is given chosen dates", exact: true }).click();
  await expect(figure).toContainText("Four of them are month ends, so every run fails, on the same dates");
});

test("keeping inputs that reach new code gets past a header that random bytes cannot", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="fuzz-header"]').first().getByRole("figure");
  await expect(figure).toContainText("they need about 4,29,49,67,296 inputs to get past it");
  await expect(figure).toContainText("got past the whole header after 5,780 inputs");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Decrease header bytes" }).click();
  await expect(figure).toContainText("A 2-byte header.");
  await expect(figure).toContainText("got past the whole header after 903 inputs");
  await slide(figure, "inputs tried", "10", "getting past it after about 65,536 inputs");
});

test("a scanner reads the longest token at each step and stops at a character that starts none", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="token-scan"]').first().getByRole("figure");
  await expect(figure).toContainText("The scanner starts at position 0.");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase steps" }).click();
  await expect(figure).toContainText("Token 3: name base, positions 7 to 10.");
  await figure.getByRole("button", { name: "x = 3 $ 4", exact: true }).click();
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase steps" }).click();
  await expect(figure).toContainText("Position 6 holds $, which starts no token, so the scanner stops with an error that names the position, after 3 tokens.");
});

test("an automaton accepts a number or gets stuck, one character at a time", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="dfa-run"]').first().getByRole("figure");
  await expect(figure).toContainText("The automaton starts in state start, before reading 3.14.");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase characters read" }).click();
  await expect(figure).toContainText("3.14 is accepted: the automaton ends in frac");
  await figure.getByRole("button", { name: "7.", exact: true }).click();
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase characters read" }).click();
  await expect(figure).toContainText("7. is rejected: the automaton ends in dot, which does not accept.");
});

test("the same tokens in a different parse tree give a different answer", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="parse-tree"]').first().getByRole("figure");
  await expect(figure).toContainText("The tree groups (8 − 4) − 2.");
  await figure.getByRole("button", { name: "8 − 4 − 2, from the right", exact: true }).click();
  await expect(figure).toContainText("The tree groups 8 − (4 − 2). The lower subtraction gives 2 and the root gives 8 − 2 = 6.");
});

test("a tree-walker evaluates children first, and and skips its right side", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="ast-eval"]').first().getByRole("figure");
  for (let i = 0; i < 3; i++) await figure.getByRole("button", { name: "Increase steps" }).click();
  await expect(figure).toContainText("Step 3: + combines its children's values, 2 and 3, giving 5.");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase steps" }).click();
  await expect(figure).toContainText("The root's value, 30, is the value of the whole expression.");
  await figure.getByRole("button", { name: "x ≠ 0 and 10 ÷ x > 2, with x = 0", exact: true }).click();
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase steps" }).click();
  await expect(figure).toContainText("the division by zero never happens");
});

test("a stack machine pops the right operand first and runs a loop by jumping", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="stack-machine"]').first().getByRole("figure");
  await expect(figure).toContainText("The machine starts at instruction 0 with an empty stack and price = 450, tip = 50, qty = 2.");
  await slide(figure, "instructions run", "3", "Step 3: ADD pops 50 and then 450, and pushes 500.");
  await figure.getByRole("button", { name: "a loop: total += n while n > 0", exact: true }).click();
  await slide(figure, "instructions run", "45", "the run is over after 45 instructions, with n = 0, total = 6.");
});

test("a name is looked up local, enclosing, global, then built-in", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="scope-chain"]').first().getByRole("figure");
  await expect(figure).toContainText("finds it in the enclosing scope, with the value 2.");
  await figure.getByRole("button", { name: "make_counter has returned", exact: true }).click();
  await expect(figure).toContainText("count lives on in a cell that increment holds: that is a closure.");
  await figure.getByRole("button", { name: "discount", exact: true }).click();
  await expect(figure).toContainText("finds it in none, and raises NameError.");
});

test("a checker rejects before running what Python finds, or misses, while running", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="type-check"]').first().getByRole("figure");
  await expect(figure).toContainText("The checker accepts the program without running it.");
  await figure.getByRole("button", { name: "fare if seats > 0 else 'sold out'", exact: true }).click();
  await expect(figure).toContainText("The checker rejects it, although some runs would be fine.");
  await figure.getByRole("button", { name: "run with seats = 3", exact: true }).click();
  await expect(figure).toContainText("The checker rejected a run that would have worked.");
});

test("marking from the roots frees a cycle that counting references cannot", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="mark-sweep"]').first().getByRole("figure");
  await expect(figure).toContainText("The heap holds 8 objects.");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Mark: cart is reached from session, so it is marked as live. 2 of 8 objects marked so far.");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Sweep: the 3 objects never reached, log, old_cart and old_item, are freed");
  await figure.getByRole("button", { name: "count references", exact: true }).click();
  await expect(figure).toContainText("so counting alone frees none of them.");
});

test("four NAND gates make XOR, and three gates make a multiplexer", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="gate-circuit"]').first().getByRole("figure");
  await expect(figure).toContainText("A = 1, B = 0. The first NAND gives 1, the middle two give 0 and 1, and the last gives 1.");
  await figure.getByRole("button", { name: "B = 0", exact: true }).click();
  await expect(figure).toContainText("so this is a case where it is 0.");
  await figure.getByRole("button", { name: "2-to-1 multiplexer", exact: true }).click();
  await expect(figure).toContainText("S = 0 selects A, which is 1, so the output is 1.");
});

test("a ripple-carry adder subtracts by adding the complement and sets the flags", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="ripple-adder"]').first().getByRole("figure");
  await expect(figure).toContainText("A + B = 9 + 5 = 14. Four bits keep 14 (1110) and the carry out is 0.");
  for (let i = 0; i < 6; i++) await figure.getByRole("button", { name: "Increase A" }).click();
  await expect(figure).toContainText("A + B = 15 + 5 = 20. Four bits keep 4 (0100) and the carry out is 1.");
  await figure.getByRole("button", { name: "subtract", exact: true }).click();
  await expect(figure).toContainText("A − B is worked out as A + (NOT B) + 1: 15 + 10 + 1 = 26.");
  await expect(figure).toContainText("Flags: Z 0, N 1, C 1, V 0.");
});

test("a flip-flop changes only at clock edges, while a latch follows D", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="clocked-store"]').first().getByRole("figure");
  await expect(figure).toContainText("The flip-flop copies D only at a rising edge of the clock.");
  await figure.getByRole("button", { name: "D latch", exact: true }).click();
  await expect(figure).toContainText("The latch is transparent while the clock is 1, so Q follows D and is 1.");
  for (let i = 0; i < 11; i++) await figure.getByRole("button", { name: "Decrease time" }).click();
  await expect(figure).toContainText("At time 4 the clock is 0 and D is 1. The clock is 0, so the latch holds what it had when the clock fell");
});

test("the machine fetches, decodes and executes until it halts", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="fetch-execute"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 39. Fetch: the word at address 0, 0x1000, is copied into the instruction register");
  for (let i = 0; i < 11; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Step 12 of 39. Execute: the ALU computes 0 + 3 = 3 and writes it into r0.");
  await figure.getByRole("button", { name: "Increase n" }).click();
  for (let i = 0; i < 47; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("It fetched 16 instructions, and r0 holds 10.");
});

test("each RISC-V format packs its fields into one 32-bit word", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="rv-encoding"]').first().getByRole("figure");
  await expect(figure).toContainText("add x5, x6, x7 is R-type.");
  await expect(figure).toContainText("As one word it is 0x007302b3.");
  await figure.getByRole("button", { name: "beq", exact: true }).click();
  await expect(figure).toContainText("As one word it is 0x00628863.");
  await figure.getByRole("button", { name: "lui", exact: true }).click();
  await expect(figure).toContainText("As one word it is 0x123452b7.");
});

test("an assembly loop walks the array and prints the total", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="asm-trace"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 24: la puts the address of prices, 0x10010004, into t0.");
  for (let i = 0; i < 5; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Step 6 of 24: add makes the total 0 + 120 = 120.");
  for (let i = 0; i < 18; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("ecall prints a0, 465, the total of the three prices.");
});

test("each call to fact gets its own frame, and the stack shrinks back on return", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="stack-frames"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 15. main puts 3 in a0 and calls fact.");
  for (let i = 0; i < 5; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("sp = 0x7fffefcc, 48 bytes below where main left it");
  for (let i = 0; i < 9; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("Step 15 of 15. main prints a0, 6. The stack is back where it started");
});

test("pipelining finishes one instruction a cycle once the pipe is full", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="pipeline-chart"]').first().getByRole("figure");
  await expect(figure).toContainText("4 instructions through 5 stages take 8 cycles with pipelining");
  await figure.getByRole("button", { name: "not pipelined", exact: true }).click();
  await expect(figure).toContainText("4 instructions through 5 stages take 20 cycles without pipelining");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Increase instructions" }).click();
  await expect(figure).toContainText("take 30 cycles without pipelining");
  await expect(figure).toContainText("With pipelining it takes 10 cycles.");
});

test("a 2-bit predictor misses a loop's exit once a pass, a 1-bit one twice", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="branch-predictor"]').first().getByRole("figure");
  await expect(figure).toContainText("Branch 1 of 12: the predictor guessed not taken and the branch was taken, a wrong guess.");
  for (let i = 0; i < 11; i++) await figure.getByRole("button", { name: "Increase branch" }).click();
  await expect(figure).toContainText("4 wrong guesses so far. After the first pass, the 2-bit predictor gets 1 branch wrong in each pass of 4.");
  await figure.getByRole("button", { name: "1-bit", exact: true }).click();
  await expect(figure).toContainText("6 wrong guesses so far. After the first pass, the 1-bit predictor gets 2 branches wrong in each pass of 4.");
});

test("issuing out of order hides a load's wait behind independent work", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="ooo-issue"]').first().getByRole("figure");
  await expect(figure).toContainText("In order, up to 2 instructions a cycle: the program's last result is ready after cycle 8, against 5 out of order.");
  await figure.getByRole("button", { name: "out of order", exact: true }).click();
  await expect(figure).toContainText("ready after cycle 5, against 8 in order.");
  await figure.getByRole("button", { name: "Decrease width" }).click();
  await expect(figure).toContainText("Out of order, up to 1 instruction a cycle: the program's last result is ready after cycle 6, against 9 in order.");
});

test("a system call, a fault and a timer interrupt each take the processor into the kernel", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="mode-switch"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 6, in user mode: ecall with a7 = 64, the number of write.");
  for (let i = 0; i < 5; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("The program crossed into the kernel once and came back once, and never touched the terminal itself.");
  await figure.getByRole("button", { name: "load from address 0", exact: true }).click();
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("The program never asked for the kernel: its own bad load took it there, and it did not come back.");
  await figure.getByRole("button", { name: "timer fires", exact: true }).click();
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("The loop made no system call and did nothing wrong, yet the kernel took the processor back.");
});

test("fork in a loop doubles the processes, unless the children break out", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="fork-tree"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 5. Before the loop there is 1 process, pid 100.");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("each of the 8 processes prints hi, so hi appears 8 times: 2 to the power 3.");
  await figure.getByRole("button", { name: "children break out", exact: true }).click();
  await expect(figure).toContainText("each of the 4 processes prints hi, so hi appears 4 times: 3 + 1.");
});

test("each scheduling policy trades average waiting time against response", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="scheduler-gantt"]').first().getByRole("figure");
  await expect(figure).toContainText("Waiting times A 0, B 7, C 10, D 18, average 8.75 ms");
  await figure.getByRole("button", { name: "shortest job first", exact: true }).click();
  await expect(figure).toContainText("Shortest job first: A 0–8, B 8–12, D 12–17, C 17–26.");
  await figure.getByRole("button", { name: "shortest remaining time first", exact: true }).click();
  await expect(figure).toContainText("average 6.50 ms; average response 4.25 ms; 4 switches between jobs.");
  await figure.getByRole("button", { name: "round robin", exact: true }).click();
  await expect(figure).toContainText("average 13.50 ms; average response 3 ms; 9 switches between jobs.");
  for (let i = 0; i < 2; i++) await figure.getByRole("button", { name: "Decrease quantum" }).click();
  await expect(figure).toContainText("average 12.50 ms; average response 0.75 ms; 23 switches between jobs.");
});

test("the page table translates, protects and faults", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="page-table"]').first().getByRole("figure");
  await expect(figure).toContainText("so the physical address is frame 5 followed by the same offset: 0x5a2c.");
  await figure.getByRole("button", { name: "write 0x1004", exact: true }).click();
  await expect(figure).toContainText("The write raises a protection fault, and the kernel ends the process with SIGSEGV.");
  await figure.getByRole("button", { name: "read 0x4100", exact: true }).click();
  await expect(figure).toContainText("the kernel reads the page from disk into free frame 2, marks the entry present, and runs the load again, which now gives 0x2100.");
  await figure.getByRole("button", { name: "read 0x0000", exact: true }).click();
  await expect(figure).toContainText("Page 0 is not mapped at all");
});

test("the TLB hits when accesses stay on a few pages and misses when they stride across many", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="tlb"]').first().getByRole("figure");
  await expect(figure).toContainText("So far 0 hits and 1 miss, 4 extra memory reads.");
  for (let i = 0; i < 11; i++) await figure.getByRole("button", { name: "Increase access" }).click();
  await expect(figure).toContainText("So far 9 hits and 3 misses, 12 extra memory reads.");
  await figure.getByRole("button", { name: "one int per page", exact: true }).click();
  for (let i = 0; i < 11; i++) await figure.getByRole("button", { name: "Increase access" }).click();
  await expect(figure).toContainText("evicting page 1, the least recently used. So far 0 hits and 12 misses, 48 extra memory reads.");
});

test("polling, interrupts and DMA free different amounts of the processor", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="io-timeline"]').first().getByRole("figure");
  await expect(figure).toContainText("The processor spends all 21 on the transfer, 16 of them spinning on the status register");
  await figure.getByRole("button", { name: "an interrupt per word", exact: true }).click();
  await expect(figure).toContainText("The processor spends 5 units on it, starting the read and handling 4 interrupts, one per word, and has 16 units free");
  await figure.getByRole("button", { name: "DMA", exact: true }).click();
  await expect(figure).toContainText("Reading 4 words with DMA takes 18 time units");
  for (let i = 0; i < 4; i++) await figure.getByRole("button", { name: "Increase words" }).click();
  await expect(figure).toContainText("The processor spends 2 units, starting the transfer and handling 1 interrupt at the end, and has 32 units free.");
});

test("bigger files reach their last block through more levels of pointers", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="inode-blocks"]').first().getByRole("figure");
  await expect(figure).toContainText("A file of 10 KiB fills 3 data blocks of 4 KiB. All 3 are listed directly in the inode.");
  await figure.getByRole("button", { name: "100 KiB", exact: true }).click();
  await expect(figure).toContainText("the single indirect block lists 13 more. That is 1 extra block of pointers.");
  await expect(figure).toContainText("takes 2 disk reads.");
  await figure.getByRole("button", { name: "1 GiB", exact: true }).click();
  await expect(figure).toContainText("A file of 1 GiB fills 2,62,144 data blocks of 4 KiB.");
  await expect(figure).toContainText("the double indirect block points to 255 blocks of pointers listing the last 2,61,108. That is 257 extra blocks of pointers.");
  await expect(figure).toContainText("takes 3 disk reads.");
});

test("a blocking read stops every user-level thread but only one kernel thread", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="thread-models"]').first().getByRole("figure");
  await expect(figure).toContainText("1:1 kernel threads: 4 threads running on 4 cores.");
  await figure.getByRole("button", { name: "T1 blocks in read", exact: true }).click();
  await expect(figure).toContainText("runs four of the other five on the four cores; T6 waits its turn.");
  await figure.getByRole("button", { name: "N:1 user-level threads", exact: true }).click();
  await expect(figure).toContainText("0 threads running on 4 cores.");
  await figure.getByRole("button", { name: "M:N runtime", exact: true }).click();
  await expect(figure).toContainText("The runtime notices, starts another kernel thread and moves the waiting work onto it, so four threads still run.");
});

test("every ending passes through the zombie state, and the shell sees how it ended", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="process-life"]').first().getByRole("figure");
  await expect(figure).toContainText("Step 1 of 8, new: The shell forks: the child, pid 4242, exists but has not run yet.");
  for (let i = 0; i < 7; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("In the end: exit status 0, so $? is 0.");
  await figure.getByRole("button", { name: "gets SIGKILL", exact: true }).click();
  for (let i = 0; i < 7; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("In the end: killed by signal 9, so $? is 128 + 9 = 137.");
  await figure.getByRole("button", { name: "outlives its parent", exact: true }).click();
  for (let i = 0; i < 8; i++) await figure.getByRole("button", { name: "Increase step" }).click();
  await expect(figure).toContainText("init, which waits for any child in a loop, reaps it. In the end: exit status 0, collected by init.");
});
