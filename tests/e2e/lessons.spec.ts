import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// One learner works through the three fixture lessons and the mini-capstone in order, so these run in sequence.
test.describe.configure({ mode: "serial" });

const FIRST_RUN = 90_000;
const question = (page: Page, n: number) => page.getByRole("region", { name: `Question ${n}`, exact: true });

/** A timed (System One) question is hidden until its clock is started. An untimed one has nothing to start. */
async function begin(page: Page, n: number) {
  const q = question(page, n);
  await expect(q).toBeVisible();
  if ((await q.getAttribute("data-timed")) !== "true" || (await q.getAttribute("data-solved")) === "true") return;
  const start = q.getByRole("button", { name: /^Start/ });
  if (await start.isVisible()) await start.click();
}

/** Opens a code question in the editor. Starting a timed one opens it already. */
async function openInEditor(page: Page, n: number, name: string) {
  await begin(page, n);
  const button = question(page, n).getByRole("button", { name });
  if (await button.isVisible()) await button.click();
}

async function answerNumber(page: Page, n: number, value: string) {
  const q = question(page, n);
  await begin(page, n);
  await q.getByRole("textbox").fill(value);
  await q.getByRole("button", { name: "Check" }).click();
}

async function replaceCode(page: Page, code: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(code);
}

test("laptop: a lesson is graded, remembers progress, and leads to one that builds on it", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: "Counting" })).toBeVisible();
  await expect(page.getByText("0 of 3 questions solved")).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  // A concept named in the text shows its title, never its id.
  await expect(page.getByRole("region", { name: "Intuition" })).toContainText("Next comes Adding");
  // The lesson names what Learn gives next. The same name is checked again after Continue.
  const next = (await page.locator(".lesson-next").innerText()).replace(/^next\s*/i, "").trim();
  expect(next).toBe("Adding");

  // Figures are live drawings with real controls and a text reading of their state.
  const line = page.getByRole("figure").filter({ hasText: "Number line" });
  await line.getByRole("button", { name: "Step right" }).click();
  await line.getByRole("button", { name: "Step right" }).click();
  await expect(line).toContainText("Started at 1, moved 2 steps right, now at 2.");
  const grid = page.getByRole("figure").filter({ hasText: "Multiplication as area" });
  await expect(grid).toContainText("3 × 12 = 3 × 10 + 3 × 2 = 30 + 6 = 36");
  await grid.getByRole("button", { name: "Increase rows" }).click();
  await expect(grid).toContainText("4 × 12 = 4 × 10 + 4 × 2 = 40 + 8 = 48");
  // The coordinate plane: a point, a line, two lines meeting, and a parabola.
  const point = page.getByRole("figure", { name: "Coordinates", exact: true });
  await expect(point).toContainText("The point (3, 2): 3 right, 2 up. It is in quadrant I. Distance from the origin: √13 ≈ 3.61.");
  for (let i = 0; i < 4; i++) await point.getByRole("button", { name: "Decrease x" }).click();
  await point.getByRole("button", { name: "Decrease y" }).click();
  await point.getByRole("button", { name: "Decrease y" }).click();
  await expect(point).toContainText("The point (−1, 0): 1 left, neither up nor down. It lies on the x-axis. Distance from the origin: 1.");
  const straight = page.getByRole("figure").filter({ hasText: "Straight line" });
  await expect(straight).toContainText("y = 2x + 1. It crosses the y-axis at 1. For each 1 step to the right it goes up 2.");
  await straight.getByRole("slider", { name: "slope" }).fill("-0.5");
  await straight.getByRole("slider", { name: "intercept" }).fill("0");
  await expect(straight).toContainText("y = −0.5x. It crosses the y-axis at 0. For each 1 step to the right it goes down 0.5.");
  const pair = page.getByRole("figure").filter({ hasText: "Two lines" });
  await expect(pair).toContainText("y = x + 1 and y = −x + 5. They cross at (2, 3), the only pair that satisfies both equations.");
  await pair.getByRole("slider", { name: "slope" }).fill("-1");
  await expect(pair).toContainText("They are parallel and never meet");
  await pair.getByRole("slider", { name: "intercept" }).fill("5");
  await expect(pair).toContainText("They are the same line");
  const curve = page.getByRole("figure").filter({ hasText: "Parabola" });
  await expect(curve).toContainText("y = x² − 2x − 3. It opens upwards, with its turning point at (1, −4). It crosses the x-axis at −1 and 3. b² − 4ac = 16.");
  await curve.getByRole("slider", { name: "c" }).fill("1");
  await expect(curve).toContainText("It touches the x-axis at 1.");
  await curve.getByRole("slider", { name: "c" }).fill("4");
  await expect(curve).toContainText("It never meets the x-axis. b² − 4ac = −12.");
  // Sets, maps, inverses, growth, the unit circle, and sums.
  const venn = page.getByRole("figure").filter({ hasText: "Two sets" });
  await expect(venn).toContainText("In both (A ∩ B): 6, 12.");
  await expect(venn).toContainText("In A but not B (A ∖ B): 2, 4, 8, 10. In neither: 1, 5, 7, 11.");
  await venn.getByRole("button", { name: "Increase B: multiples of" }).click();
  await expect(venn).toContainText("In both (A ∩ B): 4, 8, 12.");
  const arrows = page.getByRole("figure").filter({ hasText: "Arrow diagram" });
  await expect(arrows).toContainText("f(x) = 2x mod m with m = 6");
  await expect(arrows).toContainText("Injective: no, inputs 0 and 3 share the output 0. Surjective: no, nothing reaches 1, 3, 5. This map is neither.");
  await arrows.getByRole("button", { name: "Decrease rule" }).click();
  await expect(arrows).toContainText("Injective: yes, no output is hit twice. Surjective: yes, every output is hit. This map is a bijection.");
  await arrows.getByRole("button", { name: "Decrease outputs (m)" }).click();
  await expect(arrows).toContainText("Injective: no, inputs 0 and 5 share the output 1. Surjective: yes");
  const inverse = page.getByRole("figure").filter({ hasText: "A function and its inverse" });
  await expect(inverse).toContainText("f(x) = 2x − 2. Its inverse is g(x) = 0.5x + 1. f sends 3 to 4, and g sends 4 back to 3");
  await inverse.getByRole("slider", { name: "slope" }).fill("0");
  await expect(inverse).toContainText("there is no inverse");
  const growth = page.getByRole("figure").filter({ hasText: "Compound growth" });
  await expect(growth).toContainText("1 step, each multiplying by (1 + 1/1). After one year: ₹2.00000.");
  await growth.getByRole("button", { name: "Increase how often" }).click();
  await expect(growth).toContainText("every half-year: 2 steps");
  await expect(growth).toContainText("After one year: ₹2.25000.");
  for (let i = 0; i < 4; i++) await growth.getByRole("button", { name: "Increase how often" }).click();
  await expect(growth).toContainText("every day: 365 steps, each multiplying by (1 + 1/365). After one year: ₹2.71457.");
  const circle = page.getByRole("figure").filter({ hasText: "Unit circle" });
  await expect(circle).toContainText("Angle 30° = π/6 radians. The point on the circle is (cos, sin) = (√3/2 ≈ 0.866, 1/2 ≈ 0.5). Check: cos² + sin² = 1.");
  await circle.getByRole("slider", { name: "angle" }).fill("14");
  await expect(circle).toContainText("Angle 210° = 7π/6 radians. The point on the circle is (cos, sin) = (−√3/2 ≈ −0.866, −1/2 ≈ −0.5).");
  await circle.getByRole("slider", { name: "angle" }).fill("6");
  await expect(circle).toContainText("Angle 90° = π/2 radians. The point on the circle is (cos, sin) = (0, 1).");
  const stairs = page.getByRole("figure").filter({ hasText: "Sum of the first n whole numbers" });
  await expect(stairs).toContainText("4 × 5 ÷ 2 = 10");
  for (let i = 0; i < 6; i++) await stairs.getByRole("button", { name: "Increase n" }).click();
  await expect(stairs).toContainText("1 + 2 + … + 10 is the blue staircase: 55 squares.");
  const series = page.getByRole("figure").filter({ hasText: "Partial sums of a geometric series" });
  await expect(series).toContainText("r = 0.5. The sum of the first 6 terms is 1.97. The totals close in on 1 ÷ (1 − r) = 2: the series converges.");
  await series.getByRole("slider", { name: "ratio r" }).fill("1");
  await expect(series).toContainText("The sum of the first 6 terms is 6. The ratio is not smaller than 1 in size, so the totals never settle: the series diverges.");
  const stack = page.getByRole("figure").filter({ hasText: "The call stack" });
  await expect(stack).toContainText("Step 0: factorial(3) has been called. 3 is not 0, so it needs factorial(2) and must wait. 1 call is on the stack.");
  for (let i = 0; i < 3; i++) await stack.getByRole("button", { name: "Increase step" }).click();
  await expect(stack).toContainText("Step 3: factorial(0) has been called. It is the base case and returns 1 without calling anything. 4 calls are on the stack, the deepest it gets.");
  for (let i = 0; i < 3; i++) await stack.getByRole("button", { name: "Increase step" }).click();
  await expect(stack).toContainText("Step 6: factorial(2) returned 2. factorial(3) resumes with its own n = 3 and computes 3 × 2 = 6. 1 call is on the stack.");
  await stack.getByRole("button", { name: "Increase step" }).click();
  await expect(stack).toContainText("Step 7: factorial(3) returned 6. The stack is empty. 4 calls were made in all.");
  await expect(stack.getByRole("button", { name: "Increase step" })).toBeDisabled();
  await stack.getByRole("button", { name: "Increase n" }).click();
  await expect(stack).toContainText("Step 0: factorial(4) has been called.");
  const rates = page.getByRole("figure").filter({ hasText: "How running times grow" });
  await expect(rates).toContainText("For an input of size n = 8: log₂ n = 3 steps, n = 8, n log₂ n = 24, n² = 64, 2ⁿ = 256.");
  await rates.getByRole("slider", { name: "size n" }).fill("16");
  await expect(rates).toContainText("For an input of size n = 16: log₂ n = 4 steps, n = 16, n log₂ n = 64, n² = 256, 2ⁿ = 65,536.");
  const truth = page.getByRole("figure").filter({ hasText: "Truth table" });
  await expect(truth).toContainText("P is true and Q is true. not P is false. P and Q is true. P or Q is true. P implies Q is true. P if and only if Q is true.");
  await truth.getByRole("button", { name: "Switch Q" }).click();
  await expect(truth).toContainText("P implies Q is false. P if and only if Q is false. This is the only row in which “P implies Q” is false");
  await truth.getByRole("button", { name: "Switch P" }).click();
  await expect(truth).toContainText("P is false and Q is false. not P is true. P and Q is false. P or Q is false. P implies Q is true. P if and only if Q is true.");
  const dominoes = page.getByRole("figure").filter({ hasText: "Induction as falling dominoes" });
  await expect(dominoes).toContainText("All 8 dominoes fall");
  for (let i = 0; i < 3; i++) await dominoes.getByRole("button", { name: "Increase broken step" }).click();
  await expect(dominoes).toContainText("the step from P(3) to P(4) fails. Dominoes 1 to 3 fall and the rest stand");
  await dominoes.getByRole("button", { name: "Switch base case" }).click();
  await expect(dominoes).toContainText("The base case P(1) has not been shown. So no domino falls");
  const diagonal = page.getByRole("figure").filter({ hasText: "The diagonal argument" });
  await expect(diagonal).toContainText("Row 1 has 0 in place 1, so the new sequence gets 1 there. So far the new sequence starts 1. It differs from row 1 in at least one place.");
  for (let i = 0; i < 5; i++) await diagonal.getByRole("button", { name: "Increase row" }).click();
  await expect(diagonal).toContainText("So far the new sequence starts 101011. It differs from each of rows 1 to 6 in at least one place, and continuing in the same way it differs from every row of the list");
  await diagonal.getByRole("button", { name: "Increase list" }).click();
  await expect(diagonal).toContainText("Row 1 has 0 in place 1");
  const band = page.getByRole("figure").filter({ hasText: "A tolerance and the point where the terms stay inside it" });
  await expect(band).toContainText("For the tolerance ε = 0.2, every term from N = 6 onwards is within 0.2 of 1. The first 5 terms are not.");
  await band.getByRole("slider", { name: "tolerance in hundredths" }).fill("10");
  await expect(band).toContainText("For the tolerance ε = 0.1, every term from N = 11 onwards is within 0.1 of 1. The first 10 terms are not.");
  const classes = page.getByRole("figure").filter({ hasText: "Classes of whole numbers with the same remainder" });
  await expect(classes).toContainText("The numbers fall into 3 classes, one for each remainder, and every number is in exactly one class. 14 leaves the remainder 2, and its class is shown: 2, 5, 8, 11, 14, 17, and so on.");
  await classes.getByRole("button", { name: "Increase modulus" }).click();
  await expect(classes).toContainText("The numbers fall into 4 classes, one for each remainder, and every number is in exactly one class. 14 leaves the remainder 2, and its class is shown: 2, 6, 10, 14, and so on.");
  const keys = page.getByRole("figure").filter({ hasText: "Which key opens which lock" });
  await expect(keys).toContainText("Pattern 1, one key for each lock. “For every lock there is a key that opens it” is true: every row has a mark. “There is a key that opens every lock” is false: no column is full.");
  await keys.getByRole("button", { name: "Increase pattern" }).click();
  await expect(keys).toContainText("“There is a key that opens every lock” is true: the column of key 2 is full.");
  await keys.getByRole("button", { name: "Increase pattern" }).click();
  await expect(keys).toContainText("“For every lock there is a key that opens it” is false: the row of lock 3 has no mark.");
  // Calculus: limits, chords and tangents, chained rates, bending, Taylor polynomials, descent, and areas.
  const approach = page.getByRole("figure").filter({ hasText: "Approaching a point from both sides" });
  await expect(approach).toContainText("At x = 0.9 it is 1.9 and at x = 1.1 it is 2.1. At x = 1 itself the formula says 0 ÷ 0 and has no value.");
  await approach.getByRole("button", { name: "Increase closeness" }).click();
  await expect(approach).toContainText("At x = 0.99 it is 1.99 and at x = 1.01 it is 2.01.");
  const chord = page.getByRole("figure").filter({ hasText: "From a chord to a tangent" });
  await expect(chord).toContainText("From x = 1 to x = 1.5 the curve rises 1.25 over a run of 0.5, so the chord has slope 2.5. The tangent at x = 1 has slope 2.");
  for (let i = 0; i < 2; i++) await chord.getByRole("button", { name: "Increase closeness" }).click();
  await expect(chord).toContainText("the curve rises 0.0201 over a run of 0.01, so the chord has slope 2.01.");
  const chain = page.getByRole("figure").filter({ hasText: "Rates multiply along a chain" });
  await expect(chain).toContainText("So y changes 2 × 3 = 6 times as fast as x.");
  await chain.getByRole("slider", { name: "x in tenths" }).fill("20");
  await expect(chain).toContainText("At x = 2: u = 4 and y = 64.");
  await expect(chain).toContainText("So y changes 4 × 48 = 192 times as fast as x.");
  const bend = page.getByRole("figure").filter({ hasText: "Slope and bending" });
  await expect(bend).toContainText("height −2, slope f′ = 0, second derivative f″ = 6.");
  await expect(bend).toContainText("With slope 0 and upward bending, this is a local minimum.");
  await bend.getByRole("slider", { name: "point a" }).fill("0");
  await expect(bend).toContainText("height 0, slope f′ = −3, second derivative f″ = 0. The bending changes direction here.");
  const taylor = page.getByRole("figure").filter({ hasText: "Taylor polynomials" });
  await expect(taylor).toContainText("The polynomial of degree 3 for sin x about 0. At x = 2 it gives 0.6667, and the function itself is 0.9093: the error is 0.2426.");
  await taylor.getByRole("button", { name: "Increase degree" }).click();
  await taylor.getByRole("button", { name: "Increase degree" }).click();
  await expect(taylor).toContainText("At x = 2 it gives 0.9333, and the function itself is 0.9093: the error is 0.024.");
  const descent = page.getByRole("figure").filter({ hasText: "Stepping downhill" });
  await expect(descent).toContainText("which is 0.8 times x. After 5 steps, x = 0.983 and f(x) = 0.9664. The distance from the minimum is multiplied by 0.8 at each step");
  await descent.getByRole("slider", { name: "step size in hundredths" }).fill("100");
  await expect(descent).toContainText("The factor is −1, so x jumps between 3 and −3 for ever and never improves.");
  await descent.getByRole("slider", { name: "step size in hundredths" }).fill("110");
  await expect(descent).toContainText("The method diverges.");
  const rectangles = page.getByRole("figure").filter({ hasText: "Area as a sum of rectangles" });
  await expect(rectangles).toContainText("4 rectangles under y = x² from 0 to 3, with heights taken at the left ends, total 5.906");
  await rectangles.getByRole("button", { name: "Change rule" }).click();
  await expect(rectangles).toContainText("with heights taken at the midpoints, total 8.8594. The exact area is 9. The error is 0.1406.");
  const total = page.getByRole("figure").filter({ hasText: "A total and its rate" });
  await expect(total).toContainText("The area gathered from 0 to x = 2 is A(x) = 4. At this moment A is changing at the rate f(2) = 1. The rate is positive");
  await total.getByRole("slider", { name: "x in quarters" }).fill("12");
  await expect(total).toContainText("A(x) = 4.5. At this moment A is changing at the rate f(3) = 0. The rate is zero");
  // Vectors: arrows and lists, sums, spans, dot products, norms, projections and lines from a normal vector.
  const arrow = page.getByRole("figure").filter({ hasText: "An arrow and a list" });
  await expect(arrow).toContainText("The vector (3, 2), drawn from (0, 0) to (3, 2): 3 right and 2 up. Its length is 3.6056.");
  await arrow.getByRole("button", { name: "Move the arrow" }).click();
  await expect(arrow).toContainText("drawn from (1, 1) to (4, 3): 3 right and 2 up. Its length is 3.6056. It has been moved, and it is still the same vector");
  const tipToTail = page.getByRole("figure").filter({ hasText: "Adding tip to tail" });
  await expect(tipToTail).toContainText("a = (2, 1) and b = (1, 1). Walk along a, then along b: you arrive at a + b = (2 + 1, 1 + 1) = (3, 2).");
  await tipToTail.getByRole("slider", { name: "scale of b in halves" }).fill("-2");
  await expect(tipToTail).toContainText("so −b = (−1, −1). Walk along a, then along −b: you arrive at a + (−b) = (2 − 1, 1 − 1) = (1, 0).");
  await tipToTail.getByRole("button", { name: "Swap the order" }).click();
  await expect(tipToTail).toContainText("Walk along −b, then along a: you arrive at a + (−b)");
  const span = page.getByRole("figure").filter({ hasText: "What two vectors can reach" });
  await expect(span).toContainText("The combination 1a + 1b is (2, 1.5). Because a and b point in different directions");
  await span.getByRole("button", { name: "Put b along a" }).click();
  await expect(span).toContainText("b = (−0.75, −0.25). The combination 1a + 1b is (0.75, 0.25). Here b is −0.5 times a");
  const shadow = page.getByRole("figure").filter({ hasText: "The dot product and the shadow" });
  await expect(shadow).toContainText("with 45° between them. a · b = 3 × 1.4142 + 0 × 1.4142 = 4.2426.");
  await shadow.getByRole("slider", { name: "angle of b in degrees" }).fill("90");
  await expect(shadow).toContainText("a · b = 3 × 0 + 0 × 2 = 0.");
  await expect(shadow).toContainText("The dot product is zero: b is at a right angle to a");
  await shadow.getByRole("slider", { name: "angle of b in degrees" }).fill("135");
  await expect(shadow).toContainText("The dot product is negative: b points partly against a.");
  const norms = page.getByRole("figure").filter({ hasText: "Three ways to measure length" });
  await expect(norms).toContainText("Its Euclidean norm ‖x‖₂ is √(1.5² + 1²) = 1.8028.");
  await expect(norms).toContainText("Euclidean 1.8028, taxicab 2.5, maximum 1.5.");
  await norms.getByRole("button", { name: "Change norm" }).click();
  await expect(norms).toContainText("Its taxicab norm ‖x‖₁ is 1.5 + 1 = 2.5. With this norm the points at distance 1 from the origin form a diamond.");
  const projection = page.getByRole("figure").filter({ hasText: "Projection onto a line" });
  await expect(projection).toContainText("a · b = 5 and a · a = 10, so the projection of b onto a is 0.5 times a, which is p = (1.5, 0.5). What is left over, b − p = (−0.5, 1.5)");
  await expect(projection).toContainText("the distance is 1.5811.");
  const boundary = page.getByRole("figure").filter({ hasText: "A line from a vector and a number" });
  await expect(boundary).toContainText("The line 1x + 2y − 2 = 0. The vector w = (1, 2) is at right angles to it. At the point (2, 1) the expression is 1 × 2 + 2 × 1 − 2 = 2, which is positive");
  await expect(boundary).toContainText("at a distance of 2 ÷ 2.2361 = 0.8944 from the line.");
  await boundary.getByRole("slider", { name: "offset in halves" }).fill("-8");
  await expect(boundary).toContainText("1 × 2 + 2 × 1 − 4 = 0, which is zero, so the point is on the line.");
  const fig = (title: string) => page.getByRole("figure").filter({ hasText: title });
  const press = async (figure: ReturnType<typeof fig>, name: string, times = 1) => {
    for (let i = 0; i < times; i++) await figure.getByRole("button", { name }).click();
  };
  const shelf = fig("Inserting into an array and into a linked list");
  await expect(shelf).toContainText("Array: the 4 items from index 2 onwards each move one place to the right, 4 moves. Linked list: 2 links are followed from the head to reach the place, then 2 links are changed and no item moves.");
  await press(shelf, "Increase index", 4);
  await expect(shelf).toContainText("the new item goes after the last one, so nothing has to move. Linked list: 6 links are followed");
  const lifo = fig("Last in or first in");
  await expect(lifo).toContainText("A stack holding A, B, C, in the order they were added. The next to leave is C, the last one in.");
  await press(lifo, "Remove an item");
  await expect(lifo).toContainText("A stack holding A, B, in the order they were added. The next to leave is B, the last one in. Removed so far, in order: C.");
  await press(lifo, "Switch to queue");
  await expect(lifo).toContainText("A queue holding A, B, in the order they were added. The next to leave is A, the first one in.");
  const buckets = fig("Keys in buckets");
  await expect(buckets).toContainText("The load factor is 8 ÷ 5 = 1.6. The fullest bucket is number 1, holding 41, 26, so a lookup compares at most 2 keys. 0 buckets are empty.");
  await buckets.getByRole("slider", { name: "number of buckets" }).fill("4");
  await expect(buckets).toContainText("The load factor is 8 ÷ 4 = 2. The fullest bucket is number 1, holding 25, 33, 41, so a lookup compares at most 3 keys.");
  const heap = fig("A heap as a tree and as a list");
  await expect(heap).toContainText("The heap as a list: [2, 5, 3, 9, 6, 8]. The smallest item, 2, is at index 0.");
  await press(heap, "Insert an item");
  await expect(heap).toContainText("The heap as a list: [1, 5, 2, 9, 6, 8, 3].");
  await expect(heap).toContainText("Inserted 1 at the end and swapped it with its parent 2 times, which took it to the top.");
  await press(heap, "Remove the smallest");
  await expect(heap).toContainText("The heap as a list: [2, 5, 3, 9, 6, 8].");
  await expect(heap).toContainText("Removed the smallest, 1. The last item, 3, took its place at the top and was swapped with its smaller child 1 time.");
  const walk = fig("Two ways to explore a graph");
  await expect(walk).toContainText("Breadth-first search from A, after 0 steps. Visited in order: nothing yet. Waiting in the queue: A.");
  await press(walk, "Increase step", 3);
  await expect(walk).toContainText("after 3 steps. Visited in order: A, B, C. Waiting in the queue: D, E, F.");
  await press(walk, "Switch to depth-first");
  await press(walk, "Increase step", 4);
  await expect(walk).toContainText("Depth-first search from A, after 4 steps. Visited in order: A, B, D, E. The path back to the start, held on the stack: A, B, E.");
  const sorting = fig("Sorting step by step");
  await expect(sorting).toContainText("Insertion sort, after 0 passes. The first 1 item is in order: 5. Next, 2 is moved left past every larger item. Comparisons so far: 0.");
  await press(sorting, "Increase step", 3);
  await expect(sorting).toContainText("Insertion sort, after 3 passes. The first 4 items are in order: 1, 2, 5, 8. Next, 9 is moved left past every larger item. Comparisons so far: 5.");
  await press(sorting, "Switch to merge sort");
  await press(sorting, "Increase step", 2);
  await expect(sorting).toContainText("Merge sort, after 2 rounds of merging. The list is made of sorted runs of length 4: [1, 2, 5, 8] [3, 4, 7, 9]. Next, neighbouring runs are merged in pairs. Comparisons so far: 10.");
  const halving = fig("Halving the search");
  await expect(halving).toContainText("Looking for 23 among 15 sorted items. Nothing has been compared yet");
  await press(halving, "Increase step");
  await expect(halving).toContainText("Step 1: the middle of positions 0 to 14 is position 7, holding 42. 23 is smaller, so positions 7 to 14 are ruled out. 7 positions remain.");
  await press(halving, "Increase step", 2);
  await expect(halving).toContainText("Step 3: the middle of positions 4 to 6 is position 5, holding 23. That is the target, found after 3 comparisons.");
  await press(halving, "Look for 50, which is missing");
  await press(halving, "Increase step", 4);
  await expect(halving).toContainText("Step 4: the middle of positions 8 to 8 is position 8, holding 56. 50 is smaller, so positions 8 to 8 are ruled out. No positions remain, so 50 is not in the list.");
  await expect(fig("Filling a table of routes")).toContainText("Filled 8 of 20 cells. The cell in row 2, column 3 can be entered from above, 1 route, or from the left, 2 routes, so it has 1 + 2 = 3.");
  await expect(fig("The cost of each append")).toContainText("After 9 appends the list has room for 16. It ran out of room 4 times, and copied 1 + 2 + 4 + 8 = 15 items in all while moving to blocks twice the size. Total work: 9 writes + 15 copies = 24, which is 2.67 per append.");
  await expect(fig("An order that respects every arrow")).toContainText("After 3 steps. Done, in order: data, clean, model. Ready now, with every prerequisite done: split. Still blocked: train (needs split), test (needs train and split).");
  const roads = fig("Shortest distances from A");
  await expect(roads).toContainText("Settled, with their final distances from A: A 0, C 1. Best found so far for the rest: B 3, D 9, E 11, F not reached. The nearest unsettled town is B, so it is settled next.");
  await press(roads, "Increase step", 4);
  await expect(roads).toContainText("Settled, with their final distances from A: A 0, C 1, B 3, D 8, E 10, F 13. Every town is settled.");
  const beam = fig("Keeping only the best few");
  await expect(beam).toContainText('the best one is kept: "the cat" (0.2). The most probable sentence of all is "a cat" at 0.36, which this beam missed, because it dropped "a" after the first word.');
  await press(beam, "Increase beam width");
  await expect(beam).toContainText('6 candidates, and the best 2 are kept: "a cat" (0.36), "the cat" (0.2). The most probable sentence of all is "a cat" at 0.36, which this beam found.');
  const moved = fig("A matrix moves the plane");
  await expect(moved).toContainText("The shear, with rows (1, 1) and (0, 1). The unit vector (1, 0) lands on (1, 0), the first column. The unit vector (0, 1) lands on (1, 1), the second column. The point (2, 1) is 2 of the first and 1 of the second, so it lands on 2 × (1, 0) + 1 × (1, 1) = (3, 1).");
  await press(moved, "Next matrix");
  await expect(moved).toContainText("The quarter turn, with rows (0, −1) and (1, 0).");
  await expect(moved).toContainText("so it lands on 2 × (0, 1) + 1 × (−1, 0) = (−1, 2).");
  const product = fig("A matrix times a vector");
  await expect(product).toContainText("By columns: 1 × (2, 1) + 1 × (−1, 1) = (1, 2). By rows: (2, −1) · x = 1 and (1, 1) · x = 2. Both give Ax = (1, 2).");
  await press(product, "Increase first entry of x in halves");
  await expect(product).toContainText("Both give Ax = (2, 2.5).");
  const twoMaps = fig("One matrix after another");
  await expect(twoMaps).toContainText("First the shear, with rows (1, 1) and (0, 1), then the quarter turn, with rows (0, −1) and (1, 0). Nothing has been applied yet. The corner that began at (2, 0.5) is now at (2, 0.5).");
  await press(twoMaps, "Increase matrices applied", 2);
  await expect(twoMaps).toContainText("Together they are the one matrix with rows (0, −1) and (1, 1), the product of the second and the first. The corner that began at (2, 0.5) is now at (−0.5, 2.5). In the other order the product would have rows (1, −1) and (1, 0), a different matrix.");
  const flip = fig("Rows become columns");
  await expect(flip).toContainText("The matrix, with 2 rows and 3 columns. The entry 2 is in row 1, column 2 of the matrix and in row 2, column 1 of the transpose. Row 1 of the matrix, 1, 2, 3, is column 1 of the transpose.");
  await press(flip, "Show the transpose");
  await expect(flip).toContainText("The transpose, with 3 rows and 2 columns.");
  const rowsFig = fig("Clearing one unknown at a time");
  await expect(rowsFig).toContainText("Step 0 of 6.");
  await press(rowsFig, "Increase step", 3);
  await expect(rowsFig).toContainText("The rows are now (1, 1, 1 | 6), (0, 1, −1 | −1), (0, 0, −1 | −3).");
  await press(rowsFig, "Increase step", 3);
  await expect(rowsFig).toContainText("The solution is x = 1, y = 2, z = 3. The rows are now (1, 0, 0 | 1), (0, 1, 0 | 2), (0, 0, 1 | 3).");
  const lost = fig("What a matrix reaches and what it loses");
  await expect(lost).toContainText("The input x = (0.4, 0.8) goes to Ax = (2, 1), which is on the line through (2, 1): that line is the column space.");
  await press(lost, "Increase along (2, −1) in halves");
  await expect(lost).toContainText("The input x = (0.9, 0.55) goes to Ax = (2, 1)");
  await press(lost, "Turn the columns apart");
  await expect(lost).toContainText("so its rank is 2.");
  const basis = fig("Two descriptions of one point");
  await expect(basis).toContainText("its coordinates in this basis are (1, 2). In the usual coordinates the same point is 1 × (2, 1) + 2 × (−1, 1) = (0, 3).");
  const area = fig("The determinant as an area");
  await expect(area).toContainText("The determinant is 2 × 1.5 − 0 × 0 = 3. The unit square, of area 1, is sent to a parallelogram of area 3.");
  await press(area, "Decrease angle in steps of 30°", 3);
  await expect(area).toContainText("The determinant is 2 × 0 − 0 × 1.5 = 0. The columns lie along one line");
  const table = fig("A graph as a table of numbers");
  await expect(table).toContainText("From A: 0 to A, 1 to B, 1 to C, 0 to D.");
  await press(table, "Increase steps");
  await expect(table).toContainText("From A: 0 to A, 0 to B, 1 to C, 2 to D.");
  const block = fig("One block of numbers, many shapes");
  await expect(block).toContainText("read with shape (3, 4): 2 axes, of lengths 3 and 4. The number at place 6 in the block is at index [1, 2], because 1 × 4 + 2 = 6.");
  await press(block, "Next shape");
  await expect(block).toContainText("read with shape (4, 3): 2 axes, of lengths 4 and 3. The number at place 6 in the block is at index [2, 0], because 2 × 3 + 0 = 6.");
  const slice = fig("Slicing a table");
  await expect(slice).toContainText("a[1:3, ::2] on a table of 4 rows and 6 columns. Rows from 1 up to but not including 3: 1, 2. Every 2nd column: 0, 2, 4. The result has shape (2, 3), with first row 10, 12, 14.");
  await press(slice, "Decrease row stop", 2);
  await expect(slice).toContainText("so no rows are taken. Every 2nd column: 0, 2, 4. The result has shape (0, 3).");
  const stretch = fig("Stretching the smaller array");
  await expect(stretch).toContainText("Adding arrays of shapes (3, 4) and (4,).");
  await expect(stretch).toContainText("The result has shape (3, 4), with first row 11, 22, 33, 44 and last row 19, 30, 41, 52.");
  await press(stretch, "Next pair of shapes", 4);
  await expect(stretch).toContainText("Adding arrays of shapes (3, 4) and (3,). Lined up from the right: 4 with 3. The lengths differ and neither is 1, so the shapes do not fit and NumPy raises an error.");
  const speed = fig("A loop in Python and a loop in the array");
  await expect(speed).toContainText("60 milliseconds in all.");
  await expect(speed).toContainText("then about 1 nanosecond for each item: 1 millisecond. The array is about 60 times faster.");
  await press(speed, "Decrease power of ten", 6);
  await expect(speed).toContainText("The loop is about 33 times faster, because for so few numbers the fixed cost is nearly all of it.");
  const totals = fig("Adding along an axis");
  await expect(totals).toContainText("a.sum(axis=0) on a table of shape (3, 4) adds along axis 0, down the rows, so axis 0 is the one that goes. The result is 15, 18, 21, 24, one total for each column. Its shape is (4,).");
  await press(totals, "Next axis");
  await press(totals, "Switch keepdims");
  await expect(totals).toContainText("a.sum(axis=1, keepdims=True) on a table of shape (3, 4) adds along axis 1, across the columns, so axis 1 is the one that goes. The result is 10, 26, 42, one total for each row. Its shape is (3, 1)");
  const view = fig("A view is a start and a stride");
  await expect(view).toContainText("a.T has shape (4, 3), starts at place 0 of the block, and has strides (1, 4) counted in items");
  await expect(view).toContainText("Its item at [2, 1] is at place 0 + 2 × 1 + 1 × 4 = 6, which holds 6. With numbers of 8 bytes each, NumPy reports the strides as (8, 32) bytes.");
  await press(view, "Next view", 2);
  await expect(view).toContainText("a[::-1] has shape (3, 4), starts at place 8 of the block, and has strides (−4, 1) counted in items: one step along axis 0 moves back 4 places, one step along axis 1 moves 1 place.");
  await expect(view).toContainText("Its item at [1, 3] is at place 8 + 1 × (−4) + 3 × 1 = 7, which holds 7.");
  const letters = fig("Naming the axes");
  await expect(letters).toContainText('np.einsum("ij,jk->ik", A, B), with i of length 2, j of length 3 and k of length 2. The letter j appears in the inputs and not in the output, so it is summed over. The letters i and k are kept, so the result has shape (2, 2).');
  await expect(letters).toContainText("The result is [[7 5], [16 11]].");
  await press(letters, "Next expression", 3);
  await expect(letters).toContainText("No letter is kept, so the result is a single number. The sum over j of x[j] × y[j]: the dot product. The result is 5.");
  const seeded = fig("Random numbers from a seed");
  await expect(seeded).toContainText("Seed 1, 100 draws from the uniform distribution between 0 and 1. The first three are 0.45, 0.222, 0.248. The mean of all of them is 0.454,");
  const sums = fig("Subtract the largest first");
  await expect(sums).toContainText("The inputs are 1000, 1001, 1002. Directly: their exponentials are inf, inf, inf, and the logarithm of the sum comes out as inf, because the exponentials are too large for a float and overflow to infinity.");
  await expect(sums).toContainText("the answer is 1002 + 0.4076 = 1002.4076.");
  const gaps = fig("The gaps between floats");
  await expect(gaps).toContainText("Near 10,00,00,000, neighbouring float32 values are 8 apart.");
  await expect(gaps).toContainText("Adding 1 to 10,00,00,000 changes nothing");
  await press(gaps, "Switch float32");
  await expect(gaps).toContainText("neighbouring float64 values are 1.5 × 10^−8 apart.");
  await expect(page.locator(".prose-lesson img")).toHaveCount(0);

  // Wrong, then right. There is no hint ladder: hints come from the tutor. Fractions and words are handled by the grader.
  await answerNumber(page, 1, "8");
  await expect(question(page, 1)).toContainText("Not yet");
  await expect(page.getByRole("button", { name: /hint/i })).toHaveCount(0);
  await expect(question(page, 1)).not.toContainText("12 - 3");
  await answerNumber(page, 1, "18/2");
  await expect(question(page, 1)).toContainText("Solved");
  await expect(question(page, 1).locator(".q-explanation")).toBeVisible();

  await begin(page, 2);
  await question(page, 2).getByText("11", { exact: true }).click();
  await question(page, 2).getByRole("button", { name: "Check" }).click();
  await expect(question(page, 2)).toContainText("Solved");

  // Progress is on the account, not only on the page.
  await page.reload();
  await expect(page.getByText("2 of 3 questions solved")).toBeVisible();
  await expect(question(page, 1)).toContainText("Solved");

  // Put the steps in order with the move buttons.
  const wanted = ["Touch a stone", "Repeat until", "The last number"];
  const q3 = question(page, 3);
  await begin(page, 3);
  for (let target = 0; target < wanted.length; target++) {
    for (;;) {
      const texts = await q3.locator(".q-step-text").allInnerTexts();
      const at = texts.findIndex((text) => text.startsWith(wanted[target]));
      if (at === target) break;
      await q3.getByRole("button", { name: `Move step ${at + 1} up` }).click();
    }
  }
  await q3.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Lesson complete.")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude(".cm-scroller").analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
  await page.screenshot({ path: "test-results/screens/lesson-laptop.png" });

  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: next, exact: true })).toBeVisible();
  await expect(page.getByText("Builds on Counting")).toBeVisible();
  // Adding follows Counting in the same track, so there is no bridge.
  await expect(page.getByRole("complementary", { name: "Bridge from your last lesson" })).toHaveCount(0);
});

