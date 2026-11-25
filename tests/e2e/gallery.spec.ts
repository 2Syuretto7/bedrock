import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
