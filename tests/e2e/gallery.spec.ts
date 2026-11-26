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