test("tablet: the next lesson is in the same track and then crosses to another", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: "Adding" })).toBeVisible();
  // The next lesson is in another track, and the lesson says so before Learn goes there.
  const next = (await page.locator(".lesson-next").innerText()).replace(/^next\s*/i, "").trim();
  expect(next).toBe("Printing");
  await answerNumber(page, 1, "7");
  await answerNumber(page, 2, "12");
  await expect(page.getByText("Lesson complete.")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/lesson-tablet.png" });
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: next, exact: true })).toBeVisible();
  await expect(page.getByText("Builds on Adding")).toBeVisible();
  // Printing is in another track from Adding, the lesson just finished, so its bridge for Adding is shown.
  const bridge = page.getByRole("complementary", { name: "Bridge from your last lesson" });
  await expect(bridge).toContainText("Bridge from F0 · Adding");
  await expect(bridge).toContainText("Python does the same sum when you write it inside print.");
  await page.screenshot({ path: "test-results/screens/bridge-tablet.png" });
  // Printing closes its cluster, so the cluster's mini-capstone is next. No lesson is written after that, only what comes later.
  await expect(page.locator(".lesson-next")).toHaveText(/^Next\s*Mini-capstone: A sum, shown$/i);
  await expect(page.getByText("Later Later")).toBeVisible();
  await expect(page.getByRole("list", { name: "Where you are" })).toContainText("Software engineering");
});

test("phone: code is read, written, checked by hidden tests and fixed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn");
  const lessonTab = page.getByRole("button", { name: "Lesson", exact: true });
  const output = page.getByTestId("output");

  // Reading code: predict exactly what it prints.
  await begin(page, 1);
  await question(page, 1).getByRole("textbox").fill("7\n7");
  await question(page, 1).getByRole("button", { name: "Check" }).click();
  await expect(question(page, 1)).toContainText("Not yet");
  await begin(page, 1);
  await question(page, 1).getByRole("textbox").fill("7\na + 5");
  await question(page, 1).getByRole("button", { name: "Check" }).click();
  await expect(question(page, 1)).toContainText("Solved");
  await begin(page, 2);
  await question(page, 2).getByRole("textbox").fill("2");
  await question(page, 2).getByRole("button", { name: "Check" }).click();
  await expect(question(page, 2)).toContainText("Solved");

  // Writing code: the starter fails with a message that does not give the answer.
  await openInEditor(page, 3, "Open in the editor");
  await expect(page.getByTestId("doc-name")).toHaveText("Question 3");
  await expect(page.locator(".cm-content")).toContainText("total = 0");
  await page.getByRole("button", { name: /^Check/ }).click();
  await expect(output).toContainText("total is not the sum of 19 and 23 yet", { timeout: FIRST_RUN });
  await expect(output).not.toContainText("42");
  await replaceCode(page, "total = 19 + 23\nprint(total)");
  await page.getByRole("button", { name: /^Check/ }).click();
  await expect(output).toContainText("All checks passed.");
  await page.screenshot({ path: "test-results/screens/lesson-phone-code.png" });
  await lessonTab.click();
  await expect(question(page, 3)).toContainText("Solved");

  // A crash in the learner's own code shows their line, not the checker's internals.
  await openInEditor(page, 4, "Open in the editor");
  await replaceCode(page, "print(pebble)");
  await page.getByRole("button", { name: /^Check/ }).click();
  await expect(output).toContainText("NameError");
  await expect(output).toContainText("line 1");
  await replaceCode(page, 'print("pebble")');
  await page.getByRole("button", { name: /^Check/ }).click();
  await expect(output).toContainText("All checks passed.");

  // Finding a bug: the broken code is loaded, and each question keeps its own code.
  await lessonTab.click();
  await openInEditor(page, 5, "Open the broken code");
  await expect(page.locator(".cm-content")).toContainText('print("4 + 5")');
  await replaceCode(page, "print(4 + 5)");
  await page.getByRole("button", { name: /^Check/ }).click();
  await expect(output).toContainText("All checks passed.");
  await lessonTab.click();
  // Three of the five questions took a second try, so the finish is weak: the lesson is held open for its consolidation set.
  await expect(page.getByText("Every question is solved, but not securely yet.")).toBeVisible();
  await expect(page.getByText("Lesson complete.")).toHaveCount(0);
  for (const n of [1, 2, 3]) {
    const extra = page.getByRole("region", { name: `Consolidation question ${n}`, exact: true });
    await expect(extra).toBeVisible({ timeout: 30_000 });
    await extra.getByRole("button", { name: "Start" }).click();
    const sheep = Number((await extra.locator(".q-prompt").innerText()).match(/has (\d+) sheep/)![1]);
    await extra.getByRole("textbox").fill(String(sheep + 10));
    await extra.getByRole("button", { name: "Check" }).click();
    await expect(extra).toContainText("Right");
  }
  await expect(page.getByText("Lesson complete.")).toBeVisible();
  await expect(page.locator(".lesson-end-mastery")).toContainText(/Mastery \d+%/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "test-results/screens/lesson-phone.png" });

  // The lesson that closes a cluster leads to that cluster's mini-capstone, as the lesson said it would.
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "A sum, shown" })).toBeVisible();
});

test("laptop: a mini-capstone closes the cluster before Learn moves on", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: "A sum, shown" })).toBeVisible();
  await expect(page.getByText("S0 · First programs · Mini-capstone · 15 min")).toBeVisible();
  await expect(page.getByText("Brings together Printing")).toBeVisible();
  await expect(page.getByRole("list", { name: "Where you are" })).toContainText("Mini-capstone");
  // Lessons it names show their titles, and its stages are numbered.
  await expect(page.getByRole("region", { name: "The project" })).toContainText("as in Printing");
  await expect(page.getByRole("region", { name: "Stage 3" })).toContainText("Stage 3 of 3");
  await expect(page.getByRole("heading", { level: 3, name: "Write it" })).toBeVisible();
  await expect(page.getByText("0 of 3 questions solved")).toBeVisible();
  await expect(page.getByText("Solve every question to finish this mini-capstone.")).toBeVisible();
  // The closing account names what each stage was, so it stays hidden until every stage is solved.
  await expect(page.getByRole("region", { name: "What you built" })).toHaveCount(0);

  // The map agrees with Learn about what is due, and does not count the mini-capstone as a lesson.
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect(page.getByText("3 of 3 lessons done · 0 of 1 mini-capstones · 1 more planned")).toBeVisible();
  await expect(page.locator(".map-now")).toContainText("Next in LearnMini-capstone: A sum, shownFirst programs");
  const due = page.locator('.map-stage[aria-current="step"]');
  await expect(due.locator("summary")).toHaveText("First programsSoftware engineering · Mini-capstone left");
  await expect(due.locator(".map-body li")).toHaveText([/^Printing(Done|Mastery \d+%)$/, "Mini-capstone: A sum, shownNow"]);
  await page.getByRole("link", { name: "Learn" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "A sum, shown" })).toBeVisible();

  // Its questions are graded and remembered exactly as a lesson's are.
  await answerNumber(page, 1, "12");
  await expect(question(page, 1)).toContainText("Not yet");
  await answerNumber(page, 1, "11");
  await expect(question(page, 1)).toContainText("Solved");
  await page.reload();
  await expect(page.getByText("1 of 3 questions solved")).toBeVisible();
  await begin(page, 2);
  await question(page, 2).getByRole("textbox").fill("11");
  await question(page, 2).getByRole("button", { name: "Check" }).click();
  await expect(question(page, 2)).toContainText("Solved");
  await openInEditor(page, 3, "Open in the editor");
  await expect(page.getByTestId("doc-name")).toHaveText("Question 3");
  await replaceCode(page, "total = 5 + 6\nprint(total)");
  await question(page, 3).getByRole("button", { name: "Check my code" }).click();
  await expect(page.getByTestId("output")).toContainText("All checks passed.", { timeout: FIRST_RUN });
  await expect(question(page, 3)).toContainText("Solved");

  await expect(page.getByText("Mini-capstone complete.")).toBeVisible();
  await expect(page.getByRole("region", { name: "What you built" })).toContainText("You added by hand in Adding and by machine in Printing.");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude(".cm-scroller").analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
  await page.screenshot({ path: "test-results/screens/capstone-laptop.png" });

  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "You have finished every lesson written so far." })).toBeVisible();

  // The map records the path that was actually taken, in the order it was taken.
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect(page.getByText("3 of 3 lessons done · 1 of 1 mini-capstones · 1 more planned")).toBeVisible();
  await expect(page.locator(".map-now")).toContainText("You have finished every lesson written so far.");
  const stages = page.getByRole("region", { name: "Your route" }).locator(".map-stage");
  await expect(stages.locator("summary")).toHaveText(["CountingFoundations · Done", "First programsSoftware engineering · Done"]);
  await expect(stages.locator(".map-body li")).toHaveText([/^CountingMastery \d+%$/, /^AddingMastery \d+%$/, /^PrintingMastery \d+%$/, "Mini-capstone: A sum, shownDone"]);
});
